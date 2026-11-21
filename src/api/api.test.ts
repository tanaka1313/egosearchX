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
    const w = {
      label: { ja: "ぺこら", en: "Pekora" },
      query: "兎田ぺこら",
    };
    expect(WordSchema.parse(w)).toEqual(w);
  });
  it("query が空なら拒否する", () => {
    expect(
      WordSchema.safeParse({
        label: { ja: "ぺこら", en: "Pekora" },
        query: "",
      }).success,
    ).toBe(false);
  });
  it("表示名の英語が空なら拒否する", () => {
    expect(
      WordSchema.safeParse({
        label: { ja: "ぺこら", en: "" },
        query: "兎田ぺこら",
      }).success,
    ).toBe(false);
  });
});

describe("WordGroupSchema", () => {
  const word = {
    label: { ja: "a", en: "a" },
    query: "a",
  };
  it("ja・en の両方があれば受理する", () => {
    expect(
      WordGroupSchema.safeParse({
        name: { ja: "配信", en: "Streams" },
        gens: ["0期生"],
        words: [word],
      }).success,
    ).toBe(true);
  });
  it("期（gens）が無ければ拒否する。共通のグループは空配列", () => {
    expect(
      WordGroupSchema.safeParse({
        name: { ja: "共通", en: "Common" },
        words: [word],
      }).success,
    ).toBe(false);
    expect(
      WordGroupSchema.safeParse({
        name: { ja: "共通", en: "Common" },
        gens: [],
        words: [word],
      }).success,
    ).toBe(true);
  });
  it("ワードの表示名が文字列だけなら拒否する（日英の両方が要る）", () => {
    expect(WordSchema.safeParse({ label: "a", query: "a" }).success).toBe(
      false,
    );
  });
  it("en が無ければ拒否する", () => {
    expect(
      WordGroupSchema.safeParse({
        name: { ja: "配信" },
        gens: [],
        words: [word],
      }).success,
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
  it("yahoo.rawUnverified を含み、ブックマーク URL 全体の長さの警告は無い", () => {
    expect(ISSUE_CODES).toContain("yahoo.rawUnverified");
    expect(ISSUE_CODES).not.toContain("launcher.tooLong");
  });
});
