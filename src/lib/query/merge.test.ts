import { describe, expect, it } from "vitest";
import { EMPTY_DETAIL, EMPTY_PERIOD, LIMITS } from "@/api";
import type { Chip, Detail, Period, SearchState } from "@/api";
import { buildQuery } from "./merge";
import { normalize, parseToScope } from "./model";

const TODAY = "2026-11-18";

const chip = (id: string, query: string, extra: Partial<Chip> = {}): Chip => ({
  id,
  interestId: "hololive",
  label: `ラベル${id}`,
  query,
  on: false,
  visible: true,
  isPreset: false,
  order: 0,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  deletedAt: null,
  ...extra,
});

const state = (s: Partial<SearchState> = {}): SearchState => ({
  word: "",
  exact: false,
  onChipIds: [],
  suggestionTokens: [],
  detail: EMPTY_DETAIL,
  period: EMPTY_PERIOD,
  ...s,
});
const detail = (d: Partial<Detail>): Detail => ({ ...EMPTY_DETAIL, ...d });
const date = (from: string, to: string): Period => ({
  kind: "date",
  from,
  to,
});
const build = (s: Partial<SearchState>, chips: Chip[] = []) =>
  buildQuery(state(s), chips, TODAY);
const codes = (xs: { code: string }[]) => xs.map((x) => x.code);

const chips = [
  chip("rt", "-filter:retweets"),
  chip("spoil", "-ネタバレ語A -ネタバレ語B"),
  chip("faves", "min_faves:50"),
  chip("since", "since:2026-11-01"),
  chip("hidden", "lang:ja", { visible: false }),
];

describe("条件ボタンの合成", () => {
  it("onChipIds にあり、表示のボタンだけを入れる（非表示は除く）", () => {
    const r = build({ word: "a", onChipIds: ["rt", "hidden"] }, chips);
    expect(r.stored).toBe("a -filter:retweets");
  });
  it("chip.on が true でも onChipIds に無ければ入れない", () => {
    const cs = [chip("rt", "-filter:retweets", { on: true })];
    expect(build({ word: "a" }, cs).stored).toBe("a");
  });
  it("disabledConds の1項目だけを除き、同じボタンの他の項目は残す", () => {
    const r = build(
      {
        word: "a",
        onChipIds: ["spoil"],
        detail: detail({ disabledConds: ["spoil::-ネタバレ語B"] }),
      },
      chips,
    );
    expect(r.stored).toBe("a -ネタバレ語A");
  });
  it("値が不正な値付きの条件（min_faves:0）は検索に入れない", () => {
    const cs = [chip("bad", "min_faves:0")];
    expect(build({ word: "a", onChipIds: ["bad"] }, cs).stored).toBe("a");
  });
});

describe("期間と日付の条件ボタン", () => {
  it("期間を指定中は日付の条件を除き、ラベル付きの警告を出す。他の条件は残す", () => {
    const r = build(
      {
        word: "a",
        onChipIds: ["since", "rt"],
        period: { ...EMPTY_PERIOD, kind: "d1" },
      },
      chips,
    );
    expect(r.stored).toBe("a -filter:retweets since:yesterday");
    expect(r.warnings).toContainEqual({
      code: "period.overridesDateChip",
      params: { label: "ラベルsince" },
    });
  });
  it("期間が無ければ日付の条件は入り、警告も出ない", () => {
    const r = build({ word: "a", onChipIds: ["since"] }, chips);
    expect(r.stored).toBe("a since:2026-11-01");
    expect(codes(r.warnings)).not.toContain("period.overridesDateChip");
  });
});

describe("並びと書式", () => {
  it("検索語 → 条件ボタン → 詳細条件 → サジェスト → 期間 の順に並べる", () => {
    const r = build(
      {
        word: "a",
        onChipIds: ["rt"],
        detail: detail({ minFaves: "100" }),
        suggestionTokens: ["#tag"],
        period: date("2026-11-01", "2026-11-10"),
      },
      chips,
    );
    expect(r.stored).toBe(
      "a -filter:retweets min_faves:100 #tag since:2026-11-01 until:2026-11-10",
    );
  });
  it("完全一致は引用符で囲む。空の検索語は入れない", () => {
    expect(build({ word: "兎田 ぺこら", exact: true }).stored).toBe(
      '"兎田 ぺこら"',
    );
    expect(build({ word: "  ", onChipIds: [] }).stored).toBe("");
  });
  it("詳細条件の各欄を決まった順で出す", () => {
    const r = build({
      detail: detail({
        exact: ["x y"],
        plain: ["p"],
        variants: ["A", "B"],
        exclude: ["z"],
        from: "f",
        to: "t",
        mention: "@m",
        list: "123456",
        exFrom: "ef",
        exTo: "et",
        exMention: "@em",
        flt: { ...EMPTY_DETAIL.flt, images: "inc", retweets: "exc" },
        lang: "ja",
        minFaves: "1",
        minRt: "2",
        minReplies: "3",
      }),
    });
    expect(r.stored).toBe(
      '"x y" p (A OR B) -z from:f to:t @m list:123456 -from:ef -to:et -@em -filter:retweets filter:images lang:ja min_faves:1 min_retweets:2 min_replies:3',
    );
  });
  it("「テキストで追加」は、引用符・括弧の中の空白で割らない", () => {
    const r = build({ detail: detail({ raw: '"a b" (c OR d) foo:bar' }) });
    expect(r.stored).toBe('"a b" (c OR d) foo:bar');
  });
});

describe("相対期間", () => {
  it("stored は記号のまま、text は today から数えた日付に展開する", () => {
    const r = build({ word: "a", period: { ...EMPTY_PERIOD, kind: "d3" } });
    expect(r.stored).toBe("a since:3days_ago");
    expect(r.text).toBe("a since:2026-11-15");
  });
  it("until: は終了日をそのまま出す（翌日へ変換しない）", () => {
    const r = build({ word: "a", period: date("", "2026-11-10") });
    expect(r.stored).toBe("a until:2026-11-10");
    expect(r.text).toBe("a until:2026-11-10");
  });
});

describe("相対期間（年末の境界）", () => {
  it("元日に［昨日から］なら、前年の12-31に展開する", () => {
    const r = buildQuery(
      state({ word: "a", period: { ...EMPTY_PERIOD, kind: "d1" } }),
      [],
      "2027-01-01",
    );
    expect(r.stored).toBe("a since:yesterday");
    expect(r.text).toBe("a since:2026-12-31");
  });
});

describe("Yahoo!リアルタイム検索への変換の警告", () => {
  it("使えない演算子を警告する", () => {
    const r = build({
      word: "a",
      detail: detail({ list: "123456", exFrom: "x" }),
    });
    expect(codes(r.warnings)).toEqual([
      "yahoo.listUnsupported",
      "yahoo.accountExcludeUnsupported",
    ]);
  });
  it("相対期間（since:yesterday）を含んでも rawUnverified は出ない", () => {
    const r = build({ word: "a", period: { ...EMPTY_PERIOD, kind: "d1" } });
    expect(r.warnings).toEqual([]);
  });
});

describe("長さの警告", () => {
  const withLen = (n: number) => build({ word: "a".repeat(n) });
  it("urlWarn ちょうどでは警告せず、1文字超えると警告する", () => {
    expect(codes(withLen(LIMITS.urlWarn).warnings)).not.toContain(
      "query.tooLong",
    );
    expect(withLen(LIMITS.urlWarn + 1).warnings).toContainEqual({
      code: "query.tooLong",
      params: { length: LIMITS.urlWarn + 1, limit: LIMITS.urlWarn },
    });
  });
});

describe("止める理由", () => {
  it("検索が空のとき query.empty", () => {
    expect(codes(build({}).blockers)).toEqual(["query.empty"]);
  });
  it("条件か期間が1つでもあれば空ではない", () => {
    expect(build({ onChipIds: ["rt"] }, chips).blockers).toEqual([]);
  });
  it("開始日が終了日より後なら period.inverted。同じ日は止めない", () => {
    expect(
      codes(
        build({ word: "a", period: date("2026-11-10", "2026-11-09") }).blockers,
      ),
    ).toEqual(["period.inverted"]);
    expect(
      build({ word: "a", period: date("2026-11-10", "2026-11-10") }).blockers,
    ).toEqual([]);
  });
});

describe("往復（文字列 → 展開 → 組み立て → 正規化が一致）", () => {
  it.each([
    "a -from:x -to:y -@z",
    "a -list:123456",
    '"メンバーA" -filter:retweets -ネタバレ語A -ネタバレ語B since:yesterday',
    "#配信タグA -ネタバレ語A since:2026-11-01 until:2026-11-11",
    "list:1412278227767218179 to:sample_id since:1week_ago",
    "a (表記A OR 表記B) -x from:y @z filter:videos lang:en min_faves:50 foo:bar",
  ])("%s", (q) => {
    const rt = [
      chip("rt", "-filter:retweets"),
      chip("spoil", "-ネタバレ語A -ネタバレ語B"),
      chip("spoilA", "-ネタバレ語A"),
      chip("faves", "min_faves:50"),
      chip("hidden", "lang:ja", { visible: false }),
    ];
    const s = parseToScope(q, rt);
    const built = buildQuery(
      state({
        word: s.word,
        exact: s.exact,
        onChipIds: s.onChipIds,
        detail: s.detail,
        period: s.period,
      }),
      rt,
      TODAY,
    );
    expect(normalize(built.stored)).toBe(normalize(q));
  });
});
