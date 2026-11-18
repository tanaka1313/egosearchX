import { describe, expect, it } from "vitest";
import { LIMITS, type Cond } from "@/api";
import { labelFromQuery, validateChip } from "./chip";

const word = (value: string, id = "c"): Cond => ({ id, kind: "word", value });
const num = (value: string): Cond => ({
  id: "n",
  kind: "number",
  op: "min_faves",
  value,
});
const date = (value: string): Cond => ({
  id: "d",
  kind: "date",
  op: "since",
  value,
});

describe("labelFromQuery", () => {
  it("上限ちょうどはそのまま返す", () => {
    const q = "a".repeat(LIMITS.chipLabel);
    expect(labelFromQuery(q)).toBe(q);
  });
  it("上限を1文字超えたら、先頭（上限−1）文字＋「…」にする", () => {
    const out = labelFromQuery("あ".repeat(LIMITS.chipLabel + 1));
    expect(out).toBe("あ".repeat(LIMITS.chipLabel - 1) + "…");
    expect(out.length).toBe(LIMITS.chipLabel);
  });
  it("前後の空白を除く", () => {
    expect(labelFromQuery("  min_faves:50 ")).toBe("min_faves:50");
  });
});

describe("validateChip（D1 の保存前の検証）", () => {
  it("ラベルと条件があれば、ラベルと検索文字列を返す", () => {
    expect(validateChip(" RTを除く ", [word("-filter:retweets")])).toEqual({
      ok: true,
      value: { label: "RTを除く", query: "-filter:retweets" },
    });
  });
  it("ラベルが空なら、検索文字列から作る", () => {
    expect(validateChip("", [num("50")])).toEqual({
      ok: true,
      value: { label: "min_faves:50", query: "min_faves:50" },
    });
  });
  it("ラベルが空で検索文字列が長いときは、上限に収める", () => {
    const r = validateChip("", [word("a".repeat(30))]);
    expect(r).toEqual({
      ok: true,
      value: {
        label: "a".repeat(LIMITS.chipLabel - 1) + "…",
        query: "a".repeat(30),
      },
    });
  });
  it("ラベルが上限を超えるなら chip.labelTooLong", () => {
    expect(validateChip("a".repeat(LIMITS.chipLabel + 1), [word("x")])).toEqual(
      {
        ok: false,
        error: { code: "chip.labelTooLong" },
      },
    );
  });
  it("値が空の行だけなら chip.empty", () => {
    expect(validateChip("名前", [word("  ")])).toEqual({
      ok: false,
      error: { code: "chip.empty" },
    });
    expect(validateChip("名前", [])).toEqual({
      ok: false,
      error: { code: "chip.empty" },
    });
  });
  it("数値が1以上の整数でなければ chip.badNumber（元の行の位置つき）", () => {
    expect(validateChip("名前", [word("a"), num("0")])).toEqual({
      ok: false,
      error: { code: "chip.badNumber", params: { index: 1 } },
    });
    expect(validateChip("名前", [num("1.5")]).ok).toBe(false);
  });
  it("日付が YYYY-MM-DD でなければ chip.badDate", () => {
    expect(validateChip("名前", [date("2026/11/07")])).toEqual({
      ok: false,
      error: { code: "chip.badDate", params: { index: 0 } },
    });
  });
  it("空の行は位置を数えたまま無視する", () => {
    expect(validateChip("名前", [word(""), date("bad")])).toEqual({
      ok: false,
      error: { code: "chip.badDate", params: { index: 1 } },
    });
  });
});
