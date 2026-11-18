/**
 * X のクエリ文字列 → AST（docs/implementation-plan.md 3章）。
 *
 * - 演算子の判定は `operators.ts` の定義から導く（接頭辞をここに直書きしない）。
 *   否定できるかも定義に従う（`-list:` が raw になるのは `list` が `negatable: false` だから。E6）。
 * - 解析できないものは `raw` ノードで入力のまま保持し、内容を欠かさない（往復を壊さない）。
 * - **括弧なしの `OR` は、通常の語と混ざるとき OR を先に結ぶ。**
 *   `ぺこら 配信 OR 歌枠` ＝ ぺこら AND (配信 OR 歌枠)。X も Yahoo!リアルタイム検索も実機で確認した
 *   （E9、2026-11-18、開発者）。公式の記載は無いので、変わったらここ（`parseOr`）を直す。
 * - ID は解析ごとの連番で、同じ入力なら同じ結果になる。
 */
import { FILTER_KEYS } from "@/api";
import type { AccountNode, FilterNode, GroupNode, Node } from "./ast";
import { REL_PERIODS } from "./model";
import {
  ACCOUNT_OPS,
  FILTER_OPS,
  LANG_OP,
  PARAM_OPS,
  PARSE_ONLY_OPS,
} from "./operators";
import { lex, type Token } from "./tokenizer";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INT_RE = /^[1-9]\d*$/;
const UNIX_RE = /^\d+$/;
/** アカウントの値：空でなく、引用符・コロン・括弧を含まない */
const ACCOUNT_VALUE_RE = /^[^\s"():]+$/;

type WordToken = Extract<Token, { type: "word" }>;

export function parseX(q: string): GroupNode {
  const tokens = lex(q);
  let pos = 0;
  let seq = 0;
  const nextId = () => `n${seq++}`;

  const rawNode = (text: string): Node => ({
    id: nextId(),
    kind: "raw",
    text,
    enabled: true,
    negate: false,
  });

  const wordNode = (t: WordToken): Node => {
    const body = t.negate ? t.text.slice(1) : t.text;
    const base = { enabled: true, negate: t.negate };
    const raw = () => rawNode(t.text);
    if (t.unterminated || !body || body.startsWith("-")) return raw();

    if (body.startsWith('"')) {
      return /^"[^"]+"$/.test(body)
        ? {
            id: nextId(),
            kind: "term",
            mode: "exact",
            value: body.slice(1, -1),
            ...base,
          }
        : raw();
    }
    if (body.includes('"')) return raw();

    for (const [op, def] of Object.entries(ACCOUNT_OPS)) {
      if (!body.startsWith(def.x)) continue;
      const value = body.slice(def.x.length);
      if (!ACCOUNT_VALUE_RE.test(value) || (t.negate && !def.negatable))
        return raw();
      return {
        id: nextId(),
        kind: "account",
        op: op as AccountNode["op"],
        value,
        ...base,
      };
    }

    const filterKey = FILTER_KEYS.find((k) => body === FILTER_OPS[k].x);
    if (filterKey)
      return { id: nextId(), kind: "filter", name: filterKey, ...base };

    const valued = (name: FilterNode["name"], value: string): Node => ({
      id: nextId(),
      kind: "filter",
      name,
      value,
      ...base,
    });
    // 値付きの演算子は、否定できない（定義に無いので推測しない）
    if (body.startsWith(LANG_OP.x)) {
      const value = body.slice(LANG_OP.x.length);
      return !t.negate && ACCOUNT_VALUE_RE.test(value)
        ? valued("lang", value)
        : raw();
    }
    for (const [name, def] of Object.entries(PARAM_OPS)) {
      if (!body.startsWith(def.x)) continue;
      const value = body.slice(def.x.length);
      const ok =
        def.valueType === "number"
          ? INT_RE.test(value)
          : DATE_RE.test(value) ||
            (name === "since" && REL_PERIODS.some((r) => r.token === body));
      return !t.negate && ok
        ? valued(name as FilterNode["name"], value)
        : raw();
    }
    for (const [name, def] of Object.entries(PARSE_ONLY_OPS)) {
      if (!body.startsWith(def.x)) continue;
      const value = body.slice(def.x.length);
      return !t.negate && UNIX_RE.test(value)
        ? valued(name as FilterNode["name"], value)
        : raw();
    }

    if (body.includes(":")) return raw();
    return {
      id: nextId(),
      kind: "term",
      mode: "plain",
      value: body,
      ...base,
    };
  };

  const startsAtom = (t: Token | undefined) =>
    t?.type === "word" || t?.type === "lparen";

  /** 1 つの項。対応しない `)`・単独の `OR` は raw にして進む */
  const parseAtom = (): Node => {
    const t = tokens[pos++];
    if (t.type === "word") return wordNode(t);
    if (t.type === "rparen") return rawNode(q.slice(t.start, t.end));
    if (t.type === "or") return rawNode("OR");

    const children = parseAnd(true);
    const close = tokens[pos];
    if (close?.type !== "rparen" || children.length === 0) {
      // 閉じていない `(`、空の `()`：そこから閉じ括弧（無ければ最後）までを 1 つの raw にする
      const end = close?.type === "rparen" ? close.end : q.length;
      if (close?.type === "rparen") pos++;
      return rawNode(q.slice(t.start, end));
    }
    pos++;
    const only = children.length === 1 ? children[0] : undefined;
    // `(A OR B)` のように中身が 1 つのグループなら、そのグループを使う
    if (only?.kind === "group" && !only.negate)
      return { ...only, negate: t.negate };
    return {
      id: nextId(),
      kind: "group",
      join: "AND",
      children,
      enabled: true,
      negate: t.negate,
    };
  };

  /** `A OR B OR C` を 1 つの OR グループにする。OR が無ければ項をそのまま返す */
  const parseOr = (): Node => {
    if (tokens[pos]?.type === "or") return parseAtom(); // 先頭の OR は raw
    const first = parseAtom();
    if (tokens[pos]?.type !== "or" || !startsAtom(tokens[pos + 1]))
      return first;
    const children = [first];
    while (tokens[pos]?.type === "or" && startsAtom(tokens[pos + 1])) {
      pos++;
      children.push(parseAtom());
    }
    return {
      id: nextId(),
      kind: "group",
      join: "OR",
      children,
      enabled: true,
      negate: false,
    };
  };

  /** 並んだ項（AND）。括弧の中では `)` で止まる */
  function parseAnd(inParen: boolean): Node[] {
    const out: Node[] = [];
    while (pos < tokens.length) {
      if (inParen && tokens[pos].type === "rparen") break;
      out.push(parseOr());
    }
    return out;
  }

  const children = parseAnd(false);
  return {
    id: nextId(),
    kind: "group",
    join: "AND",
    children,
    enabled: true,
    negate: false,
  };
}
