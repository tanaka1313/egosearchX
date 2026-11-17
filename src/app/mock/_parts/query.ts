// MOCK: 破棄予定（#61）
// モック用の簡易クエリ組み立て（文字列の連結だけ。本実装のシリアライザーではない）
import {
  FILTERS,
  TODAY,
  type Chip,
  type Cond,
  type Detail,
  type Period,
} from "./data";

export function condToken(c: Cond): string {
  const v = c.value.trim();
  if (!v) return "";
  switch (c.kind) {
    case "number":
      // 正の整数だけを出力する（空・不正な値はトークンにしない）
      return c.op && /^[1-9]\d*$/.test(v) ? `${c.op}:${v}` : "";
    case "date":
      if (!c.op || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
      // 「以前」は終了日を含む指定 → until は翌日へ変換（requirements F2）
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

/**
 * 共通：ON の条件ボタンの中身（個別設定で無効にした項目を除く）。
 * 期間を指定しているときは、日付の条件を除く（期間を優先する。requirements F6）。
 */
export function chipTokens(
  chip: Chip,
  disabled: string[] = [],
  opts: { periodActive?: boolean } = {},
): string[] {
  return chip.conds
    .filter((c) => !disabled.includes(c.id))
    .filter((c) => !(opts.periodActive && c.kind === "date"))
    .map(condToken)
    .filter(Boolean);
}

/** 期間（昨日から・日付指定など）が有効か。有効なら日付の条件ボタンは使わない */
export const periodActive = (p: Period): boolean => periodTokens(p).length > 0;

export function addDay(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const REL_DAYS: Record<"d1" | "d3" | "d7", number> = { d1: 1, d3: 3, d7: 7 };

/** 期間をトークンにする。相対指定は、実行した時点の日付で解決する */
export function periodTokens(p: Period): string[] {
  switch (p.kind) {
    case "d1":
    case "d3":
    case "d7":
      return [`since:${addDay(TODAY, -REL_DAYS[p.kind])}`];
    case "date": {
      const t: string[] = [];
      if (p.from) t.push(`since:${p.from}`);
      // 終了日を含む指定 → until は翌日へ変換（requirements F2）
      if (p.to) t.push(`until:${addDay(p.to, 1)}`);
      return t;
    }
    default:
      return [];
  }
}

/** 開始日が終了日より後なら true（日付指定のときだけ） */
export function periodInverted(p: Period): boolean {
  return p.kind === "date" && !!p.from && !!p.to && p.from > p.to;
}

export const REL_PERIODS = [
  { kind: "d1", label: "昨日から" },
  { kind: "d3", label: "3日前から" },
  { kind: "d7", label: "1週間前から" },
] as const;

/** 期間の説明（注記・一覧用）。指定なしは空文字 */
export function periodText(p: Period): string {
  switch (p.kind) {
    case "d1":
    case "d3":
    case "d7":
      return `${REL_PERIODS.find((r) => r.kind === p.kind)?.label}（実行時の日付で計算）`;
    case "date":
      if (p.from && p.to) return `${p.from} 〜 ${p.to}（終了日を含む）`;
      if (p.from) return `${p.from} 以降`;
      if (p.to) return `${p.to} 以前（終了日を含む）`;
      return "";
    default:
      return "";
  }
}

/** 保存した検索（お気に入り・いつものエゴサの1件）の、実行時の検索文字列 */
export function savedText(s: { query: string; period: Period }): string {
  return [s.query, ...periodTokens(s.period)].filter(Boolean).join(" ");
}

/** 個別設定（詳細設定）のトークン。期間は含まない */
export function detailTokens(d: Detail): string[] {
  const t: string[] = [];
  d.exact.forEach((v) => t.push(`"${v}"`));
  d.plain.forEach((v) => t.push(v));
  if (d.variants.length) t.push(`(${d.variants.join(" OR ")})`);
  d.exclude.forEach((v) => t.push(`-${v}`));
  if (d.from) t.push(`from:${d.from}`);
  if (d.to) t.push(`to:${d.to}`);
  if (d.mention) t.push(`@${d.mention.replace(/^@/, "")}`);
  if (d.list) t.push(`list:${d.list}`);
  FILTERS.forEach((f) => {
    const v = d.flt[f.key];
    if (v === "inc") t.push(f.op);
    if (v === "exc") t.push(`-${f.op}`);
  });
  if (d.lang) t.push(`lang:${d.lang}`);
  if (d.minFaves) t.push(`min_faves:${d.minFaves}`);
  if (d.minRt) t.push(`min_retweets:${d.minRt}`);
  if (d.minReplies) t.push(`min_replies:${d.minReplies}`);
  d.raw
    .split(/\s+/)
    .filter(Boolean)
    .forEach((v) => t.push(v));
  return t;
}

export type BuildInput = {
  word: string;
  exact: boolean;
  chips: Chip[];
  detail: Detail;
  period: Period;
  /** チップの on を無視して、このIDだけを使う（お気に入り・いつものエゴサの実行用） */
  onlyChipIds?: string[];
  extra?: string[];
};

export function buildQuery(i: BuildInput): {
  text: string;
  warnings: string[];
  tokens: string[];
} {
  const w = i.word.trim();
  const tokens: string[] = [];
  if (w) tokens.push(i.exact ? `"${w}"` : w);
  const used = i.chips.filter(
    (ch) =>
      ch.visible && (i.onlyChipIds ? i.onlyChipIds.includes(ch.id) : ch.on),
  );
  const pActive = periodActive(i.period);
  used.forEach((ch) =>
    tokens.push(
      ...chipTokens(ch, i.detail.disabledConds, { periodActive: pActive }),
    ),
  );
  const skippedDate = pActive
    ? used.filter((ch) => ch.conds.some((c) => c.kind === "date"))
    : [];
  tokens.push(
    ...detailTokens(i.detail).filter((x) => !i.detail.offTokens.includes(x)),
  );
  tokens.push(...(i.extra ?? []));
  tokens.push(...periodTokens(i.period));
  const warnings: string[] = [];
  skippedDate.forEach((ch) =>
    warnings.push(
      `期間を指定中のため、日付ボタン「${ch.label}」は使われません（期間を優先）`,
    ),
  );
  if (tokens.some((x) => x.includes("list:")))
    warnings.push("list: は Yahoo では使えません（Yahoo では除外されます）");
  if (tokens.some((x) => x.includes("filter:")))
    warnings.push("filter: は Yahoo では使えません（Yahoo では除外されます）");
  if (tokens.some((x) => x.startsWith("-from:")))
    warnings.push(
      "-from: は Yahoo では使えません。Yahoo のミュート機能を使ってください",
    );
  return { text: tokens.join(" "), warnings, tokens };
}

/** `https://x.com/i/lists/<ID>?s=20` か数字だけの文字列からリスト ID を取り出す */
export function parseListId(input: string): string | null {
  const s = input.trim();
  if (/^\d{5,}$/.test(s)) return s;
  const m = s.match(/lists\/(\d{5,})/);
  return m ? m[1] : null;
}
