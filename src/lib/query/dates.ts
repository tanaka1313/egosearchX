/**
 * 日付の計算（docs/implementation-plan.md 2章）。相対期間の展開は #17 がここへ足す。
 */

/**
 * `YYYY-MM-DD` の現地0時を UNIX 秒で返す。`addDays` 日後の0時にもできる（Yahoo の `uts` は終了日の翌日0時なので 1）。
 * 日付として読めない（形式違い・存在しない日）ときは null。ブラウザの現地時刻で計算する（要件定義書 F5）。
 */
export function localMidnightSec(date: string, addDays = 0): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(y, mo - 1, d);
  if (
    probe.getFullYear() !== y ||
    probe.getMonth() !== mo - 1 ||
    probe.getDate() !== d
  )
    return null;
  return Math.floor(new Date(y, mo - 1, d + addDays).getTime() / 1000);
}
