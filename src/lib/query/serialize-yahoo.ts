/**
 * AST → Yahoo!リアルタイム検索のクエリ文字列（docs/requirements.md F5、docs/research-phase0.md 6章）。
 * 純粋関数で `{ text, warnings, lts?, uts? }` を返す。`lts`／`uts` は URL パラメータ（UNIX 秒）で、URL の生成（#18）が付ける。
 *
 * - 演算子の扱いは `operators.ts` の `yahoo`／`yahooNegated`（rename／keep／drop／param／same）から決める。
 *   接頭辞も警告コードもここに直書きしない。
 * - Yahoo では括弧 `(A B)` が OR になる。X の AND グループは括弧を外して平らにし、OR だけ括弧で囲む。
 *   - 否定した OR は、子を除外した AND にする（`-(a OR b)` → `-a -b`。意味は同じ）。
 *   - OR の中の AND と、否定した AND は Yahoo に書き方が無く実機でも確かめていないので、X の形のまま出して
 *     `yahoo.groupUnverified` を返す（ユーザー決定 2026-11-18）。
 * - 期間は位置にかかわらず `lts`／`uts` に移す。`until:` は指定日を含むので、`uts` は終了日の翌日0時。
 *   相対の記号（`since:yesterday`）の展開は #17 の担当で、入力は展開済みを前提とする。読めない値は黙って捨てず、
 *   そのまま出して `yahoo.rawUnverified` を返す。
 * - 同じ警告は1件にまとめ、最初に出た順に並べる。
 */
import type { Issue } from "@/api";
import type { AccountNode, FilterNode, GroupNode, Node } from "./ast";
import { localMidnightSec } from "./dates";
import {
  ACCOUNT_OPS,
  FILTER_OPS,
  LANG_OP,
  PARAM_OPS,
  PARSE_ONLY_OPS,
  YAHOO_OR,
  type OpDef,
  type YahooRule,
} from "./operators";
import type { Serialized } from "./serialize-x";

export type YahooSerialized = Serialized & {
  /** 開始日の0時（UNIX 秒）。期間が無ければ付かない */
  lts?: number;
  /** 終了日の翌日0時（UNIX 秒）。期間が無ければ付かない */
  uts?: number;
};

/** 変換中に集めるもの（警告と期間）。先に試して捨てるときは別の入れ物を使う */
type Ctx = { warnings: Issue[]; lts: number[]; uts: number[] };
const newCtx = (): Ctx => ({ warnings: [], lts: [], uts: [] });

const warn = (ctx: Ctx, issue: Issue) => {
  const key = JSON.stringify(issue);
  if (!ctx.warnings.some((w) => JSON.stringify(w) === key))
    ctx.warnings.push(issue);
};

const defOfFilter = (n: FilterNode): OpDef =>
  n.name === "lang"
    ? LANG_OP
    : n.name in PARAM_OPS
      ? PARAM_OPS[n.name as keyof typeof PARAM_OPS]
      : n.name in PARSE_ONLY_OPS
        ? PARSE_ONLY_OPS[n.name as keyof typeof PARSE_ONLY_OPS]
        : FILTER_OPS[n.name as keyof typeof FILTER_OPS];

/** 規則（rename／keep／drop／same）を、語の部分 `x + value` に当てはめる。param は呼び出し側が扱う */
function applyRule(
  ctx: Ctx,
  rule: YahooRule,
  x: string,
  value: string,
  params?: Issue["params"],
): string[] {
  switch (rule.kind) {
    case "rename":
      return [rule.prefix + value];
    case "same":
      return [x + value];
    case "keep":
      warn(ctx, { code: rule.code });
      return [x + value];
    case "drop":
      warn(ctx, params ? { code: rule.code, params } : { code: rule.code });
      return [];
    case "param":
      return [x + value];
  }
}

function account(ctx: Ctx, n: AccountNode, negated: boolean): string[] {
  const def = ACCOUNT_OPS[n.op];
  if (negated) {
    const rule = def.yahooNegated;
    // 除外の書き方（`-from:` など）は警告の params に出す
    return applyRule(ctx, rule, `-${def.x}`, n.value, { op: `-${def.x}` });
  }
  return applyRule(ctx, def.yahoo, def.x, n.value);
}

/** since／until／since_time／until_time。読めない値や否定は、そのまま出して rawUnverified */
function period(ctx: Ctx, n: FilterNode, def: OpDef, negated: boolean) {
  const token = `${negated ? "-" : ""}${def.x}${n.value ?? ""}`;
  const rule = def.yahoo;
  if (rule.kind !== "param" || negated) {
    warn(ctx, { code: "yahoo.rawUnverified", params: { token } });
    return [token];
  }
  const v = n.value ?? "";
  const isStart = rule.param === "lts";
  const sec = /^\d+$/.test(v)
    ? Number(v)
    : localMidnightSec(v, isStart ? 0 : 1);
  if (sec === null) {
    warn(ctx, { code: "yahoo.rawUnverified", params: { token } });
    return [token];
  }
  (isStart ? ctx.lts : ctx.uts).push(sec);
  return [];
}

function filter(ctx: Ctx, n: FilterNode, negated: boolean): string[] {
  const def = defOfFilter(n);
  if (def.yahoo.kind === "param") return period(ctx, n, def, negated);
  // min_*：どの数かを警告の params に出す（コロンなし）
  const params =
    def.yahoo.kind === "drop" && def.yahoo.code === "yahoo.minCountUnsupported"
      ? { op: n.name }
      : undefined;
  return applyRule(ctx, def.yahoo, def.x, n.value ?? "", params);
}

/** AND で結ばれる部分の並び。空なら何も出さない */
function conj(ctx: Ctx, n: Node, flip: boolean): string[] {
  if (!n.enabled) return [];
  // 否定した OR を子の否定に分けるとき（flip）、子自身の否定と打ち消し合う
  const negated = n.negate !== flip;
  switch (n.kind) {
    case "term": {
      const v = n.mode === "exact" ? `"${n.value}"` : n.value;
      return [negated ? `-${v}` : v];
    }
    case "account":
      return account(ctx, n, negated);
    case "filter":
      return filter(ctx, n, negated);
    case "raw": {
      // raw の text は否定を含むので、n.negate は見ない。分けた否定（flip）だけ前に付ける
      const text = flip ? `-${n.text}` : n.text;
      warn(ctx, { code: "yahoo.rawUnverified", params: { token: text } });
      return [text];
    }
    case "variants": {
      if (n.values.length === 0) return [];
      if (n.values.length === 1)
        return [negated ? `-${n.values[0]}` : n.values[0]];
      return negated
        ? n.values.map((v) => `-${v}`)
        : [
            `${YAHOO_OR.open}${n.values.join(YAHOO_OR.separator)}${YAHOO_OR.close}`,
          ];
    }
    case "group":
      return groupParts(ctx, n, negated);
  }
}

/** OR の子を、括弧の中に並べる 1 語ずつに分ける（入れ子の OR は 1 つにまとめる） */
function orUnits(ctx: Ctx, g: GroupNode): string[] {
  return g.children.flatMap((c) => {
    if (!c.enabled) return [];
    if (c.kind === "group" && c.join === "OR" && !c.negate)
      return orUnits(ctx, c);
    const parts = conj(ctx, c, false);
    if (parts.length <= 1) return parts;
    // OR の中の AND：Yahoo に書き方が無いので X の形のまま出す
    warn(ctx, { code: "yahoo.groupUnverified" });
    return [`(${parts.join(" ")})`];
  });
}

function groupParts(ctx: Ctx, g: GroupNode, negated: boolean): string[] {
  if (g.join === "OR") {
    // 否定した OR は、子を除外した AND にする（ド・モルガン）
    if (negated) return g.children.flatMap((c) => conj(ctx, c, true));
    const units = orUnits(ctx, g);
    if (units.length <= 1) return units;
    return [
      `${YAHOO_OR.open}${units.join(YAHOO_OR.separator)}${YAHOO_OR.close}`,
    ];
  }
  if (!negated) return g.children.flatMap((c) => conj(ctx, c, false));
  // 否定した AND。中身が出る子が 1 つなら、その子の否定にする。警告を出さずに先に数えるため別の入れ物で試す
  const live = g.children.filter((c) => conj(newCtx(), c, false).length > 0);
  if (live.length === 0) return [];
  if (live.length === 1) return conj(ctx, live[0], true);
  warn(ctx, { code: "yahoo.groupUnverified" });
  return [`-(${live.flatMap((c) => conj(ctx, c, false)).join(" ")})`];
}

export function serializeYahoo(root: GroupNode): YahooSerialized {
  const ctx = newCtx();
  const text = conj(ctx, root, false).join(" ");
  const out: YahooSerialized = { text, warnings: ctx.warnings };
  // AND で結ばれた期間は共通部分（開始は遅い方、終了は早い方）
  if (ctx.lts.length > 0) out.lts = Math.max(...ctx.lts);
  if (ctx.uts.length > 0) out.uts = Math.min(...ctx.uts);
  return out;
}
