// MOCK: 破棄予定（#61）。モックの buildQuery に依存するテスト。往復テストは lib/query/merge.test.ts にある。
import { describe, expect, it } from "vitest";
import { EMPTY_DETAIL } from "./data";
import { buildQuery } from "./query";

describe("アカウントの除外の警告", () => {
  it("-to: と -@ は Yahoo!リアルタイム検索で使えない旨を警告する", () => {
    const w = (exTo: string, exMention: string) =>
      buildQuery({
        word: "a",
        exact: false,
        chips: [],
        detail: { ...EMPTY_DETAIL, exTo, exMention },
        period: { kind: "none", from: "", to: "" },
      }).warnings;
    expect(w("y", "").some((m) => m.includes("-to:"))).toBe(true);
    expect(w("", "z").some((m) => m.includes("-@"))).toBe(true);
    expect(w("", "")).toEqual([]);
  });
});
