/**
 * ISO 8601（UTC）の日時を、端末の現地時刻の「M/D HH:mm」にする（例：`11/17 21:03`）。
 * フッターの「前回」・S3 の行の「前回」・S5 の履歴で共用する。読めない値は null（文言は呼び出し側が辞書から出す）。
 */
export function formatRunAt(iso: string): string | null {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
