import { describe, expect, it } from "vitest";
import { ISSUE_CODES, LIMITS, type IssueCode, type IssueParams } from "@/api";
import { ENGINE_LABEL, ENGINE_SHORT, detectLang, dictionaries } from ".";

/** コードごとの見本の params と、文言に含まれるべき値 */
const SAMPLES: Record<IssueCode, { params?: IssueParams; shown?: string[] }> = {
  "period.overridesDateChip": {
    params: { label: "日付ボタンX" },
    shown: ["日付ボタンX"],
  },
  "yahoo.listUnsupported": {},
  "yahoo.filterUnsupported": {},
  "yahoo.accountExcludeUnsupported": {
    params: { op: "-from:" },
    shown: ["-from:"],
  },
  "yahoo.rawUnverified": {
    params: { token: "foo:bar" },
    shown: ["foo:bar"],
  },
  "yahoo.groupUnverified": {},
  "yahoo.mentionAsReply": {},
  "yahoo.langUnsupported": {},
  "yahoo.minCountUnsupported": {
    params: { op: "min_faves" },
    shown: ["min_faves"],
  },
  "query.tooLong": {
    params: { length: 612, limit: 500 },
    shown: ["612", "500"],
  },
  "query.empty": {},
  "period.inverted": {},
  "url.unreadable": {},
  "url.unsupportedHost": {},
  "url.noQuery": {},
  "list.invalid": {},
  "chip.labelTooLong": { shown: [String(LIMITS.chipLabel)] },
  "chip.empty": {},
  "chip.badNumber": { params: { index: 2 }, shown: ["3"] },
  "chip.badDate": { params: { index: 0 }, shown: ["1"] },
  "chip.badText": { params: { index: 1 }, shown: ["2"] },
};

describe("見本の params が全コードを覆っている", () => {
  it("ISSUE_CODES と SAMPLES のキーが一致する", () => {
    expect(Object.keys(SAMPLES).sort()).toEqual([...ISSUE_CODES].sort());
  });
});

describe.each(["ja", "en"] as const)("辞書 %s の警告・エラーの文言", (lang) => {
  it.each(ISSUE_CODES)(
    "%s は、空でなく未置換の記号も無く、値を含む",
    (code) => {
      const { params = {}, shown = [] } = SAMPLES[code];
      const text = dictionaries[lang].issues[code](params);
      expect(text.trim()).not.toBe("");
      expect(text).not.toMatch(/undefined|NaN|\{|\}|\[object/);
      for (const v of shown) expect(text).toContain(v);
    },
  );
});

describe("検索先の表示名", () => {
  it("警告は Yahoo!リアルタイム検索を正式名で書く（短縮しない）", () => {
    const text = dictionaries.ja.issues["yahoo.listUnsupported"]({});
    expect(text).toContain(ENGINE_LABEL.yahoo);
    expect(text.replaceAll(ENGINE_LABEL.yahoo, "")).not.toContain("Yahoo");
  });
  it("表示名は1か所の定数から出る", () => {
    expect(ENGINE_LABEL).toEqual({ x: "X", yahoo: "Yahoo!リアルタイム検索" });
    expect(ENGINE_SHORT.yahoo).toBe("Yahoo");
  });
});

describe("detectLang（ブラウザの言語 → 表示言語）", () => {
  it.each(["ja", "ja-JP", "JA", "ja_JP"])("%s は日本語", (tag) => {
    expect(detectLang(tag)).toBe("ja");
  });
  it.each(["en", "en-US", "zh-TW", "fr", "jam", "", undefined])(
    "%s は日本語以外なので英語",
    (tag) => {
      expect(detectLang(tag)).toBe("en");
    },
  );
});
