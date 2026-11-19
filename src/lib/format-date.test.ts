import { describe, expect, it } from "vitest";
import { formatRunAt } from "./format-date";

// vitest.config.mts が TZ=Asia/Tokyo に固定している
describe("formatRunAt（ISO 8601 → 端末の現地時刻の「M/D HH:mm」）", () => {
  it("UTC の値を日本時間に直し、月日は0埋めしない・時分は0埋めする", () => {
    expect(formatRunAt("2026-11-17T12:03:00.000Z")).toBe("11/17 21:03");
  });
  it("UTC では前日でも、日本時間では翌日になる（日付の境目）", () => {
    expect(formatRunAt("2026-11-17T15:00:00.000Z")).toBe("11/18 00:00");
  });
  it("1桁の月日は0埋めしない", () => {
    expect(formatRunAt("2026-01-05T00:07:00.000Z")).toBe("1/5 09:07");
  });
  it("読めない値は null（文言は呼び出し側が出す）", () => {
    expect(formatRunAt("")).toBeNull();
    expect(formatRunAt("昨日")).toBeNull();
  });
});
