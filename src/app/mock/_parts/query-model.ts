// MOCK: 破棄予定（#61）。ここで決めた規則（docs/requirements.md 11章）は本実装の lib/query に引き継ぐ。
// 「本体は検索文字列」のデータモデルを支える純粋関数：
// - 文字列の分割・正規化（一致の判定は必ず normalize で行う）
// - 相対期間の記号（since:yesterday など）の展開
// - 条件ボタンの本体（文字列）⇄ 条件の行（Cond）
// - お気に入りの文字列 → 条件ボタンの ON・詳細条件・期間への展開
// - お気に入りの編集を、いつものエゴサの一致する項目に反映
// - サジェストの規則
import {
  EMPTY_DETAIL,
  EMPTY_PERIOD,
  FILTERS,
  PARAM_OPS,
  REL_PERIODS,
  type Chip,
  type Cond,
  type Detail,
  type Engine,
  type Group,
  type GroupItem,
  type ParamOp,
  type Period,
  type SuggestRule,
} from "./data";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function addDay(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 空白で分ける。引用符の中と括弧の中（入れ子を含む）の空白では分けない */
export function tokenize(q: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote = false;
  let depth = 0;
  for (const ch of q) {
    if (ch === '"') quote = !quote;
    else if (!quote && ch === "(") depth++;
    else if (!quote && ch === ")") depth = Math.max(0, depth - 1);
    if (/\s/.test(ch) && !quote && depth === 0) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * 比較用の正規形。トークンの順序・重複・空白の違いを吸収する。
 * 保存データどうしの一致（いつものエゴサの項目とお気に入りなど）は、必ずこの値で判定する。
 */
export function normalize(q: string): string {
  return [...new Set(tokenize(q))].sort().join(" ");
}

/** 相対期間の記号を、実行日（YYYY-MM-DD）から数えた日付にする。記号以外は変えない */
export function expandRelative(q: string, today: string): string {
  return tokenize(q)
    .map((t) => {
      const r = REL_PERIODS.find((p) => p.token === t);
      return r ? `since:${addDay(today, -r.days)}` : t;
    })
    .join(" ");
}

/** 期間を、保存する文字列のトークンにする（相対は記号、終了日（含む）は翌日の until:） */
export function periodToTokens(p: Period): string[] {
  const rel = REL_PERIODS.find((r) => r.kind === p.kind);
  if (rel) return [rel.token];
  if (p.kind !== "date") return [];
  const t: string[] = [];
  if (p.from) t.push(`since:${p.from}`);
  if (p.to) t.push(`until:${addDay(p.to, 1)}`);
  return t;
}

/** トークンから期間を取り出す（until: は前日に戻して「含む日」にする）。残りのトークンも返す */
export function splitPeriod(tokens: string[]): {
  period: Period;
  rest: string[];
} {
  let period: Period = EMPTY_PERIOD;
  const rest: string[] = [];
  for (const t of tokens) {
    const rel = REL_PERIODS.find((r) => r.token === t);
    const m = t.match(/^(since|until):(\d{4}-\d{2}-\d{2})$/);
    if (rel) period = { ...EMPTY_PERIOD, kind: rel.kind };
    else if (m) {
      const base =
        period.kind === "date"
          ? period
          : { ...EMPTY_PERIOD, kind: "date" as const };
      period =
        m[1] === "since"
          ? { ...base, from: m[2] }
          : { ...base, to: addDay(m[2], -1) };
    } else rest.push(t);
  }
  return { period, rest };
}

const PARAM_RE = new RegExp(`^(${Object.keys(PARAM_OPS).join("|")}):(.*)$`);

/** 1トークンを条件の行にする（種類の判定） */
export function tokenToCond(token: string, id: string): Cond {
  const p = token.match(PARAM_RE);
  if (p) {
    const op = p[1] as ParamOp;
    const type = PARAM_OPS[op].type;
    const value =
      op === "until" && DATE_RE.test(p[2]) ? addDay(p[2], -1) : p[2];
    return { id, kind: type, op, value };
  }
  if (/^"[^"]*"$/.test(token))
    return { id, kind: "exact", value: token.slice(1, -1) };
  if (/^-?(filter|lang):/.test(token))
    return { id, kind: "filter", value: token };
  const list = token.match(/^list:(\d+)$/);
  if (list) return { id, kind: "list", value: list[1] };
  if (/^-?(from|to):|^-?@/.test(token))
    return { id, kind: "account", value: token };
  if (token.includes(":") || token.startsWith("("))
    return { id, kind: "raw", value: token };
  if (/^-[^-]/.test(token))
    return { id, kind: "exclude", value: token.slice(1) };
  return { id, kind: "word", value: token };
}

/**
 * 条件の行を、検索に入れるトークンにする。不正な値（空・1未満・日付の形式違い）は空文字（検索に入れない）。
 * 「以前」は終了日を含む指定なので、翌日の until: にする。
 */
export function condToken(c: Cond): string {
  const v = c.value.trim();
  if (!v) return "";
  switch (c.kind) {
    case "number":
      return c.op && /^[1-9]\d*$/.test(v) ? `${c.op}:${v}` : "";
    case "date":
      if (!c.op || !DATE_RE.test(v)) return "";
      return c.op === "until" ? `until:${addDay(v, 1)}` : `${c.op}:${v}`;
    case "exact":
      return `"${v}"`;
    case "exclude":
      return v.startsWith("-") ? v : `-${v}`;
    case "list":
      return v.startsWith("list:") ? v : `list:${v}`;
    default:
      return v;
  }
}

/** 条件の行を、保存する文字列のトークンにする。値付きの条件は、値が不正でも演算子を残す（ボタンが値付きのまま） */
function condToStored(c: Cond): string {
  if ((c.kind === "number" || c.kind === "date") && c.op) {
    return condToken(c) || `${c.op}:${c.value.trim()}`;
  }
  return condToken(c);
}

/** 条件ボタンの本体（文字列）を、条件の行に分ける。行の ID は `<ボタンID>#<位置>`（入力中に変わらない） */
export function chipConds(chip: Pick<Chip, "id" | "query">): Cond[] {
  return tokenize(chip.query).map((t, i) => tokenToCond(t, `${chip.id}#${i}`));
}

/** 条件の行を、条件ボタンの本体（文字列）に戻す */
export function condsToQuery(conds: Cond[]): string {
  return conds.map(condToStored).filter(Boolean).join(" ");
}

/** 詳細条件の「項目ごとの無効化」で、条件ボタンの1項目を指すキー */
export const disabledKey = (chipId: string, token: string): string =>
  `${chipId}::${token}`;

/** 文字列から組み立てた、検索の組み立ての初期状態 */
export type ParsedScope = {
  word: string;
  exact: boolean;
  onIds: string[];
  detail: Detail;
  period: Period;
};

const isWordToken = (t: string) => /^"[^"]*"$/.test(t) || !/^[-(@]|:/.test(t);

/**
 * お気に入りなどの検索文字列を、条件ボタンの ON・検索語・詳細条件・期間に展開する。
 * - 照合するのは渡された条件ボタン（今の興味の対象のもの）のうち「表示」のものだけ。
 * - トークン数の多いボタンから、全部のトークンが含まれていれば ON。使ったトークンは他に使わない。
 *   値付きのボタンは値まで一致したときだけ ON（ボタンの値は書き換えない）。
 * - 残りは、先頭の語 → 検索語、期間 → 期間、既知の演算子 → 詳細条件、それ以外 → テキストで追加（内容を欠かさない）。
 */
export function parseToScope(q: string, chips: Chip[]): ParsedScope {
  let rest = tokenize(q);
  const onIds: string[] = [];
  const candidates = chips
    .filter((c) => c.visible)
    .map((c) => ({ id: c.id, tokens: tokenize(c.query) }))
    .filter((c) => c.tokens.length > 0)
    .sort((a, b) => b.tokens.length - a.tokens.length);
  for (const c of candidates) {
    const pool = [...rest];
    const ok = c.tokens.every((t) => {
      const i = pool.indexOf(t);
      if (i < 0) return false;
      pool.splice(i, 1);
      return true;
    });
    if (ok) {
      onIds.push(c.id);
      rest = pool;
    }
  }

  const { period, rest: afterPeriod } = splitPeriod(rest);
  let word = "";
  let exact = false;
  let tokens = afterPeriod;
  if (tokens[0] && isWordToken(tokens[0])) {
    exact = tokens[0].startsWith('"');
    word = exact ? tokens[0].slice(1, -1) : tokens[0];
    tokens = tokens.slice(1);
  }

  const d: Detail = {
    ...EMPTY_DETAIL,
    flt: {},
    exact: [],
    plain: [],
    variants: [],
    exclude: [],
  };
  const raw: string[] = [];
  const setOnce = (
    key:
      | "from"
      | "to"
      | "mention"
      | "list"
      | "exFrom"
      | "exTo"
      | "exMention"
      | "exList"
      | "lang"
      | "minFaves"
      | "minRt"
      | "minReplies",
    v: string,
    t: string,
  ) => {
    if (d[key]) raw.push(t);
    else d[key] = v;
  };
  const numKey: Record<string, "minFaves" | "minRt" | "minReplies"> = {
    min_faves: "minFaves",
    min_retweets: "minRt",
    min_replies: "minReplies",
  };
  for (const t of tokens) {
    let m: RegExpMatchArray | null;
    const filter = FILTERS.find((f) => t === f.op || t === `-${f.op}`);
    if (filter && !d.flt[filter.key])
      d.flt[filter.key] = t.startsWith("-") ? "exc" : "inc";
    else if ((m = t.match(/^"([^"]*)"$/))) d.exact.push(m[1]);
    else if (
      (m = t.match(/^\(([^()"]+)\)$/)) &&
      / OR /.test(m[1]) &&
      !d.variants.length
    )
      d.variants = m[1].split(" OR ").map((s) => s.trim());
    else if ((m = t.match(/^from:(\S+)$/))) setOnce("from", m[1], t);
    else if ((m = t.match(/^to:(\S+)$/))) setOnce("to", m[1], t);
    else if ((m = t.match(/^@(\S+)$/))) setOnce("mention", m[1], t);
    else if ((m = t.match(/^list:(\d+)$/))) setOnce("list", m[1], t);
    else if ((m = t.match(/^-from:(\S+)$/))) setOnce("exFrom", m[1], t);
    else if ((m = t.match(/^-to:(\S+)$/))) setOnce("exTo", m[1], t);
    else if ((m = t.match(/^-@(\S+)$/))) setOnce("exMention", m[1], t);
    else if ((m = t.match(/^-list:(\d+)$/))) setOnce("exList", m[1], t);
    else if ((m = t.match(/^lang:(\w+)$/))) setOnce("lang", m[1], t);
    else if ((m = t.match(/^(min_faves|min_retweets|min_replies):([1-9]\d*)$/)))
      setOnce(numKey[m[1]], m[2], t);
    else if ((m = t.match(/^-([^-:"(@][^:]*)$/))) d.exclude.push(m[1]);
    else if (isWordToken(t)) d.plain.push(t);
    else raw.push(t);
  }
  d.raw = raw.join(" ");
  return { word, exact, onIds, detail: d, period };
}

/**
 * お気に入りの編集を、いつものエゴサの項目に反映する（正規化した文字列が編集前と一致する項目だけ）。
 * 項目の検索先は、編集前のお気に入りと同じだったときだけ変える（項目ごとに選び直した検索先は残す）。
 * 何も変わらないときは、渡された groups をそのまま返す。
 */
export function applyFavEdit(
  groups: Group[],
  before: GroupItem,
  after: GroupItem,
): { groups: Group[]; count: number } {
  const key = normalize(before.query);
  if (key === normalize(after.query) && before.engine === after.engine)
    return { groups, count: 0 };
  let count = 0;
  const next = groups.map((g) => {
    let changed = false;
    const items = g.items.map((it) => {
      if (normalize(it.query) !== key) return it;
      changed = true;
      count++;
      const engine: Engine =
        it.engine === before.engine ? after.engine : it.engine;
      return { query: after.query, engine };
    });
    return changed ? { ...g, items } : g;
  });
  return count ? { groups: next, count } : { groups, count: 0 };
}

/** いつものエゴサの項目の表示名：正規化した文字列が一致するお気に入りのうち、並び順で先のものの名前 */
export function favNameFor(
  query: string,
  favs: { name: string; query: string }[],
): string | null {
  const key = normalize(query);
  return favs.find((f) => normalize(f.query) === key)?.name ?? null;
}

/** 規則によるサジェスト：検索文字列に when のどれかが含まれていれば suggest を出す（すでに入っている条件は除く） */
export function suggestFromRules(q: string, rules: SuggestRule[]): string[] {
  const have = new Set(tokenize(q));
  const out: string[] = [];
  for (const r of rules) {
    if (!r.when.some((w) => q.includes(w))) continue;
    for (const s of r.suggest)
      if (!have.has(s) && !out.includes(s)) out.push(s);
  }
  return out;
}
