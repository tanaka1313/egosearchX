export type BuildInfo = {
  /** ビルド日時（ISO 8601, UTC）。取れないときは空 */
  builtAt: string;
  /** コミットの短縮ハッシュ。取れないときは空 */
  commit: string;
};

export const BUILD_INFO: BuildInfo = {
  builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? "",
  commit: process.env.NEXT_PUBLIC_COMMIT ?? "",
};

/** ビルド日時を日本時間で「2026-11-17 14:05」の形にする。不正・空なら「不明」 */
export function formatBuildTime(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "不明";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${parts} (JST)`;
}
