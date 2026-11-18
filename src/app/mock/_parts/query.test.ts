// MOCK: 破棄予定（#61）。モックの buildQuery に依存するテスト。
// parse → build の往復を lib に移すのは #16（merge.ts）。それまでここに残す。
import { describe, expect, it } from "vitest";
import { normalize, parseToScope } from "@/lib/query/model";
import { EMPTY_DETAIL, type Chip } from "./data";
import { buildQuery, toMockScope } from "./query";

const chip = (id: string, query: string, visible = true): Chip => ({
  id,
  interestId: "hololive",
  label: id,
  query,
  on: false,
  visible,
});

const chips = [
  chip("rt", "-filter:retweets"),
  chip("spoil", "-ネタバレ語A -ネタバレ語B"),
  chip("spoilA", "-ネタバレ語A"),
  chip("faves", "min_faves:50"),
  chip("hidden", "lang:ja", false),
];

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

describe("往復", () => {
  it.each([
    "a -from:x -to:y -@z",
    "a -list:123456",
    '"メンバーA" -filter:retweets -ネタバレ語A -ネタバレ語B since:yesterday',
    "#配信タグA -ネタバレ語A since:2026-11-01 until:2026-11-11",
    "list:1412278227767218179 to:sample_id since:1week_ago",
    "a (表記A OR 表記B) -x from:y @z filter:videos lang:en min_faves:50 foo:bar",
  ])("展開して組み立て直すと、正規化した文字列が一致する（%s）", (q) => {
    const s = toMockScope(parseToScope(q, chips));
    const built = buildQuery({
      word: s.word,
      exact: s.exact,
      chips,
      detail: s.detail,
      period: s.period,
      onlyChipIds: s.onChipIds,
    });
    expect(normalize(built.stored)).toBe(normalize(q));
  });
});
