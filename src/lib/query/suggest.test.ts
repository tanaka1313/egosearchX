import { describe, expect, it } from "vitest";
import type { HistoryItem, Word } from "@/api";
import { starters, suggest } from "./suggest";

const hist = (query: string): HistoryItem => ({
  id: query,
  at: "2026-11-18T00:00:00.000Z",
  query,
  engine: "x",
  source: { kind: "home", label: "" },
});
const chip = (query: string) => ({ query });
const rules = [
  { when: ["メンバーA"], suggest: ["#ファンアートタグA", "愛称A"] },
];

describe("suggest", () => {
  it("規則に一致する語で、規則の候補が先頭に出る", () => {
    expect(
      suggest(
        { text: "メンバーA", chips: [], history: [hist("履歴語 foo:bar")] },
        rules,
        20,
      ),
    ).toEqual(["#ファンアートタグA", "愛称A", "履歴語", "foo:bar"]);
  });
  it("履歴からは期間（since:／until:・相対の記号）だけを除き、検索語は残す", () => {
    expect(
      suggest(
        {
          text: "",
          chips: [],
          history: [
            hist(
              "ぺこら since:2026-11-01 until:2026-11-02 since:yesterday -filter:retweets",
            ),
          ],
        },
        [],
        20,
      ),
    ).toEqual(["ぺこら", "-filter:retweets"]);
  });
  it("条件ボタンにあるものと、今の検索に入っているものは除く", () => {
    expect(
      suggest(
        {
          text: "入力済み",
          chips: [chip("-filter:retweets min_faves:50")],
          history: [hist("入力済み -filter:retweets min_faves:50 新しい")],
        },
        [],
        20,
      ),
    ).toEqual(["新しい"]);
  });
  it("規則と履歴で重複したものは1つにする", () => {
    expect(
      suggest(
        { text: "メンバーA", chips: [], history: [hist("愛称A 愛称A")] },
        rules,
        20,
      ),
    ).toEqual(["#ファンアートタグA", "愛称A"]);
  });
  it("上限で切る", () => {
    const out = suggest(
      { text: "", chips: [], history: [hist("a b c d e")] },
      [],
      3,
    );
    expect(out).toEqual(["a", "b", "c"]);
  });
  it("履歴が空なら規則の分だけ（ダミーを足さない）", () => {
    expect(
      suggest({ text: "メンバーA", chips: [], history: [] }, rules, 20),
    ).toEqual(["#ファンアートタグA", "愛称A"]);
    expect(suggest({ text: "", chips: [], history: [] }, rules, 20)).toEqual(
      [],
    );
  });
});

describe("starters", () => {
  const words: Word[] = [
    { label: { ja: "a", en: "a" }, query: "#a", starter: true },
    { label: { ja: "b", en: "b" }, query: "#b", starter: false },
    { label: { ja: "c", en: "c" }, query: "#c", starter: true },
    { label: { ja: "d", en: "d" }, query: "#d", starter: true },
  ];
  it("履歴が0件のとき、starter だけを元の順で返す", () => {
    expect(starters({ chips: [], history: [] }, words, 60)).toEqual([
      "#a",
      "#c",
      "#d",
    ]);
  });
  it("履歴が1件でもあれば空", () => {
    expect(starters({ chips: [], history: [hist("x")] }, words, 60)).toEqual(
      [],
    );
  });
  it("条件ボタンにあるものを除き、上限で切る", () => {
    expect(starters({ chips: [chip("#a")], history: [] }, words, 1)).toEqual([
      "#c",
    ]);
  });
});
