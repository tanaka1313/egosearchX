/**
 * 本文の左右の余白（全ページ・いつものエゴサの帯・フッター・お知らせで共通）。
 * 本文の列（`app-shell` の `max-w-3xl`）に対して、モバイルは 12px、PC（md 以上）は 40px。
 * ページごとに最大幅を変えない（ホームだけ余白が広い・一覧だけ狭い、というばらつきを作らない）。
 */
export const PAGE_X = "px-3 md:px-10";

/** `<main>` の共通部分（左右は `PAGE_X`、上下は 12px／md 以上 16px） */
export const PAGE_MAIN = `mx-auto ${PAGE_X} py-3 md:py-4`;
