/**
 * 検索の合成（docs/requirements.md F2・F3・F6、docs/api-spec.md 4.2 `query.build`）。
 * ホームなどの検索の組み立ての状態（`SearchState`）と条件ボタンから、1本の検索文字列（保存形）を作る。
 * 純粋関数。今日の日付は引数で受け取る（`Date` は読まない）。
 *
 * - 使う条件ボタンは `state.onChipIds` に含まれ、かつ「表示」のもの。`chip.on` は見ない。
 * - `stored` はトークンをつなぐだけ（シリアライザーは通さない。`parseToScope` との往復を保つため）。
 * - Yahoo!リアルタイム検索の警告は、相対期間を展開した後の文字列から求める。
 */
import {
  FILTER_KEYS,
  LIMITS,
  isPeriodOp,
  type BuiltQuery,
  type Chip,
  type Detail,
  type Issue,
  type SearchState,
} from "@/api";
import type { Node } from "./ast";
import {
  chipConds,
  condToken,
  disabledKey,
  expandRelative,
  periodToTokens,
  tokenize,
} from "./model";
import { ACCOUNT_OPS, defOfFilter, type OpDef } from "./operators";
import { parseX } from "./parse-x";
import { serializeYahoo } from "./serialize-yahoo";

/** 詳細条件のトークン（期間と、共通の無効化は含まない） */
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
  if (d.exFrom) t.push(`-from:${d.exFrom}`);
  if (d.exTo) t.push(`-to:${d.exTo}`);
  if (d.exMention) t.push(`-@${d.exMention.replace(/^@/, "")}`);
  for (const k of FILTER_KEYS) {
    if (d.flt[k] === "inc") t.push(`filter:${k}`);
    if (d.flt[k] === "exc") t.push(`-filter:${k}`);
  }
  if (d.lang) t.push(`lang:${d.lang}`);
  if (d.minFaves) t.push(`min_faves:${d.minFaves}`);
  if (d.minRt) t.push(`min_retweets:${d.minRt}`);
  if (d.minReplies) t.push(`min_replies:${d.minReplies}`);
  t.push(...tokenize(d.raw));
  return t;
}

/** 木に、status が experimental の演算子が含まれるか */
function hasExperimental(n: Node): boolean {
  switch (n.kind) {
    case "group":
      return n.children.some(hasExperimental);
    case "filter":
      return defOfFilter(n).status === "experimental";
    case "account":
      return (ACCOUNT_OPS[n.op] as OpDef).status === "experimental";
    default:
      return false;
  }
}

export function buildQuery(
  state: SearchState,
  chips: Chip[],
  today: string,
): BuiltQuery {
  const { period, detail } = state;
  const periodTokens = periodToTokens(period);
  const periodActive = periodTokens.length > 0;
  const warnings: Issue[] = [];
  const tokens: string[] = [];

  const word = state.word.trim();
  if (word) tokens.push(state.exact ? `"${word}"` : word);

  for (const chip of chips) {
    if (!state.onChipIds.includes(chip.id) || !chip.visible) continue;
    let skippedDate = false;
    for (const c of chipConds(chip)) {
      if (periodActive && c.op && isPeriodOp(c.op)) {
        skippedDate = true;
        continue;
      }
      const t = condToken(c);
      if (t && !detail.disabledConds.includes(disabledKey(chip.id, t)))
        tokens.push(t);
    }
    if (skippedDate)
      warnings.push({
        code: "period.overridesDateChip",
        params: { label: chip.label },
      });
  }

  tokens.push(...detailTokens(detail), ...state.suggestionTokens);
  tokens.push(...periodTokens);

  const stored = tokens.join(" ");
  const text = expandRelative(stored, today);
  const tree = parseX(text);
  warnings.push(...serializeYahoo(tree).warnings);
  if (text.length > LIMITS.urlWarn)
    warnings.push({
      code: "query.tooLong",
      params: { length: text.length, limit: LIMITS.urlWarn },
    });

  const blockers: Issue[] = [];
  if (!stored) blockers.push({ code: "query.empty" });
  if (
    period.kind === "date" &&
    period.from &&
    period.to &&
    period.from > period.to
  )
    blockers.push({ code: "period.inverted" });

  return {
    stored,
    text,
    warnings,
    blockers,
    experimental: hasExperimental(tree),
  };
}
