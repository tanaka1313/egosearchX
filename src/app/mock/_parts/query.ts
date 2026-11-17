// MOCK: 破棄予定（#61）
// モック用の簡易クエリ組み立て（文字列の連結だけ。本実装のシリアライザーではない）。
// 文字列の分割・正規化・相対期間・条件の行の変換は query-model.ts にある。
import {
  ENGINE_LABEL,
  FILTERS,
  REL_PERIODS,
  TODAY,
  type Chip,
  type Detail,
  type Period,
} from "./data";
import {
  chipConds,
  condToken,
  disabledKey,
  expandRelative,
  periodToTokens,
} from "./query-model";

export { addDay, condToken } from "./query-model";

/**
 * 共通：ON の条件ボタンの中身（個別設定で無効にした項目を除く）。
 * 期間を指定しているときは、日付の条件を除く（期間を優先する。requirements F6）。
 */
export function chipTokens(
  chip: Chip,
  disabled: string[] = [],
  opts: { periodActive?: boolean } = {},
): string[] {
  return chipConds(chip)
    .filter((c) => !(opts.periodActive && c.kind === "date"))
    .map(condToken)
    .filter(Boolean)
    .filter((t) => !disabled.includes(disabledKey(chip.id, t)));
}

/** 期間（昨日から・日付指定など）が有効か。有効なら日付の条件ボタンは使わない */
export const periodActive = (p: Period): boolean =>
  periodToTokens(p).length > 0;

/** 開く時点の検索文字列：相対期間の記号を、今日の日付で展開する（URL・コピー・履歴に使う） */
export const runText = (q: string): string => expandRelative(q, TODAY);

/** 開始日が終了日より後なら true（日付指定のときだけ） */
export function periodInverted(p: Period): boolean {
  return p.kind === "date" && !!p.from && !!p.to && p.from > p.to;
}

/** 期間の説明（注記・一覧用）。指定なしは空文字 */
export function periodText(p: Period): string {
  const rel = REL_PERIODS.find((r) => r.kind === p.kind);
  if (rel) return `${rel.label}（実行時の日付で計算）`;
  if (p.kind !== "date") return "";
  if (p.from && p.to) return `${p.from} 〜 ${p.to}（終了日を含む）`;
  if (p.from) return `${p.from} 以降`;
  if (p.to) return `${p.to} 以前（終了日を含む）`;
  return "";
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
  /** チップの on を無視して、このIDだけを使う（ホーム以外の検索の組み立て用） */
  onlyChipIds?: string[];
  extra?: string[];
};

export function buildQuery(i: BuildInput): {
  /** 開く時点の文字列（相対期間は日付に展開済み）。クエリ表示・URL・コピー・履歴に使う */
  text: string;
  /** 保存する文字列（相対期間は記号のまま。お気に入り・いつものエゴサの本体） */
  stored: string;
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
    ? used.filter((ch) => chipConds(ch).some((c) => c.kind === "date"))
    : [];
  tokens.push(...detailTokens(i.detail));
  tokens.push(...(i.extra ?? []));
  tokens.push(...periodToTokens(i.period));
  const warnings: string[] = [];
  skippedDate.forEach((ch) =>
    warnings.push(
      `期間を指定中のため、日付ボタン「${ch.label}」は使われません（期間を優先）`,
    ),
  );
  const yahoo = ENGINE_LABEL.Yahoo;
  if (tokens.some((x) => x.includes("list:")))
    warnings.push(`list: は${yahoo}では使えません（${yahoo}では除外されます）`);
  if (tokens.some((x) => x.includes("filter:")))
    warnings.push(
      `filter: は${yahoo}では使えません（${yahoo}では除外されます）`,
    );
  if (tokens.some((x) => x.startsWith("-from:")))
    warnings.push(
      `-from: は${yahoo}では使えません。${yahoo}のミュート機能を使ってください`,
    );
  const stored = tokens.join(" ");
  return { text: runText(stored), stored, warnings, tokens };
}

/** `https://x.com/i/lists/<ID>?s=20` か数字だけの文字列からリスト ID を取り出す */
export function parseListId(input: string): string | null {
  const s = input.trim();
  if (/^\d{5,}$/.test(s)) return s;
  const m = s.match(/lists\/(\d{5,})/);
  return m ? m[1] : null;
}
