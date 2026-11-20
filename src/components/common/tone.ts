/**
 * 種類ごとのアクセント色の使い分け（定義は globals.css の `--tone-*`。画面仕様書 3.13）。
 * 色は「線・アイコン・番号の丸・タブの下線」だけに使い、本文の文字色にしない。
 * 色だけで種類を示さず、必ずアイコンか文字を添える。主ボタンの青と ON の条件ボタン（toggleClass）は変えない。
 * Tailwind が拾えるよう、クラス名は完全な文字列で書く。
 */
export type ToneKind = "fav" | "history" | "group";

export const TONE: Record<
  ToneKind,
  {
    /** アイコンの色 */
    icon: string;
    /** カードの左の線＋薄い面 */
    card: string;
    /** 番号などの丸 */
    dot: string;
    /** 選択中のタブの下線 */
    tabOn: string;
  }
> = {
  fav: {
    icon: "text-tone-fav",
    card: "border-l-4 border-l-tone-fav bg-tone-fav/5",
    dot: "bg-tone-fav/20 text-foreground",
    tabOn: "border-b-tone-fav",
  },
  history: {
    icon: "text-tone-history",
    card: "border-l-4 border-l-tone-history bg-tone-history/5",
    dot: "bg-tone-history/20 text-foreground",
    tabOn: "border-b-tone-history",
  },
  group: {
    icon: "text-tone-group",
    card: "border-l-4 border-l-tone-group bg-tone-group/5",
    dot: "bg-tone-group/20 text-foreground",
    tabOn: "border-b-tone-group",
  },
};
