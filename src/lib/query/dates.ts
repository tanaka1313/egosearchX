/**
 * 日付の計算（docs/implementation-plan.md 2章）。
 * 相対期間の展開の本体は `model.ts` の `expandRelative`。ここには、展開の基準日になる
 * 「開く時点の現地の日付」（`localDate`。#85 の `clock.today()` が使う）と、Yahoo の `lts`／`uts` の秒を置く。
 */

/**
 * 現地（ブラウザの時刻。日本時間を想定）の日付を `YYYY-MM-DD` で返す。
 * `toISOString` は UTC なので使わない（日本時間の 0:00〜8:59 に前日になり、［昨日から］が一昨日に展開される）。
 */
export function localDate(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

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
