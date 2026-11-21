// 「本体は検索文字列」のデータモデルを支える純粋関数（docs/requirements.md 11.3・11.4）：
// - 文字列の分割・正規化（一致の判定は必ず normalize で行う）
// - 相対期間の記号（since:yesterday など）の展開
// - 条件ボタンの本体（文字列）⇄ 条件の行（Cond）
// - お気に入りの文字列 → 条件ボタンの ON・詳細条件・期間への展開
// - お気に入りの編集を、いつものエゴサの一致する項目に反映
// - サジェストの規則
// 型と定数は契約（@/api）から取る。文言（ラベル）は持たない（辞書の仕事）。
import {
  EMPTY_DETAIL,
  EMPTY_PERIOD,
  FILTER_KEYS,
  VALUE_OPS,
  isValidValue,
  type Chip,
  type Cond,
  type Detail,
  type Engine,
  type GroupItem,
  type ParsedScope,
  type Period,
  type ValueOp,
  type ValueType,
} from "@/api";

/**
 * 相対期間の記号。保存する検索文字列にはこの記号のまま入れ、開く時点の日付で `since:YYYY-MM-DD` に展開する。
 * ラベル（昨日から など）は辞書が持つ。
 */
export const REL_PERIODS = [
  { kind: "d1", token: "since:yesterday", days: 1 },
  { kind: "d3", token: "since:3days_ago", days: 3 },
  { kind: "d7", token: "since:1week_ago", days: 7 },
] as const;

/** サジェストの規則：検索文字列の語に when のどれかが一致すれば（語単位）suggest を出す */
export type SuggestRule = {
  when: string[];
  suggest: string[];
  /** 確認用のグループ名（日本語）。照合には使わない */
  group?: string;
};

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

/** 期間を、保存する文字列のトークンにする（相対は記号。until: は X と同じく指定日を含むので終了日をそのまま入れる） */
export function periodToTokens(p: Period): string[] {
  const rel = REL_PERIODS.find((r) => r.kind === p.kind);
  if (rel) return [rel.token];
  if (p.kind !== "date") return [];
  const t: string[] = [];
  if (p.from) t.push(`since:${p.from}`);
  if (p.to) t.push(`until:${p.to}`);
  return t;
}

/** トークンから期間を取り出す（until: はそのまま終了日）。残りのトークンも返す */
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
        m[1] === "since" ? { ...base, from: m[2] } : { ...base, to: m[2] };
    } else rest.push(t);
  }
  return { period, rest };
}

/** 値付きの演算子。接頭辞が長いものから照合する（`-@` を `@` より先に） */
const VALUE_OP_LIST = (
  Object.entries(VALUE_OPS) as [ValueOp, { prefix: string; type: ValueType }][]
).sort((a, b) => b[1].prefix.length - a[1].prefix.length);

/** トークンが値付きの演算子なら、演算子と値（空もありうる）を返す */
function matchValueOp(
  token: string,
): { op: ValueOp; type: ValueType; value: string } | null {
  for (const [op, d] of VALUE_OP_LIST)
    if (token.startsWith(d.prefix))
      return { op, type: d.type, value: token.slice(d.prefix.length) };
  return null;
}

/** 1トークンを条件の行にする（種類の判定） */
export function tokenToCond(token: string, id: string): Cond {
  const p = matchValueOp(token);
  if (p) return { id, kind: p.type, op: p.op, value: p.value };
  if (/^"[^"]*"$/.test(token))
    return { id, kind: "exact", value: token.slice(1, -1) };
  if (/^-?(filter|lang):/.test(token))
    return { id, kind: "filter", value: token };
  if (/^-?to:/.test(token)) return { id, kind: "account", value: token };
  if (token.includes(":") || token.startsWith("("))
    return { id, kind: "raw", value: token };
  if (/^-[^-]/.test(token))
    return { id, kind: "exclude", value: token.slice(1) };
  return { id, kind: "word", value: token };
}

/**
 * 条件の行を、検索に入れるトークンにする。不正な値（空・1未満・日付の形式違い）は空文字（検索に入れない）。
 * until: は指定日を含むので、終了日をそのまま入れる。
 */
export function condToken(c: Cond): string {
  const v = c.value.trim();
  if (!v) return "";
  switch (c.kind) {
    case "number":
    case "date":
    case "text":
      // 値付きの演算子。値が正しい形でなければ検索に入れない
      return c.op && isValidValue(VALUE_OPS[c.op].type, v)
        ? `${VALUE_OPS[c.op].prefix}${v}`
        : "";
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
  if (c.op && (c.kind === "number" || c.kind === "date" || c.kind === "text")) {
    return condToken(c) || `${VALUE_OPS[c.op].prefix}${c.value.trim()}`;
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

const isWordToken = (t: string) => /^"[^"]*"$/.test(t) || !/^[-(@]|:/.test(t);

/**
 * お気に入りなどの検索文字列を、条件ボタンの ON・検索語・詳細条件・期間に展開する。
 * - 照合するのは渡された条件ボタン（今の興味の対象のもの）のうち「表示」のものだけ。
 * - トークン数の多いボタンから、全部のトークンが含まれていれば ON。使ったトークンは他に使わない。
 *   値付きのボタンは値まで一致したときだけ ON（ボタンの値は書き換えない）。
 * - 残りは、先頭の語 → 検索語、期間 → 期間、既知の演算子 → 詳細条件、それ以外 → テキストで追加（内容を欠かさない）。
 */
export function parseToScope(
  q: string,
  chips: Pick<Chip, "id" | "query" | "visible">[],
): ParsedScope {
  let rest = tokenize(q);
  const onChipIds: string[] = [];
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
      onChipIds.push(c.id);
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
    flt: { ...EMPTY_DETAIL.flt },
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
    const filter = FILTER_KEYS.find(
      (k) => t === `filter:${k}` || t === `-filter:${k}`,
    );
    if (filter && d.flt[filter] === "any")
      d.flt[filter] = t.startsWith("-") ? "exc" : "inc";
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
    else if ((m = t.match(/^lang:(\w+)$/))) setOnce("lang", m[1], t);
    else if ((m = t.match(/^(min_faves|min_retweets|min_replies):([1-9]\d*)$/)))
      setOnce(numKey[m[1]], m[2], t);
    else if ((m = t.match(/^-([^-:"(@][^:]*)$/))) d.exclude.push(m[1]);
    else if (isWordToken(t)) d.plain.push(t);
    else raw.push(t);
  }
  d.raw = raw.join(" ");
  return { word, exact, onChipIds, detail: d, period };
}

/**
 * お気に入りの編集を、いつものエゴサの項目に反映する（正規化した文字列が編集前と一致する項目だけ）。
 * 項目の検索先は、編集前のお気に入りと同じだったときだけ変える（項目ごとに選び直した検索先は残す）。
 * 何も変わらないときは、渡された groups をそのまま返す。
 */
export function applyFavEdit<G extends { items: GroupItem[] }>(
  groups: G[],
  before: GroupItem,
  after: GroupItem,
): { groups: G[]; count: number } {
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

/** 照合用の語の並び。全角・半角と英字の大文字・小文字の違いを吸収し、空白で語に分ける */
const wordsOf = (s: string): string[] =>
  s.normalize("NFKC").toLowerCase().split(/\s+/).filter(Boolean);

/**
 * 検索文字列を、語の並び（連続した語のまとまり）に分ける。
 * 引用符の中・括弧の中（OR で区切る）の語も対象。除外（`-`）・演算子（`:` を含む、`@`）・`OR` は語として数えず、まとまりを切る。
 */
function wordRuns(q: string): string[][] {
  const runs: string[][] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.length) runs.push(cur);
    cur = [];
  };
  for (const t of tokenize(q)) {
    if (
      t === "OR" ||
      t.startsWith("-") ||
      t.startsWith("@") ||
      (t.includes(":") && !t.startsWith('"'))
    ) {
      flush();
    } else if (t.startsWith("(") && t.endsWith(")")) {
      flush();
      runs.push(...wordRuns(t.slice(1, -1)));
    } else if (/^"[^"]*"$/.test(t)) {
      flush();
      runs.push(wordsOf(t.slice(1, -1)));
    } else cur.push(...wordsOf(t));
  }
  flush();
  return runs;
}

/** runs のどれかに、語 `w`（空白を含むときは連続した語の並び）が含まれるか */
function hasWord(runs: string[][], w: string): boolean {
  const target = wordsOf(w);
  if (target.length === 0) return false;
  return runs.some((run) =>
    run.some((_, i) => target.every((x, j) => run[i + j] === x)),
  );
}

/**
 * 規則によるサジェスト：検索文字列の語に when のどれかが一致すれば suggest を出す（語単位の一致。
 * 「Su」が「Suisei」に当たらないように、部分一致にはしない）。すでに入っている条件は除く。
 */
export function suggestFromRules(q: string, rules: SuggestRule[]): string[] {
  const have = new Set(tokenize(q));
  const runs = wordRuns(q);
  const out: string[] = [];
  for (const r of rules) {
    if (!r.when.some((w) => hasWord(runs, w))) continue;
    for (const s of r.suggest)
      if (!have.has(s) && !out.includes(s)) out.push(s);
  }
  return out;
}
