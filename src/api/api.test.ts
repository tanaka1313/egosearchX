import { describe, expect, it } from "vitest";
import {
  ApiError,
  EMPTY_DETAIL,
  FILTER_KEYS,
  ISSUE_CODES,
  LauncherPayloadSchema,
  WordGroupSchema,
  WordSchema,
} from "@/api";

describe("WordSchema", () => {
  it("正しい値を受理する", () => {
    const w = { label: "ぺこら", query: "兎田ぺこら", starter: true };
    expect(WordSchema.parse(w)).toEqual(w);
  });
  it("query が空なら拒否する", () => {
    expect(
      WordSchema.safeParse({ label: "ぺこら", query: "", starter: true })
        .success,
    ).toBe(false);
  });
  it("starter が無ければ拒否する", () => {
    expect(
      WordSchema.safeParse({ label: "ぺこら", query: "兎田ぺこら" }).success,
    ).toBe(false);
  });
});

describe("WordGroupSchema", () => {
  const word = { label: "a", query: "a", starter: false };
  it("ja・en の両方があれば受理する", () => {
    expect(
      WordGroupSchema.safeParse({
        name: { ja: "配信", en: "Streams" },
        words: [word],
      }).success,
    ).toBe(true);
  });
  it("en が無ければ拒否する", () => {
    expect(
      WordGroupSchema.safeParse({ name: { ja: "配信" }, words: [word] })
        .success,
    ).toBe(false);
  });
});

describe("LauncherPayloadSchema", () => {
  it("検索先が x／yahoo／both なら受理する", () => {
    const payload = {
      name: "朝",
      items: [
        { query: "a", engine: "x" },
        { query: "b", engine: "both" },
      ],
    };
    expect(LauncherPayloadSchema.parse(payload)).toEqual(payload);
  });
  it("不正な検索先は拒否する", () => {
    expect(
      LauncherPayloadSchema.safeParse({
        name: "朝",
        items: [{ query: "a", engine: "google" }],
      }).success,
    ).toBe(false);
  });
});

describe("ApiError", () => {
  it("Error であり、code・params・cause を保つ", () => {
    const cause = new Error("元");
    const e = new ApiError("LIMIT", { kind: "chip", limit: 30 }, { cause });
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("LIMIT");
    expect(e.params).toEqual({ kind: "chip", limit: 30 });
    expect(e.cause).toBe(cause);
  });
});

describe("EMPTY_DETAIL", () => {
  it("flt は FILTER_KEYS を過不足なく持ち、すべて any", () => {
    expect(Object.keys(EMPTY_DETAIL.flt).sort()).toEqual(
      [...FILTER_KEYS].sort(),
    );
    expect(Object.values(EMPTY_DETAIL.flt).every((v) => v === "any")).toBe(
      true,
    );
  });
});

describe("ISSUE_CODES", () => {
  it("重複が無い", () => {
    expect(new Set(ISSUE_CODES).size).toBe(ISSUE_CODES.length);
  });
  it("yahoo.rawUnverified と launcher.tooLong を含む", () => {
    expect(ISSUE_CODES).toContain("yahoo.rawUnverified");
    expect(ISSUE_CODES).toContain("launcher.tooLong");
  });
});
