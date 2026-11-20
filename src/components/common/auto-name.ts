/** 名前の自動入力（検索語・ON のボタン名から作る）。純粋関数。文言は呼び出し側が辞書から出す */

/** `max` 文字を超えたら、`max-1` 文字＋「…」にする（前後の空白は除く） */
export function truncateName(text: string, max: number): string {
  const s = text.trim();
  const chars = [...s];
  return chars.length <= max ? s : `${chars.slice(0, max - 1).join("")}…`;
}

/** 検索語と ON の条件ボタン名を「・」でつなぐ。どちらも無ければ空文字（呼び出し側が既定の名前を使う） */
export function searchAutoName(
  word: string,
  chipLabels: readonly string[],
  max: number,
): string {
  const parts = [word.trim(), ...chipLabels.map((l) => l.trim())].filter(
    Boolean,
  );
  return truncateName(parts.join("・"), max);
}
