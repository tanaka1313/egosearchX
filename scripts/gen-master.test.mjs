import { describe, expect, it } from "vitest";
import { readWorkbook, rowsOf } from "./gen-master.mjs";
import { reviewRows } from "./gen-suggest-review.mjs";
import {
  GenError,
  buildMaster,
  cellBool,
  cellText,
  isConfirmed,
  makeTranslator,
  presetLabelAndQuery,
} from "./lib/master-from-rows.mjs";

const ok = "〇";
const interests = [
  ["a", "あ", "A", "Aから", "123"],
  ["b", "び", "B", "", ""],
];
const dict = [
  ["共通", "Common"],
  ["Aから", "From A"],
  ["返信のみ", "Replies only"],
  ["ファボ", "Likes"],
  ["件以上", "or more"],
  ["エゴサワード", "Ego words"],
  ["ファンネーム", "Fan name"],
];

/** 最小の入力。テストごとに1か所だけ変える */
const rows = (over = {}) => ({
  interests,
  presets: [["共通", "返信のみ", "filter:replies", "FALSE", "TRUE", ok]],
  groups: [["a", "メンバー", "Member", ok]],
  words: [
    [
      "a",
      "メンバー",
      "エゴサワード(メンバー)",
      '("めんば" OR "Mem")',
      "TRUE",
      ok,
    ],
    ["a", "メンバー", "めんばー(ファンネーム)", "めんばー", "TRUE", ok],
  ],
  dict,
  ...over,
});

describe("Excel の読み取り（実際のファイル）", () => {
  it("セルのふりがなを読まない（「共通」が「共通キョウツウ」にならない）", async () => {
    const wb = await readWorkbook();
    const ws = wb.getWorksheet("検索ワード集");
    expect(cellText(ws.getCell("A2").value)).toBe("共通");
    expect(cellText(wb.getWorksheet("プリセット").getCell("B6").value)).toBe(
      "メンション除外 -@[XXX]",
    );
  });

  it("実データから JSON を作れ、ときのそらの規則と共通の語が入る", async () => {
    const { files, report } = buildMaster(rowsOf(await readWorkbook()));
    const sora = files.suggestRules.hololive.find(
      (r) => r.group === "ときのそら",
    );
    expect(sora.when).toEqual([
      "ときのそら",
      "そらちゃん",
      "そらさん",
      "そら先輩",
      "Tokino Sora",
      "Sora-chan",
    ]);
    expect(sora.suggest).toHaveLength(7);
    expect(files.wordSet.common[0].name).toEqual({ ja: "共通", en: "Common" });
    expect(files.presets[0]).toEqual({ defaultList: true });
    // 「-」だけの検索文字列と、値の入力欄が要る行は入れない
    expect(report.skipped.some((s) => s.includes("「-」"))).toBe(true);
    const all = Object.values(files.wordSet).flatMap((gs) =>
      gs.flatMap((g) => g.words),
    );
    expect(all.some((w) => w.query === "-")).toBe(false);
  });

  it("「ホームに出す」は、真偽値のセルと TRUE／FALSE の文字列のどちらも読む", async () => {
    const { files } = buildMaster(rowsOf(await readWorkbook()));
    const hololive = files.wordSet.hololive.flatMap((g) => g.words);
    expect(hololive.every((w) => typeof w.starter === "boolean")).toBe(true);
    expect(hololive.some((w) => w.starter)).toBe(true);
  });
});

describe("cellBool／isConfirmed", () => {
  it("0／1・真偽値・TRUE／FALSE を読み、空は既定値、それ以外は止める", () => {
    expect(cellBool(1, false)).toBe(true);
    expect(cellBool(0, true)).toBe(false);
    expect(cellBool(true, false)).toBe(true);
    expect(cellBool("TRUE", false)).toBe(true);
    expect(cellBool("false", true)).toBe(false);
    expect(cellBool(null, true)).toBe(true);
    expect(cellBool("", false)).toBe(false);
    expect(() => cellBool("はい", false)).toThrow(GenError);
  });
  it("確認済みの印は〇・○・◯を受ける", () => {
    expect(["〇", "○", "◯"].every(isConfirmed)).toBe(true);
    expect(isConfirmed("")).toBe(false);
    expect(isConfirmed("×")).toBe(false);
  });
  it("リッチテキストと数式の結果を文字列で読む", () => {
    expect(cellText({ richText: [{ text: "共" }, { text: "通" }] })).toBe(
      "共通",
    );
    expect(cellText({ formula: "A1", result: " x " })).toBe("x");
  });
});

describe("プリセットのラベルと検索文字列", () => {
  const f = (label, query) => presetLabelAndQuery(label, query, "行");
  it("値付きのラベルは [ より前だけを JSON のラベルにする", () => {
    expect(f("ファボ [50]件以上", "min_faves:50")).toEqual({
      label: "ファボ",
      query: "min_faves:50",
    });
    expect(f("日付 [2026-11-14] 以前", "until:2026-11-14")).toEqual({
      label: "日付",
      query: "until:2026-11-14",
    });
  });
  it("[XXX] は値が空の初期値：検索文字列は演算子だけになる（単位は省いてよい）", () => {
    expect(f("メンション @[XXX]", "@[XXX]")).toEqual({
      label: "メンション @",
      query: "@",
    });
    expect(f("since:[XXX]", "since:[XXX]").query).toBe("since:");
    expect(f("メンション除外 -@[XXX]", "-@[XXX]").query).toBe("-@");
    expect(f("list: [XXX]", "list:[XXX]")).toEqual({
      label: "list:",
      query: "list:",
    });
    expect(f("ファボ [XXX]件以上", "min_faves:[XXX]").query).toBe("min_faves:");
  });
  it("[ ] を持たないラベルは、そのまま", () => {
    expect(f("返信のみ", "filter:replies")).toEqual({
      label: "返信のみ",
      query: "filter:replies",
    });
  });
  it("ラベルの値が検索文字列の値と違えば止める", () => {
    expect(() => f("ファボ [50]件以上", "min_faves:100")).toThrow(/値/);
  });
  it("単位が違えば止める（ファボ [50]以上）", () => {
    expect(() => f("ファボ [50]以上", "min_faves:50")).toThrow(/単位/);
  });
  it("[値] があるのに検索文字列が値付きの演算子でなければ止める", () => {
    expect(() => f("返信 [1]", "filter:replies")).toThrow(GenError);
  });
});

describe("英語の対応（translate）", () => {
  const groupNames = new Map([["メンバー", "Member"]]);
  it("全体の一致 → 名前 [値] 単位 → 本体(種類) の順に、部品ごとに引く", () => {
    const { tr, missing } = makeTranslator(dict, groupNames);
    expect(tr("返信のみ")).toBe("Replies only");
    expect(tr("ファボ [50]件以上")).toBe("Likes [50] or more");
    expect(tr("エゴサワード(メンバー)")).toBe("Ego words (Member)");
    expect(tr("めんばー(ファンネーム)")).toBe("めんばー (Fan name)");
    // 引けなかった部品だけが missing に入る
    expect([...missing]).toEqual(["めんばー"]);
  });
  it("タグ・絵文字・英字だけの語は、表に無くてもそのまま（missing にしない）", () => {
    const { tr, missing } = makeTranslator([], new Map());
    expect(tr("#ときのそら生放送")).toBe("#ときのそら生放送");
    expect(tr("🐻💿")).toBe("🐻💿");
    expect(tr("Dead Beats")).toBe("Dead Beats");
    expect(missing.size).toBe(0);
  });
  it("英語が空の行は未入力として扱い、日本語のまま返す", () => {
    const { tr, missing } = makeTranslator([["返信のみ", ""]], new Map());
    expect(tr("返信のみ")).toBe("返信のみ");
    expect([...missing]).toEqual(["返信のみ"]);
  });
});

describe("buildMaster", () => {
  it("確認済みの〇が無い行は飛ばして報告する", () => {
    const { files, report } = buildMaster(
      rows({
        presets: [["共通", "返信のみ", "filter:replies", "", "", ""]],
      }),
    );
    expect(files.presets).toEqual([{ defaultList: true }]);
    expect(report.skipped).toHaveLength(1);
  });

  it("共通の語は、共通のグループ（共通／Common）にまとめる", () => {
    const { files } = buildMaster(
      rows({
        words: [["共通", "共通", "返信のみ", "filter:replies", 0, ok]],
      }),
    );
    expect(files.wordSet.common).toEqual([
      {
        name: { ja: "共通", en: "Common" },
        words: [
          {
            label: { ja: "返信のみ", en: "Replies only" },
            query: "filter:replies",
            starter: false,
          },
        ],
      },
    ]);
  });

  it("検索文字列が「-」の行・値の入力欄が要る行（[XXX]）は、JSON に入れず報告する", () => {
    const { files, report } = buildMaster(
      rows({
        words: [
          ["a", "メンバー", "-(ファンネーム)", "-", "TRUE", ok],
          ["共通", "共通", "メンション @[XXX]", "@[XXX]", 0, ok],
          ["a", "メンバー", "タグ", "#t", "TRUE", ok],
        ],
      }),
    );
    expect(files.wordSet.a[0].words.map((w) => w.query)).toEqual(["#t"]);
    expect(files.wordSet.common).toBeUndefined();
    expect(report.skipped).toHaveLength(2);
  });

  it("同じ検索文字列が別のグループにあっても、そのまま入れる", () => {
    const { files } = buildMaster(
      rows({
        groups: [
          ["a", "メンバー", "Member", ok],
          ["a", "別の人", "Other", ok],
        ],
        words: [
          ["a", "メンバー", "0期生(グループ)", "0期生", "TRUE", ok],
          ["a", "別の人", "0期生(グループ)", "0期生", "TRUE", ok],
        ],
      }),
    );
    expect(files.wordSet.a.map((g) => g.words[0].query)).toEqual([
      "0期生",
      "0期生",
    ]);
  });

  it("サジェスト規則：呼び名の一覧の語が when、グループの全ワードが suggest（検索文字列）", () => {
    const { files } = buildMaster(rows());
    expect(files.suggestRules).toEqual({
      a: [
        {
          group: "メンバー",
          when: ["めんば", "Mem"],
          suggest: ['("めんば" OR "Mem")', "めんばー"],
        },
      ],
    });
  });

  it("呼び名の一覧が無いグループには規則を作らない。OR の前後の空白が無い一覧も判定でき、要確認に出す", () => {
    const none = buildMaster(
      rows({ words: [["a", "メンバー", "タグ", "#t", "TRUE", ok]] }),
    );
    expect(none.files.suggestRules).toEqual({});
    const tight = buildMaster(
      rows({
        words: [["a", "メンバー", "名前", '("あ"OR "い")', "TRUE", ok]],
      }),
    );
    expect(tight.files.suggestRules.a[0].when).toEqual(["あ", "い"]);
    expect(tight.report.review.some((s) => s.includes("OR"))).toBe(true);
  });

  it("区切りの「 / 」を含む検索文字列は、直さず入れて要確認に出す", () => {
    const { files, report } = buildMaster(
      rows({ words: [["a", "メンバー", "期", "1期生 / GAMERS", "TRUE", ok]] }),
    );
    expect(files.wordSet.a[0].words[0].query).toBe("1期生 / GAMERS");
    expect(report.review.some((s) => s.includes("/"))).toBe(true);
  });

  it("「ワード集グループ」に無いグループを選んでいたら止める", () => {
    expect(() =>
      buildMaster(rows({ words: [["a", "ghost", "x", "x", "TRUE", ok]] })),
    ).toThrow(/ghost/);
  });

  it("存在しない対象は止める", () => {
    expect(() =>
      buildMaster(
        rows({
          presets: [["zzz", "返信のみ", "filter:replies", "", "", ok]],
        }),
      ),
    ).toThrow(/zzz/);
  });

  it("ラベルが20字を超える（英語も）なら、保存できないので止める", () => {
    expect(() =>
      buildMaster(
        rows({
          presets: [["共通", "あ".repeat(21), "x", "", "", ok]],
        }),
      ),
    ).toThrow(/20/);
    expect(() =>
      buildMaster(
        rows({
          dict: [...dict, ["タグ", "x".repeat(21)]],
          presets: [["共通", "タグ", "x", "", "", ok]],
        }),
      ),
    ).toThrow(/20/);
  });

  it("既定リストの名前とIDは、どちらかだけだと止める", () => {
    expect(() =>
      buildMaster(rows({ interests: [["a", "あ", "A", "Aから", ""]] })),
    ).toThrow(/両方/);
  });

  it("同じ入力から、同じ出力が決まった順序で作られる", () => {
    const a = JSON.stringify(buildMaster(rows()).files);
    const b = JSON.stringify(buildMaster(rows()).files);
    expect(a).toBe(b);
  });
});

describe("サジェスト確認用 Excel の行", () => {
  it("対象・グループ・対象の語・出す条件の表示名を、改行区切りで並べる", () => {
    const { files } = buildMaster(rows());
    expect(reviewRows(files)).toEqual([
      [
        "あ",
        "メンバー",
        "めんば\nMem",
        "エゴサワード(メンバー)\nめんばー(ファンネーム)",
        2,
      ],
    ]);
  });
});
