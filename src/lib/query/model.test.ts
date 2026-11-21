import { describe, expect, it } from "vitest";
import { EMPTY_DETAIL, type GroupItem } from "@/api";
import {
  applyFavEdit,
  chipConds,
  condToken,
  condsToQuery,
  expandRelative,
  favNameFor,
  normalize,
  parseToScope,
  periodToTokens,
  splitPeriod,
  suggestFromRules,
  tokenize,
} from "./model";

const chip = (id: string, query: string, visible = true) => ({
  id,
  query,
  visible,
});

describe("tokenize", () => {
  it("空白で分け、引用符と括弧の中の空白では分けない", () => {
    expect(tokenize('"兎田 ぺこら" (表記A OR 表記B) -filter:retweets')).toEqual(
      ['"兎田 ぺこら"', "(表記A OR 表記B)", "-filter:retweets"],
    );
  });
  it("除外の引用符と入れ子の括弧も1トークン", () => {
    expect(tokenize('-"a b" ((x OR y) z)  w')).toEqual([
      '-"a b"',
      "((x OR y) z)",
      "w",
    ]);
  });
  it("空文字・空白だけなら空配列", () => {
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("normalize", () => {
  it("順序と重複と空白の違いを吸収する", () => {
    expect(normalize("b  a a")).toBe(normalize("a b"));
    expect(normalize("b a")).toBe("a b");
  });
  it("引用符の有無は区別する（完全一致と通常の語は別の検索）", () => {
    expect(normalize('"a"')).not.toBe(normalize("a"));
  });
});

describe("expandRelative（相対期間の記号を実行日で日付にする）", () => {
  it("昨日／3日前／1週間前", () => {
    expect(expandRelative("x since:yesterday", "2026-11-18")).toBe(
      "x since:2026-11-17",
    );
    expect(expandRelative("since:3days_ago", "2026-11-18")).toBe(
      "since:2026-11-15",
    );
    expect(expandRelative("since:1week_ago", "2026-11-18")).toBe(
      "since:2026-11-11",
    );
  });
  it("月またぎ・年またぎ", () => {
    expect(expandRelative("since:yesterday", "2026-03-01")).toBe(
      "since:2026-02-28",
    );
    expect(expandRelative("since:1week_ago", "2027-01-03")).toBe(
      "since:2026-12-27",
    );
  });
  it("年末：元日の昨日は前年の12-31", () => {
    expect(expandRelative("since:yesterday", "2027-01-01")).toBe(
      "since:2026-12-31",
    );
    expect(expandRelative("since:3days_ago", "2027-01-02")).toBe(
      "since:2026-12-30",
    );
  });
  it("月末：30日の月・31日の月をまたぐ", () => {
    expect(expandRelative("since:3days_ago", "2026-12-01")).toBe(
      "since:2026-11-28",
    );
    expect(expandRelative("since:1week_ago", "2026-11-03")).toBe(
      "since:2026-10-27",
    );
  });
  it("うるう年の2月29日をまたぐ", () => {
    expect(expandRelative("since:yesterday", "2028-03-01")).toBe(
      "since:2028-02-29",
    );
    expect(expandRelative("since:1week_ago", "2028-03-03")).toBe(
      "since:2028-02-25",
    );
  });
  it("ほかのトークンと混在しても、記号だけを展開して順序を保つ", () => {
    expect(
      expandRelative('"a b" -filter:retweets since:yesterday c', "2026-11-18"),
    ).toBe('"a b" -filter:retweets since:2026-11-17 c');
  });
  it("until: は展開で変わらない（終了日そのまま）。until:yesterday は記号ではない", () => {
    expect(
      expandRelative("until:2026-11-10 until:yesterday", "2026-11-18"),
    ).toBe("until:2026-11-10 until:yesterday");
  });
  it("記号でないトークンは変えない（日付・未知の記号）", () => {
    expect(
      expandRelative("since:2026-11-01 since:tomorrow", "2026-11-18"),
    ).toBe("since:2026-11-01 since:tomorrow");
  });
});

describe("期間 ⇄ トークン（保存形。until は X と同じく指定日を含む。日本時間で実機確認済み #49）", () => {
  it("相対期間は記号で保存する", () => {
    expect(periodToTokens({ kind: "d1", from: "", to: "" })).toEqual([
      "since:yesterday",
    ]);
  });
  it("終了日はそのまま until にする（翌日にしない）", () => {
    expect(
      periodToTokens({ kind: "date", from: "2026-11-01", to: "2026-11-10" }),
    ).toEqual(["since:2026-11-01", "until:2026-11-10"]);
  });
  it("文字列から期間を取り出す（until は戻さず終了日にする）", () => {
    expect(
      splitPeriod(tokenize("a since:2026-11-01 until:2026-11-10")),
    ).toEqual({
      period: { kind: "date", from: "2026-11-01", to: "2026-11-10" },
      rest: ["a"],
    });
    expect(splitPeriod(tokenize("since:3days_ago a"))).toEqual({
      period: { kind: "d3", from: "", to: "" },
      rest: ["a"],
    });
  });
  it("期間が無ければ none", () => {
    expect(splitPeriod(["a"]).period.kind).toBe("none");
  });
});

describe("条件ボタンの本体（文字列）⇄ 条件の行", () => {
  it("種類を判定し、文字列に戻すと元と同じ", () => {
    const q =
      '-filter:retweets "完全" 通常 -除外 list:123456 min_faves:50 until:2026-11-11 foo:bar';
    const c = chip("k", q);
    expect(chipConds(c).map((x) => x.kind)).toEqual([
      "filter",
      "exact",
      "word",
      "exclude",
      "number",
      "number",
      "date",
      "raw",
    ]);
    expect(condsToQuery(chipConds(c))).toBe(q);
  });
  it("リストの ID は値付き（op: list の数値）として扱い、to: は従来どおりアカウント", () => {
    const [list, to] = chipConds(chip("k", "list:123456 to:abc"));
    expect(list).toMatchObject({ kind: "number", op: "list", value: "123456" });
    expect(to).toMatchObject({ kind: "account", value: "to:abc" });
  });
  it.each([
    ["from:tokino_sora", "from", "tokino_sora"],
    ["-from:tokino_sora", "-from", "tokino_sora"],
    ["@tokino_sora", "mention", "tokino_sora"],
    ["-@tokino_sora", "-mention", "tokino_sora"],
    ["-since:2026-11-07", "-since", "2026-11-07"],
  ])("%s は値付き（%s）で、値は %s", (token, op, value) => {
    const [c] = chipConds(chip("k", token));
    expect(c).toMatchObject({ op, value });
    expect(condsToQuery([c])).toBe(token);
  });
  it("値が空の値付き条件（プリセットの初期値）は、検索には入れず、保存の文字列には演算子を残す", () => {
    for (const stored of [
      "from:",
      "-from:",
      "@",
      "-@",
      "since:",
      "-since:",
      "list:",
    ]) {
      const [c] = chipConds(chip("k", stored));
      expect(c.op).toBeDefined();
      expect(c.value).toBe("");
      expect(condToken(c)).toBe("");
      expect(condsToQuery([c])).toBe(stored);
    }
  });
  it("ユーザー名の形でない値（15字超・記号・@付き）は検索に入れない", () => {
    const [c] = chipConds(chip("k", "from:"));
    for (const value of ["a".repeat(16), "a-b", "@abc", "a b"])
      expect(condToken({ ...c, value })).toBe("");
    expect(condToken({ ...c, value: "a".repeat(15) })).toBe(
      `from:${"a".repeat(15)}`,
    );
  });
  it("-@ は @ より先に判定する（-@abc が mention にならない）", () => {
    expect(chipConds(chip("k", "-@abc"))[0].op).toBe("-mention");
    expect(chipConds(chip("k", "@abc"))[0].op).toBe("mention");
  });
  it("「以前」の日付は、文字列と同じ日を値に持つ", () => {
    const [c] = chipConds(chip("k", "until:2026-11-11"));
    expect(c).toMatchObject({ kind: "date", op: "until", value: "2026-11-11" });
  });
  it("値が不正でも演算子を失わない（空の値を保存しても、ボタンは値付きのまま）", () => {
    const [c] = chipConds(chip("k", "min_faves:50"));
    const q = condsToQuery([{ ...c, value: "" }]);
    expect(q).toBe("min_faves:");
    expect(chipConds(chip("k", q))[0]).toMatchObject({
      kind: "number",
      op: "min_faves",
      value: "",
    });
  });
});

describe("parseToScope（お気に入りを条件ボタンと詳細条件に展開する）", () => {
  const chips = [
    chip("rt", "-filter:retweets"),
    chip("spoil", "-ネタバレ語A -ネタバレ語B"),
    chip("spoilA", "-ネタバレ語A"),
    chip("faves", "min_faves:50"),
    chip("hidden", "lang:ja", false),
  ];

  it("トークンの多いボタンから当て、使ったトークンは他のボタンに使わない", () => {
    const s = parseToScope(
      '"メンバーA" -filter:retweets -ネタバレ語A -ネタバレ語B since:yesterday',
      chips,
    );
    expect(s.word).toBe("メンバーA");
    expect(s.exact).toBe(true);
    expect(s.onChipIds.sort()).toEqual(["rt", "spoil"]);
    expect(s.period.kind).toBe("d1");
    expect(s.detail).toEqual(EMPTY_DETAIL);
  });
  it("値付きのボタンは値まで一致したときだけ ON（違えば詳細条件へ）", () => {
    expect(parseToScope("a min_faves:50", chips).onChipIds).toEqual(["faves"]);
    const s = parseToScope("a min_faves:100", chips);
    expect(s.onChipIds).toEqual([]);
    expect(s.detail.minFaves).toBe("100");
  });
  it("「表示」していないボタンは ON にしない（内容は詳細条件に残す）", () => {
    const s = parseToScope("a lang:ja", chips);
    expect(s.onChipIds).toEqual([]);
    expect(s.detail.lang).toBe("ja");
  });
  it("詳細条件の各欄に振り分け、知らない演算子はテキストで追加へ", () => {
    const s = parseToScope(
      '#タグ "完全" 通常 (表記A OR 表記B) -切り抜き from:a to:b @c list:999999 filter:images -filter:replies min_retweets:3 foo:bar',
      [],
    );
    expect(s.word).toBe("#タグ");
    expect(s.exact).toBe(false);
    expect(s.detail).toMatchObject({
      exact: ["完全"],
      plain: ["通常"],
      variants: ["表記A", "表記B"],
      exclude: ["切り抜き"],
      from: "a",
      to: "b",
      mention: "c",
      list: "999999",
      flt: { images: "inc", replies: "exc" },
      minRt: "3",
      raw: "foo:bar",
    });
  });
  it("同じ欄が2回出たら、2つ目はテキストで追加へ（内容を欠かさない）", () => {
    const s = parseToScope("from:a from:b", []);
    expect(s.word).toBe("");
    expect(s.detail.from).toBe("a");
    expect(s.detail.raw).toBe("from:b");
  });

  it("アカウントの除外（-from: -to: -@）は除外の欄に入り、除外の語には入らない", () => {
    const s = parseToScope("a -from:x -to:y -@z", []);
    expect(s.detail).toMatchObject({
      exFrom: "x",
      exTo: "y",
      exMention: "z",
      exclude: [],
      raw: "",
    });
  });
  it("-list:（X では検索がエラーになる）は除外の欄にも除外の語にも入らず、テキストで追加へ", () => {
    const s = parseToScope("a -list:123456", []);
    expect(s.detail.exclude).toEqual([]);
    expect(s.detail.raw).toBe("-list:123456");
    expect(s.detail).not.toHaveProperty("exList");
  });
  it("アカウントの除外が2回出たら、2つ目はテキストで追加へ", () => {
    const s = parseToScope("a -from:x -from:w", []);
    expect(s.detail.exFrom).toBe("x");
    expect(s.detail.raw).toBe("-from:w");
  });
  // parse → build の往復は merge.test.ts が持つ。
});

describe("applyFavEdit（お気に入りの編集を、いつものエゴサの一致する項目に反映する）", () => {
  const groups: { id: string; name: string; items: GroupItem[] }[] = [
    {
      id: "g1",
      name: "G1",
      items: [
        { query: "b a", engine: "x" },
        { query: "c", engine: "x" },
      ],
    },
    {
      id: "g2",
      name: "G2",
      items: [{ query: "a b", engine: "yahoo" }],
    },
  ];
  it("正規化して一致した項目だけ文字列を変え、件数を返す", () => {
    const r = applyFavEdit(
      groups,
      { query: "a b", engine: "x" },
      { query: "a b d", engine: "both" },
    );
    expect(r.count).toBe(2);
    expect(r.groups[0].items).toEqual([
      { query: "a b d", engine: "both" },
      { query: "c", engine: "x" },
    ]);
    // 検索先は、項目の検索先が編集前のお気に入りと同じときだけ変える
    expect(r.groups[1].items).toEqual([{ query: "a b d", engine: "yahoo" }]);
  });
  it("文字列も検索先も変わらなければ何もしない", () => {
    const r = applyFavEdit(
      groups,
      { query: "a b", engine: "x" },
      { query: "b  a", engine: "x" },
    );
    expect(r.count).toBe(0);
    expect(r.groups).toBe(groups);
  });
  it("一致しない項目は変えない", () => {
    const r = applyFavEdit(
      groups,
      { query: "zzz", engine: "x" },
      { query: "y", engine: "x" },
    );
    expect(r.count).toBe(0);
  });
});

describe("favNameFor（いつものエゴサの項目の表示名）", () => {
  const favs = [
    { name: "先", query: "a b" },
    { name: "後", query: "b a" },
  ];
  it("正規化して一致するお気に入りのうち、並び順で先の名前", () => {
    expect(favNameFor("a  b", favs)).toBe("先");
  });
  it("一致しなければ null", () => {
    expect(favNameFor("c", favs)).toBeNull();
  });
});

describe("suggestFromRules（検索に含まれる語から、関連する条件をサジェストする）", () => {
  const rules = [
    {
      when: ["メンバーA", "愛称A"],
      suggest: ["#ファンアートタグA", "#配信タグA"],
    },
    { when: ["メンバーB"], suggest: ["#ファンアートタグB"] },
  ];
  it("どれか1語を含めば候補を出す（引用符の中も対象）", () => {
    expect(suggestFromRules('"メンバーA" -filter:retweets', rules)).toEqual([
      "#ファンアートタグA",
      "#配信タグA",
    ]);
    expect(suggestFromRules("愛称A", rules)).toEqual([
      "#ファンアートタグA",
      "#配信タグA",
    ]);
  });
  it("すでに検索に入っている条件は出さない", () => {
    expect(suggestFromRules("メンバーA #配信タグA", rules)).toEqual([
      "#ファンアートタグA",
    ]);
  });
  it("どれにも当たらなければ空", () => {
    expect(suggestFromRules("メンバーC", rules)).toEqual([]);
  });
});

describe("suggestFromRules（語単位の一致）", () => {
  const rules = [
    { when: ["Su", "水宮枢"], suggest: ["#枢"] },
    { when: ["Suisei", "星街すいせい"], suggest: ["#すいせい"] },
    { when: ["Tokino Sora", "そらちゃん"], suggest: ["#そら"] },
    { when: ["青"], suggest: ["#青"] },
  ];
  it("短い語は、別の語の一部には当たらない（Su は Suisei・Subaru に当たらない）", () => {
    expect(suggestFromRules("Suisei", rules)).toEqual(["#すいせい"]);
    expect(suggestFromRules("Subaru", rules)).toEqual([]);
    expect(suggestFromRules("Su", rules)).toEqual(["#枢"]);
  });
  it("1文字の語（青）は、単独の語のときだけ当たる", () => {
    expect(suggestFromRules("青", rules)).toEqual(["#青"]);
    expect(suggestFromRules("青空", rules)).toEqual([]);
  });
  it("引用符の中・括弧の OR の中の語にも当たる", () => {
    expect(suggestFromRules('"星街すいせい" a', rules)).toEqual(["#すいせい"]);
    expect(suggestFromRules("(Su OR 配信) a", rules)).toEqual(["#枢"]);
    expect(suggestFromRules('("そらちゃん" OR Sora)', rules)).toEqual([
      "#そら",
    ]);
  });
  it("空白を含む語（Tokino Sora）は、引用符の有無にかかわらず連続した語として当たる", () => {
    expect(suggestFromRules("Tokino Sora", rules)).toEqual(["#そら"]);
    expect(suggestFromRules('"Tokino Sora"', rules)).toEqual(["#そら"]);
    expect(suggestFromRules("Sora Tokino", rules)).toEqual([]);
    expect(suggestFromRules("Tokino", rules)).toEqual([]);
  });
  it("除外した語・演算子の値には当たらない", () => {
    expect(suggestFromRules("-Suisei", rules)).toEqual([]);
    expect(suggestFromRules("from:Suisei", rules)).toEqual([]);
    expect(suggestFromRules("@Suisei", rules)).toEqual([]);
  });
  it("英字の大文字・小文字と全角・半角の違いは区別しない", () => {
    expect(suggestFromRules("suisei", rules)).toEqual(["#すいせい"]);
    expect(suggestFromRules("ＳＵＩＳＥＩ", rules)).toEqual(["#すいせい"]);
  });
});
