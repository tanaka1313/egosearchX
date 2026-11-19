/**
 * 検索先の表示名（定数1か所。CLAUDE.md「UI の決まり」）。文言はここから埋め込み、直書きしない。
 * 英語の画面の名前も、確定する（#67）までは同じ正式名のまま。
 */
export const ENGINE_LABEL = {
  x: "X",
  yahoo: "Yahoo!リアルタイム検索",
} as const;

/**
 * 短縮名。使ってよいのは［Yahoo で開く］、［⋯］の項目、お気に入り・いつものエゴサの行の検索先バッジだけ。
 */
export const ENGINE_SHORT = {
  x: "X",
  yahoo: "Yahoo",
} as const;
