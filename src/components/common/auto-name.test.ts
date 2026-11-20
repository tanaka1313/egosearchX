import { describe, expect, it } from "vitest";
import { searchAutoName, truncateName } from "./auto-name";

describe("truncateName", () => {
  it("上限ちょうどの長さは切らない", () => {
    expect(truncateName("あいうえお", 5)).toBe("あいうえお");
  });
  it("上限を超えたら、上限-1文字＋「…」にする", () => {
    expect(truncateName("あいうえおか", 5)).toBe("あいうえ…");
  });
  it("前後の空白は除く", () => {
    expect(truncateName("  あい  ", 5)).toBe("あい");
  });
});

describe("searchAutoName", () => {
  it("検索語とボタン名を「・」でつなぐ", () => {
    expect(searchAutoName("宝鐘マリン", ["画像", "動画"], 30)).toBe(
      "宝鐘マリン・画像・動画",
    );
  });
  it("検索語だけ", () => {
    expect(searchAutoName("宝鐘マリン", [], 30)).toBe("宝鐘マリン");
  });
  it("ボタン名だけ", () => {
    expect(searchAutoName("  ", ["画像"], 30)).toBe("画像");
  });
  it("どちらも無ければ空文字", () => {
    expect(searchAutoName("", [], 30)).toBe("");
  });
  it("長いときは切り詰めて末尾に「…」", () => {
    expect(searchAutoName("宝鐘マリン", ["ファボ数が多い"], 8)).toBe(
      "宝鐘マリン・フ…",
    );
  });
});
