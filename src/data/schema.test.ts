import { describe, expect, it } from "vitest";
import { suggestFromRules } from "@/lib/query/model";
import {
  generations,
  interests,
  parseMaster,
  presetsFor,
  suggestRules,
  wordSet,
} from "./index";
import generationsJson from "./generations.json";
import interestsJson from "./interests.json";
import presetsJson from "./presets.json";
import suggestRulesJson from "./suggest-rules.json";
import wordSetJson from "./word-set.json";

const loc = (ja: string, en = ja) => ({ ja, en });

/** 検証に通る最小のマスタ。各テストはここから1か所だけ壊す */
const base = () => ({
  interests: {
    a: {
      label: loc("あ", "A"),
      list: { label: loc("Aから", "From A"), listId: "123" },
    },
    b: { label: loc("び", "B"), list: null },
  },
  presets: [
    {
      interest: "common",
      label: loc("RTを除く", "Exclude reposts"),
      query: "-filter:retweets",
      on: true,
      visible: true,
    },
    { defaultList: true },
    {
      interest: "a",
      label: loc("タグ", "Tag"),
      query: "#a",
      on: false,
      visible: true,
    },
  ] as unknown[],
  suggestRules: {
    a: [{ group: "グループ", when: ["x"], suggest: ["#x"] }],
  } as Record<string, unknown>,
  wordSet: {
    a: [
      {
        name: loc("グループ", "Group"),
        gens: [] as string[],
        words: [{ label: loc("w"), query: "w" }],
      },
    ],
  } as Record<string, unknown>,
  generations: [{ name: loc("1期生", "Gen 1") }] as unknown[],
});

const group = (...queries: string[]) => ({
  name: loc("g"),
  gens: [] as string[],
  words: queries.map((q) => ({ label: loc(q), query: q })),
});

describe("実データ", () => {
  it("検証に通る", () => {
    expect(() =>
      parseMaster({
        interests: interestsJson,
        presets: presetsJson,
        suggestRules: suggestRulesJson,
        wordSet: wordSetJson,
        generations: generationsJson,
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

  it("プリセットは、既定リストが先頭（その他は無し）で、ラベルは日本語・英語がそろい、初期 ON は無い", () => {
    for (const id of interests().keys()) {
      const list = presetsFor(id);
      expect(list.length).toBeGreaterThan(0);
      for (const p of list) {
        expect(p.label.ja).not.toBe("");
        expect(p.label.en).not.toBe("");
        expect(p.on).toBe(false);
      }
      const def = interests().get(id)?.list;
      if (def) {
        expect(list[0]).toEqual({
          label: def.label,
          query: `list:${def.listId}`,
          on: false,
          visible: true,
        });
      } else {
        expect(
          list[0].query.startsWith("list:") && list[0].query.length > 5,
        ).toBe(false);
      }
    }
  });

  it("値付きのプリセット（値が空の初期値）が、共通として全対象に入っている", () => {
    for (const id of interests().keys()) {
      const queries = presetsFor(id).map((p) => p.query);
      for (const q of [
        "@",
        "-@",
        "from:",
        "-from:",
        "since:",
        "-since:",
        "list:",
      ])
        expect(queries, `${id} の ${q}`).toContain(q);
    }
    expect(presetsFor("hololive").find((p) => p.query === "@")?.label).toEqual({
      ja: "メンション @",
      en: "Mention @",
    });
  });

  it("値付きのプリセットのラベルに、画面が出す [値] を含めない（ラベルは [ より前だけ）", () => {
    for (const id of interests().keys())
      for (const p of presetsFor(id)) {
        expect(p.label.ja).not.toContain("[");
        expect(p.label.en).not.toContain("[");
      }
  });

  it("検索ワード集は、共通のグループが先で、対象のグループが続き、共通の語に空の値付き条件は無い", () => {
    const groups = wordSet("hololive");
    expect(groups[0].name).toEqual({ ja: "共通", en: "Common" });
    expect(groups.length).toBeGreaterThan(1);
    for (const g of groups)
      for (const w of g.words) {
        expect(w.query).not.toBe("-");
        expect(w.query).not.toMatch(/\[X+\]/i);
        expect(w.label.ja).not.toBe("");
        expect(w.label.en).not.toBe("");
      }
    // 共通は、別の対象にも同じものが出る
    expect(wordSet("nijisanji")[0].name.ja).toBe("共通");
  });

  it("実データの配信者グループは、期の一覧にある期を1つ以上持つ。共通は持たない", () => {
    const names = generations().map((g) => g.name.ja);
    const members = wordSet("hololive").filter((g) => g.name.ja !== "共通");
    expect(members.length).toBeGreaterThan(0);
    for (const g of members) {
      expect(g.gens.length).toBeGreaterThan(0);
      for (const n of g.gens) expect(names).toContain(n);
    }
    expect(wordSet("hololive")[0].gens).toEqual([]);
  });

  it("サジェスト規則の出す条件は、すべてその対象の検索ワード集にある検索文字列", () => {
    for (const id of interests().keys()) {
      const queries = new Set(
        wordSet(id).flatMap((g) => g.words.map((w) => w.query)),
      );
      for (const r of suggestRules(id))
        for (const s of r.suggest)
          expect(queries.has(s), `${id}/${r.group}: ${s}`).toBe(true);
    }
  });

  it("ときのそらの規則：呼び名を入れると、そのグループの検索ワードが全部出る", () => {
    const rules = suggestRules("hololive");
    const sora = rules.find((r) => r.group === "ときのそら");
    expect(sora).toBeDefined();
    expect(sora?.when).toEqual(
      expect.arrayContaining(["ときのそら", "そらちゃん", "Tokino Sora"]),
    );
    const group = wordSet("hololive").find((g) => g.name.ja === "ときのそら");
    expect(sora?.suggest).toEqual([
      ...new Set(group?.words.map((w) => w.query)),
    ]);
    expect(suggestFromRules("そらちゃん", rules)).toEqual(sora?.suggest);
  });

  it("短い呼び名は語単位でしか当たらない（水宮枢の Su は Suisei で出ない）", () => {
    const rules = suggestRules("hololive");
    const su = rules.find((r) => r.group === "水宮枢");
    expect(su?.when).toContain("Su");
    const out = suggestFromRules("Suisei", rules);
    for (const s of su?.suggest ?? [])
      if (!rules.some((r) => r.group !== "水宮枢" && r.suggest.includes(s)))
        expect(out).not.toContain(s);
  });

  it("対象のグループもサジェスト規則も無い対象は、共通のグループだけ・規則は空を返す", () => {
    expect(wordSet("no-such-interest").map((g) => g.name.ja)).toEqual(["共通"]);
    expect(suggestRules("no-such-interest")).toEqual([]);
  });
});

describe("parseMaster の正常系", () => {
  it("最小のマスタが通る", () => {
    expect(() => parseMaster(base())).not.toThrow();
  });

  it("対象を1件足すだけで、共通のプリセットが付き、検索ワード集・サジェストは空になる", () => {
    const m = parseMaster(base());
    expect(m.interests.b).toBeDefined();
    // b は共通の RT を除くだけ（既定リストなし・a 専用のタグなし）
    expect(presetsFor("b", m).map((p) => p.label.ja)).toEqual(["RTを除く"]);
    expect(wordSet("b", m)).toEqual([]);
    expect(suggestRules("b", m)).toEqual([]);
  });

  it("期：名前の重複・一覧に無い期・共通への期の指定は、検証で止める", () => {
    const dup = base();
    dup.generations = [{ name: loc("1期生") }, { name: loc("1期生") }];
    expect(() => parseMaster(dup)).toThrow(/重複/);

    const ghost = base();
    ghost.wordSet = { a: [{ ...group("w"), gens: ["9期生"] }] };
    expect(() => parseMaster(ghost)).toThrow(/9期生/);

    const common = base();
    common.wordSet = { common: [{ ...group("w"), gens: ["1期生"] }] };
    expect(() => parseMaster(common)).toThrow(/共通/);

    const ok = base();
    ok.wordSet = { a: [{ ...group("w"), gens: ["1期生"] }] };
    expect(() => parseMaster(ok)).not.toThrow();
  });

  it("共通の検索ワードは、どの対象にも先頭に出る", () => {
    const m = parseMaster({
      ...base(),
      wordSet: { common: [group("c")], a: [group("w")] },
    });
    expect(wordSet("a", m).map((g) => g.words[0].query)).toEqual(["c", "w"]);
    expect(wordSet("b", m).map((g) => g.words[0].query)).toEqual(["c"]);
  });

  it("同じ query が、同じグループ・別グループ・同じ対象内にあっても通る（ファンネーム・グループ名は共通の語）", () => {
    const m = base();
    m.wordSet = { a: [group("same", "same"), group("same")] };
    expect(() => parseMaster(m)).not.toThrow();
  });

  it("サジェスト規則は、対象ごとに返す", () => {
    const m = parseMaster(base());
    expect(suggestRules("a", m)).toEqual([
      { group: "グループ", when: ["x"], suggest: ["#x"] },
    ]);
  });
});

describe("parseMaster の異常系", () => {
  it("グループ名の英語が空だと失敗する", () => {
    const m = base();
    m.wordSet = {
      a: [{ ...group("w"), name: { ja: "グループ", en: "" } }],
    };
    expect(() => parseMaster(m)).toThrow();
  });

  it("グループ名の日本語が空だと失敗する", () => {
    const m = base();
    m.wordSet = { a: [{ ...group("w"), name: { ja: "", en: "G" } }] };
    expect(() => parseMaster(m)).toThrow();
  });

  it("ワードの表示名（英語）が空だと失敗する", () => {
    const m = base();
    m.wordSet = {
      a: [
        {
          name: loc("g"),
          words: [{ label: { ja: "w", en: "" }, query: "w" }],
        },
      ],
    };
    expect(() => parseMaster(m)).toThrow();
  });

  it("ワードが0件のグループは失敗する", () => {
    const m = base();
    m.wordSet = { a: [{ name: loc("g"), words: [] }] };
    expect(() => parseMaster(m)).toThrow();
  });

  it("ワードの query が空だと失敗する", () => {
    const m = base();
    m.wordSet = {
      a: [
        {
          name: loc("g"),
          words: [{ label: loc("w"), query: "" }],
        },
      ],
    };
    expect(() => parseMaster(m)).toThrow();
  });

  it("検索ワード集のキーが、存在しない対象だと失敗する（common は可）", () => {
    const m = base();
    m.wordSet = { ghost: [group("w")] };
    expect(() => parseMaster(m)).toThrow(/ghost/);
  });

  it("サジェスト規則のキーが、存在しない対象だと失敗する", () => {
    const m = base();
    m.suggestRules = { ghost: [{ group: "g", when: ["x"], suggest: ["#x"] }] };
    expect(() => parseMaster(m)).toThrow(/ghost/);
  });

  it("サジェスト規則の when が空配列だと失敗する", () => {
    const m = base();
    m.suggestRules = { a: [{ group: "g", when: [], suggest: ["#x"] }] };
    expect(() => parseMaster(m)).toThrow();
  });

  it("サジェスト規則の suggest が空配列だと失敗する", () => {
    const m = base();
    m.suggestRules = { a: [{ group: "g", when: ["x"], suggest: [] }] };
    expect(() => parseMaster(m)).toThrow();
  });

  it("プリセットの対象が、存在しない対象だと失敗する", () => {
    const m = base();
    m.presets.push({
      interest: "ghost",
      label: loc("x"),
      query: "x",
      on: false,
      visible: true,
    });
    expect(() => parseMaster(m)).toThrow(/ghost/);
  });

  it("対象の ID に予約語 common は使えない", () => {
    const m = base();
    (m.interests as Record<string, unknown>).common = {
      label: loc("共", "C"),
      list: null,
    };
    expect(() => parseMaster(m)).toThrow();
  });

  it("対象の表示名（英語）が空だと失敗する", () => {
    const m = base();
    m.interests.a.label.en = "";
    expect(() => parseMaster(m)).toThrow();
  });

  it("既定リストの名前（英語）が空だと失敗する", () => {
    const m = base();
    m.interests.a.list.label.en = "";
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

  it("プリセットのラベルが20字を超えると、日本語でも英語でも失敗する（21字）", () => {
    for (const label of [
      { ja: "あ".repeat(21), en: "x" },
      { ja: "あ", en: "x".repeat(21) },
    ]) {
      const m = base();
      m.presets.push({
        interest: "common",
        label,
        query: "z",
        on: false,
        visible: true,
      });
      expect(() => parseMaster(m)).toThrow();
    }
  });

  it("プリセットのラベルが20字ちょうどなら通る", () => {
    const m = base();
    m.presets.push({
      interest: "common",
      label: loc("あ".repeat(20), "x".repeat(20)),
      query: "z",
      on: false,
      visible: true,
    });
    expect(() => parseMaster(m)).not.toThrow();
  });

  it("プリセットのラベルが文字列（言語の別が無い）だと失敗する", () => {
    const m = base();
    m.presets.push({
      interest: "common",
      label: "x",
      query: "x",
      on: false,
      visible: true,
    });
    expect(() => parseMaster(m)).toThrow();
  });

  it("プリセットの query が空だと失敗する", () => {
    const m = base();
    m.presets.push({
      interest: "common",
      label: loc("x"),
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
      label: loc("1"),
      query: "p q",
      on: false,
      visible: true,
    });
    m.presets.push({
      interest: "a",
      label: loc("2"),
      query: "q p",
      on: false,
      visible: true,
    });
    expect(() => parseMaster(m)).toThrow(/重複/);
  });
});
