import { describe, expect, it } from "vitest";
import { localDate, localMidnightSec } from "./dates";

/** 日本時間の0時（UNIX 秒）。day に 0 を渡すと前月末日になる */
const jst = (y: number, m: number, d: number) =>
  Date.UTC(y, m - 1, d - 1, 15) / 1000;

describe("テスト環境のタイムゾーン", () => {
  it("vitest.config.ts の TZ 固定が効いている（日本時間 UTC+9）", () => {
    expect(new Date(2026, 10, 18).getTimezoneOffset()).toBe(-540);
  });
});

describe("localMidnightSec", () => {
  it("日付の現地0時を UNIX 秒で返す", () => {
    expect(localMidnightSec("2026-11-07")).toBe(jst(2026, 11, 7));
    expect(localMidnightSec("2026-11-07")).toBe(1793977200);
  });

  it("日数を足すと翌日0時になる（終了日の uts）", () => {
    expect(localMidnightSec("2026-11-07", 1)).toBe(jst(2026, 11, 8));
  });

  it("月末をまたぐ（11-30 → 12-01）", () => {
    expect(localMidnightSec("2026-11-30", 1)).toBe(jst(2026, 12, 1));
  });

  it("年末をまたぐ（12-31 → 翌年01-01）", () => {
    expect(localMidnightSec("2026-12-31", 1)).toBe(jst(2027, 1, 1));
  });

  it("うるう日をまたぐ（2028-02-28 → 02-29 → 03-01）", () => {
    expect(localMidnightSec("2028-02-28", 1)).toBe(jst(2028, 2, 29));
    expect(localMidnightSec("2028-02-29", 1)).toBe(jst(2028, 3, 1));
  });

  it.each([
    "2026-02-30",
    "2026-13-01",
    "2026-11-1",
    "yesterday",
    "",
    "20261107",
  ])("日付として読めない %j は null", (v) => {
    expect(localMidnightSec(v)).toBeNull();
  });
});

describe("localDate（開く時点の現地の日付。相対期間の基準日）", () => {
  it("日本時間の0時の直前は前日、0時ちょうどは翌日（UTC では前日のまま）", () => {
    expect(localDate(new Date("2026-11-17T14:59:59Z"))).toBe("2026-11-17");
    expect(localDate(new Date("2026-11-17T15:00:00Z"))).toBe("2026-11-18");
  });
  it("年末をまたぐ", () => {
    expect(localDate(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  });
  it("月・日は0埋めする", () => {
    expect(localDate(new Date("2026-02-02T03:00:00Z"))).toBe("2026-02-02");
  });
});
