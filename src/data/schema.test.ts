import { describe, expect, it } from "vitest";
import { LIMITS } from "@/api";
import { normalize } from "@/lib/query/model";
import {
  interests,
  parseMaster,
  presetsFor,
  suggestRules,
  wordSet,
} from "./index";
import interestsJson from "./interests.json";
import presetsJson from "./presets.json";
import suggestRulesJson from "./suggest-rules.json";
import wordSetJson from "./word-set.json";

/** 検証に通る最小のマスタ。各テストはここから1か所だけ壊す */
const base = () => ({
  interests: {
    a: {
      label: { ja: "あ", en: "A" },
      list: { label: "Aから", listId: "123" },
    },
    b: { label: { ja: "び", en: "B" }, list: null },
  },
  presets: [
    {
      interest: "common",
      label: "RTを除く",
      query: "-filter:retweets",
      on: true,
      visible: true,
    },
    { defaultList: true },
    { interest: "a", label: "タグ", query: "#a", on: false, visible: true },
  ] as unknown[],
  suggestRules: [{ when: ["x"], suggest: ["#x"] }],
  wordSet: {
    a: [
      {
        name: { ja: "グループ", en: "Group" },
        words: [{ label: "w", query: "w", starter: true }],
      },
    ],
  } as Record<string, unknown>,
});

describe("実データ", () => {
  it("検証に通る", () => {
    expect(() =>
      parseMaster({
        interests: interestsJson,
        presets: presetsJson,
        suggestRules: suggestRulesJson,
        wordSet: wordSetJson,
      }),
    ).not.toThrow();
  });

  it("興味の対象は JSON の並びで、その他にはリストが無い", () => {
    expect([...interests().keys()]).toEqual(["hololive", "nijisanji", "other"]);
    expect(interests().get("hololive")?.label).toEqual({
      ja: "ホロライブ",
      en: "hololive",
    });
    expect(interests().get("other")?.list).toBeNull();
  });

  it("プリセットの並びは、共通と対象別が交互になり、既定リストは RT の直後に入る", () => {
    const labels = (id: string) => presetsFor(id).map((p) => p.label);
    expect(labels("hololive")).toEqual([
      "RTを除く",
      "ホロメンから",
      "ネタバレ除外",
      "ファボ",
      "日付",
      "画像つき",
      "返信のみ",
      "配信タグ",
      "ファンアート",
      "切り抜き",
      "日本語のみ",
      "リンクなし",
    ]);
    expect(labels("nijisanji")).toEqual([
      "RTを除く",
      "にじさんじから",
      "ファボ",
      "日付",
      "画像つき",
      "返信のみ",
      "日本語のみ",
      "リンクなし",
    ]);
    expect(labels("other")).toEqual([
      "RTを除く",
      "ファボ",
      "日付",
      "画像つき",
      "返信のみ",
      "日本語のみ",
      "リンクなし",
    ]);
  });

  it("既定リストのプリセットは list:<ID> で、初期は OFF・表示", () => {
    expect(presetsFor("hololive")[1]).toEqual({
      label: "ホロメンから",
      query: "list:1412278227767218179",
      on: false,
      visible: true,
    });
  });

  it("初期 ON は無し（条件ボタンはすべて OFF から始まる）、リンクなしは非表示", () => {
    const on = (id: string) =>
      presetsFor(id)
        .filter((p) => p.on)
        .map((p) => p.label);
    expect(on("hololive")).toEqual([]);
    expect(on("other")).toEqual([]);
    expect(
      presetsFor("other").find((p) => p.label === "リンクなし")?.visible,
    ).toBe(false);
  });

  it("検索ワード集は各対象に8グループ・200件で、ホームに出す印は60件", () => {
    for (const id of ["hololive", "nijisanji", "other"]) {
      const groups = wordSet(id);
      expect(groups).toHaveLength(8);
      const words = groups.flatMap((g) => g.words);
      expect(words).toHaveLength(200);
      expect(words.filter((w) => w.starter)).toHaveLength(
        LIMITS.wordSetStarter,
      );
    }
    expect(wordSet("hololive")[0].name).toEqual({
      ja: "チャンネルA",
      en: "Channel A",
    });
  });

  it("サジェストの規則を返す", () => {
    expect(suggestRules()[0]).toEqual({
      when: ["メンバーA", "愛称A"],
      suggest: ["#ファンアートタグA", "#配信タグA", "愛称A"],
    });
  });

  it("検索ワード集が無い対象は空配列を返す", () => {
    expect(wordSet("no-such-interest")).toEqual([]);
  });
});

describe("parseMaster の正常系", () => {
  it("最小のマスタが通る", () => {
    expect(() => parseMaster(base())).not.toThrow();
  });

  it("対象を1件足すだけで、共通のプリセットが付き、検索ワード集は空になる", () => {
    const m = parseMaster(base());
    expect(m.interests.b).toBeDefined();
    // b は共通の RT を除くだけ（既定リストなし・a 専用のタグなし）
    expect(presetsFor("b", m).map((p) => p.label)).toEqual(["RTを除く"]);
    expect(wordSet("b", m)).toEqual([]);
  });

  it("starter が1件も無い、または60件を超えても通る（件数は検証しない）", () => {
    const none = base();
    none.wordSet = {
      a: [
        {
          name: { ja: "g", en: "g" },
          words: [{ label: "w", query: "w", starter: false }],
        },
      ],
    };
    expect(() => parseMaster(none)).not.toThrow();

    const many = base();
    many.wordSet = {
      a: [
        {
          name: { ja: "g", en: "g" },
          words: Array.from({ length: LIMITS.wordSetStarter + 5 }, (_, i) => ({
            label: `w${i}`,
            query: `w${i}`,
            starter: true,
          })),
        },
      ],
    };
    expect(() => parseMaster(many)).not.toThrow();
  });
});

describe("parseMaster の異常系", () => {
  it("グループ名の英語が空だと失敗する", () => {
    const m = base();
    m.wordSet = {
      a: [
        {
          name: { ja: "グループ", en: "" },
          words: [{ label: "w", query: "w", starter: false }],
        },
      ],
    };
    expect(() => parseMaster(m)).toThrow();
  });

  it("グループ名の日本語が空だと失敗する", () => {
    const m = base();
    m.wordSet = {
      a: [
        {
          name: { ja: "", en: "G" },
          words: [{ label: "w", query: "w", starter: false }],
        },
      ],
    };
    expect(() => parseMaster(m)).toThrow();
  });

  it("ワードが0件のグループは失敗する", () => {
    const m = base();
    m.wordSet = { a: [{ name: { ja: "g", en: "g" }, words: [] }] };
    expect(() => parseMaster(m)).toThrow();
  });

  it("ワードの query が空だと失敗する", () => {
    const m = base();
    m.wordSet = {
      a: [
        {
          name: { ja: "g", en: "g" },
          words: [{ label: "w", query: "", starter: false }],
        },
      ],
    };
    expect(() => parseMaster(m)).toThrow();
  });

  it("同じグループ内で query が重複すると失敗する", () => {
    const m = base();
    m.wordSet = {
      a: [
        {
          name: { ja: "g", en: "g" },
          words: [
            { label: "1", query: "w", starter: false },
            { label: "2", query: "w", starter: false },
          ],
        },
      ],
    };
    expect(() => parseMaster(m)).toThrow(/重複/);
  });

  it("別グループでも、正規化すると同じ query（語順違い）なら失敗する", () => {
    const m = base();
    expect(normalize("a b")).toBe(normalize("b a"));
    m.wordSet = {
      a: [
        {
          name: { ja: "g1", en: "g1" },
          words: [{ label: "1", query: "a b", starter: false }],
        },
        {
          name: { ja: "g2", en: "g2" },
          words: [{ label: "2", query: "b a", starter: false }],
        },
      ],
    };
    expect(() => parseMaster(m)).toThrow(/重複/);
  });

  it("対象が違えば、同じ query があっても通る", () => {
    const m = base();
    const g = [
      {
        name: { ja: "g", en: "g" },
        words: [{ label: "w", query: "same", starter: false }],
      },
    ];
    m.wordSet = { a: g, b: g };
    expect(() => parseMaster(m)).not.toThrow();
  });

  it("検索ワード集のキーが、存在しない対象だと失敗する", () => {
    const m = base();
    m.wordSet = {
      ghost: [
        {
          name: { ja: "g", en: "g" },
          words: [{ label: "w", query: "w", starter: false }],
        },
      ],
    };
    expect(() => parseMaster(m)).toThrow(/ghost/);
  });

  it("プリセットの対象が、存在しない対象だと失敗する", () => {
    const m = base();
    m.presets.push({
      interest: "ghost",
      label: "x",
      query: "x",
      on: false,
      visible: true,
    });
    expect(() => parseMaster(m)).toThrow(/ghost/);
  });

  it("対象の ID に予約語 common は使えない", () => {
    const m = base();
    (m.interests as Record<string, unknown>).common = {
      label: { ja: "共", en: "C" },
      list: null,
    };
    expect(() => parseMaster(m)).toThrow();
  });

  it("対象の表示名（英語）が空だと失敗する", () => {
    const m = base();
    m.interests.a.label.en = "";
    expect(() => parseMaster(m)).toThrow();
  });

  it("リスト ID が数字でないと失敗する", () => {
    const m = base();
    m.interests.a.list.listId = "abc";
    expect(() => parseMaster(m)).toThrow();
  });

  it("既定リストの目印が2つあると失敗する", () => {
    const m = base();
    m.presets.push({ defaultList: true });
    expect(() => parseMaster(m)).toThrow(/既定リスト/);
  });

  it("プリセットのラベルが20字を超えると失敗する（21字）", () => {
    const m = base();
    m.presets.push({
      interest: "common",
      label: "あ".repeat(21),
      query: "z",
      on: false,
      visible: true,
    });
    expect(() => parseMaster(m)).toThrow();
  });

  it("プリセットのラベルが20字ちょうどなら通る", () => {
    const m = base();
    m.presets.push({
      interest: "common",
      label: "あ".repeat(20),
      query: "z",
      on: false,
      visible: true,
    });
    expect(() => parseMaster(m)).not.toThrow();
  });

  it("プリセットの query が空だと失敗する", () => {
    const m = base();
    m.presets.push({
      interest: "common",
      label: "x",
      query: "",
      on: false,
      visible: true,
    });
    expect(() => parseMaster(m)).toThrow();
  });

  it("ある対象で、プリセットの query が正規化して重複すると失敗する", () => {
    const m = base();
    m.presets.push({
      interest: "common",
      label: "1",
      query: "p q",
      on: false,
      visible: true,
    });
    m.presets.push({
      interest: "a",
      label: "2",
      query: "q p",
      on: false,
      visible: true,
    });
    expect(() => parseMaster(m)).toThrow(/重複/);
  });

  it("サジェスト規則の when が空配列だと失敗する", () => {
    const m = base();
    m.suggestRules = [{ when: [], suggest: ["#x"] }];
    expect(() => parseMaster(m)).toThrow();
  });

  it("サジェスト規則の suggest が空配列だと失敗する", () => {
    const m = base();
    m.suggestRules = [{ when: ["x"], suggest: [] }];
    expect(() => parseMaster(m)).toThrow();
  });
});
