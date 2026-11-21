// サジェスト検索条件（docs/requirements.md F6・11.4）。
import type { HistoryItem, Chip } from "@/api";
import {
  splitPeriod,
  suggestFromRules,
  tokenize,
  type SuggestRule,
} from "./model";

const chipTokens = (chips: Pick<Chip, "query">[]): Set<string> =>
  new Set(chips.flatMap((c) => tokenize(c.query)));

/**
 * 規則 → 履歴のトークンの順。条件ボタンにあるもの・今の検索に入っているもの・重複を除き、最大 limit 件。
 * 履歴は新しい順で渡される前提。期間（since:／until:・相対の記号）だけを除き、検索語も条件も候補にする。
 */
export function suggest(
  input: {
    text: string;
    chips: Pick<Chip, "query">[];
    history: Pick<HistoryItem, "query">[];
  },
  rules: SuggestRule[],
  limit: number,
): string[] {
  const skip = new Set([...chipTokens(input.chips), ...tokenize(input.text)]);
  const out: string[] = [];
  const add = (t: string) => {
    if (!skip.has(t) && !out.includes(t)) out.push(t);
  };
  suggestFromRules(input.text, rules).forEach(add);
  for (const h of input.history)
    splitPeriod(tokenize(h.query)).rest.forEach(add);
  return out.slice(0, limit);
}
