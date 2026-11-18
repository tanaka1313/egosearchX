import { describe, expect, it } from "vitest";
import type { GroupNode, Node } from "./ast";
import { yahooIssueCodes } from "./operators";
import { parseX } from "./parse-x";
import { serializeYahoo } from "./serialize-yahoo";

const y = (q: string) => serializeYahoo(parseX(q));
const text = (q: string) => y(q).text;
const codes = (q: string) => y(q).warnings.map((w) => w.code);

/** 日本時間の0時（UNIX 秒） */
const jst = (yy: number, m: number, d: number) =>
  Date.UTC(yy, m - 1, d - 1, 15) / 1000;

const term = (value: string, extra: Partial<Node> = {}): Node =>
  ({
    id: value,
    kind: "term",
    mode: "plain",
    value,
    enabled: true,
    negate: false,
    ...extra,
  }) as Node;
const group = (
  join: "AND" | "OR",
  children: Node[],
  extra: Partial<GroupNode> = {},
): GroupNode => ({
  id: "g",
  kind: "group",
  join,
  children,
  enabled: true,
  negate: false,
  ...extra,
});

describe("serializeYahoo: 変換表", () => {
  it("語・引用符付きの語・除外語はそのまま出し、警告しない", () => {
    const r = y('ぺこら "兎田 ぺこら" -ネタバレ -"a b"');
    expect(r.text).toBe('ぺこら "兎田 ぺこら" -ネタバレ -"a b"');
    expect(r.warnings).toEqual([]);
  });

  it("OR は (A B) にする", () => {
    expect(text("ぺこら (配信 OR 歌枠)")).toBe("ぺこら (配信 歌枠)");
  });

  it("括弧なしの OR も (A B) にする", () => {
    expect(text("a OR b OR c")).toBe("(a b c)");
  });

  it("from: は ID: に、to: は @ に変える（警告なし）", () => {
    const r = y("from:a to:b");
    expect(r.text).toBe("ID:a @b");
    expect(r.warnings).toEqual([]);
  });

  it("@x はそのまま出し、yahoo.mentionAsReply を返す", () => {
    const r = y("@c");
    expect(r.text).toBe("@c");
    expect(r.warnings).toEqual([{ code: "yahoo.mentionAsReply" }]);
  });

  it("variants は (a b)、除外は -a -b", () => {
    const v = (values: string[], negate = false): Node =>
      ({ id: "v", kind: "variants", values, enabled: true, negate }) as Node;
    expect(serializeYahoo(group("AND", [v(["a", "b"])])).text).toBe("(a b)");
    expect(serializeYahoo(group("AND", [v(["a", "b"], true)])).text).toBe(
      "-a -b",
    );
    expect(serializeYahoo(group("AND", [v(["a"])])).text).toBe("a");
  });
});

describe("serializeYahoo: 使えない演算子は除いて警告する", () => {
  it("list: は除き yahoo.listUnsupported", () => {
    const r = y("ぺこら list:123");
    expect(r.text).toBe("ぺこら");
    expect(r.warnings).toEqual([{ code: "yahoo.listUnsupported" }]);
  });

  it("filter: は除き yahoo.filterUnsupported（除外形も）", () => {
    const r = y("a filter:images -filter:retweets");
    expect(r.text).toBe("a");
    expect(r.warnings).toEqual([{ code: "yahoo.filterUnsupported" }]);
  });

  it("lang: は除き yahoo.langUnsupported", () => {
    const r = y("a lang:ja");
    expect(r.text).toBe("a");
    expect(r.warnings).toEqual([{ code: "yahoo.langUnsupported" }]);
  });

  it("min_* は除き、種類ごとに yahoo.minCountUnsupported（op 付き）", () => {
    const r = y("a min_faves:50 min_retweets:10 min_replies:3");
    expect(r.text).toBe("a");
    expect(r.warnings).toEqual([
      { code: "yahoo.minCountUnsupported", params: { op: "min_faves" } },
      { code: "yahoo.minCountUnsupported", params: { op: "min_retweets" } },
      { code: "yahoo.minCountUnsupported", params: { op: "min_replies" } },
    ]);
  });

  it("アカウントの除外は除き yahoo.accountExcludeUnsupported（op 付き）", () => {
    const r = y("a -from:x -to:y -@z");
    expect(r.text).toBe("a");
    expect(r.warnings).toEqual([
      { code: "yahoo.accountExcludeUnsupported", params: { op: "-from:" } },
      { code: "yahoo.accountExcludeUnsupported", params: { op: "-to:" } },
      { code: "yahoo.accountExcludeUnsupported", params: { op: "-@" } },
    ]);
  });

  it("同じ警告は1件にまとめ、最初に出た順に並べる", () => {
    const r = y("list:1 filter:videos list:2 filter:images");
    expect(r.warnings).toEqual([
      { code: "yahoo.listUnsupported" },
      { code: "yahoo.filterUnsupported" },
    ]);
  });

  it("解析できない演算子（raw）はそのまま出し yahoo.rawUnverified（token 付き）", () => {
    const r = y("a foo:bar -list:123");
    expect(r.text).toBe("a foo:bar -list:123");
    expect(r.warnings).toEqual([
      { code: "yahoo.rawUnverified", params: { token: "foo:bar" } },
      { code: "yahoo.rawUnverified", params: { token: "-list:123" } },
    ]);
  });

  it("全部が除かれたら空文字で、警告だけが残る", () => {
    const r = y("list:123");
    expect(r.text).toBe("");
    expect(r.warnings).toEqual([{ code: "yahoo.listUnsupported" }]);
  });
});

describe("serializeYahoo: 期間は lts／uts にする", () => {
  it("since は開始日の0時、until は終了日の翌日0時（テキストには出さない）", () => {
    const r = y("a since:2026-11-01 until:2026-11-07");
    expect(r.text).toBe("a");
    expect(r.lts).toBe(jst(2026, 11, 1));
    expect(r.uts).toBe(jst(2026, 11, 8));
    expect(r.warnings).toEqual([]);
  });

  it("終了日が月末・年末なら翌月・翌年の1日0時", () => {
    expect(y("until:2026-11-30").uts).toBe(jst(2026, 12, 1));
    expect(y("until:2026-12-31").uts).toBe(jst(2027, 1, 1));
  });

  it("期間が無ければ lts／uts は付かない", () => {
    const r = y("a");
    expect("lts" in r).toBe(false);
    expect("uts" in r).toBe(false);
  });

  it("since_time／until_time の秒はそのまま入れる（警告なし）", () => {
    const r = y("since_time:1700000000 until_time:1700086400");
    expect(r.lts).toBe(1700000000);
    expect(r.uts).toBe(1700086400);
    expect(r.warnings).toEqual([]);
  });

  it("期間が重なったら共通部分（lts は大きい方、uts は小さい方）", () => {
    const r = y(
      "since:2026-11-01 since:2026-11-05 until:2026-11-20 until:2026-11-10",
    );
    expect(r.lts).toBe(jst(2026, 11, 5));
    expect(r.uts).toBe(jst(2026, 11, 11));
  });

  it("OR の中の期間も lts へ移す（警告なし）", () => {
    const r = y("(since:2026-11-01 OR 配信)");
    expect(r.text).toBe("配信");
    expect(r.lts).toBe(jst(2026, 11, 1));
    expect(r.warnings).toEqual([]);
  });

  it("展開されていない相対の記号は黙って捨てず、そのまま出して rawUnverified", () => {
    const r = y("a since:yesterday");
    expect(r.text).toBe("a since:yesterday");
    expect(r.lts).toBeUndefined();
    expect(r.warnings).toEqual([
      { code: "yahoo.rawUnverified", params: { token: "since:yesterday" } },
    ]);
  });
});

describe("serializeYahoo: グループ", () => {
  it("AND の中の AND は括弧なしで平らにする", () => {
    expect(text("a (b c)")).toBe("a b c");
  });

  it("OR の中の OR は1つにまとめる", () => {
    expect(text("(a OR (b OR c))")).toBe("(a b c)");
  });

  it("OR の子が除かれて1つになったら括弧を付けない", () => {
    expect(text("(a OR list:1)")).toBe("a");
  });

  it("OR の子が全部除かれたらグループごと出さない", () => {
    expect(text("x (list:1 OR filter:images)")).toBe("x");
  });

  it("否定した OR は、子を除外した AND にする（警告なし）", () => {
    const r = y("a -(b OR c)");
    expect(r.text).toBe("a -b -c");
    expect(r.warnings).toEqual([]);
  });

  it("否定した OR の中の除外語は、除外が外れる", () => {
    expect(text("-(b OR -c)")).toBe("-b c");
  });

  it("OR の中の AND は X の形のまま出し yahoo.groupUnverified", () => {
    const r = y("ぺこら OR (配信 歌枠)");
    expect(r.text).toBe("(ぺこら (配信 歌枠))");
    expect(r.warnings).toEqual([{ code: "yahoo.groupUnverified" }]);
  });

  it("否定した AND は X の形のまま出し yahoo.groupUnverified", () => {
    const r = y("a -(b c)");
    expect(r.text).toBe("a -(b c)");
    expect(r.warnings).toEqual([{ code: "yahoo.groupUnverified" }]);
  });

  it("否定した AND の子が1つなら、その子の否定にする（警告なし）", () => {
    const r = y("-(b)");
    expect(r.text).toBe("-b");
    expect(r.warnings).toEqual([]);
  });

  it("根が OR のときは全体を括弧で囲む", () => {
    expect(serializeYahoo(group("OR", [term("a"), term("b")])).text).toBe(
      "(a b)",
    );
  });

  it("enabled: false のノードと、有効な子が無いグループは出さない", () => {
    const root = group("AND", [
      term("a"),
      term("b", { enabled: false }),
      group("OR", [term("x", { enabled: false })]),
      group("OR", [term("y"), term("z")], { enabled: false }),
    ]);
    expect(serializeYahoo(root).text).toBe("a");
  });

  it("無効にしたノードの警告は出さない", () => {
    const list = parseX("list:1").children[0];
    const root = group("AND", [{ ...list, enabled: false }]);
    expect(serializeYahoo(root).warnings).toEqual([]);
  });
});

describe("serializeYahoo: 警告コードの網羅", () => {
  const inputs = [
    "list:1 filter:images lang:ja min_faves:1 -from:a @b foo:bar",
    "a OR (b c)",
  ];
  it("operators.ts が参照する Yahoo の警告コードは、どれも何らかの入力で出る", () => {
    const emitted = new Set(inputs.flatMap((q) => codes(q)));
    for (const code of yahooIssueCodes()) expect(emitted).toContain(code);
    expect(emitted).toContain("yahoo.rawUnverified");
    expect(emitted).toContain("yahoo.groupUnverified");
  });
});
