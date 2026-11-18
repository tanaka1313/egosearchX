import { describe, expect, it } from "vitest";
import type { GroupNode, Node } from "./ast";
import { parseX } from "./parse-x";
import { serializeX } from "./serialize-x";
import { strip } from "./test-utils";

const text = (q: string) => serializeX(parseX(q)).text;

/** 手組みのノード（enabled・negate は既定値） */
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

describe("serializeX: 往復（parse → serialize → parse で木が変わらない）", () => {
  const corpus = [
    "",
    "ぺこら",
    "ぺこら 配信",
    '"兎田 ぺこら" 配信',
    '-ネタバレ -"a b"',
    "from:a to:b @c list:123",
    "-from:a -to:b -@c",
    "filter:media -filter:retweets filter:replies",
    "lang:ja min_faves:50 min_retweets:10 min_replies:3",
    "since:2026-11-01 until:2026-11-07",
    "since:yesterday",
    "since:3days_ago",
    "since_time:1700000000 until_time:1700086400",
    "(配信 OR 歌枠)",
    "ぺこら (配信 OR 歌枠) -filter:retweets",
    "ぺこら 配信 OR 歌枠",
    "a OR b OR c",
    "-(a OR b)",
    "(a (b OR c))",
    "(A)",
    "-(A)",
    "-(-(A B))",
    "((A B))",
    "-(-A)",
    "-(list:1)",
    "foo:bar",
    "-list:123",
    "https://example.com/a?b=1",
    'A OR "b',
    "A OR (b",
    "a ) OR b",
    "a OR ()",
    "a ( b",
    '"abc',
    "OR",
    "OR a",
    "a OR",
    "(a OR b",
  ];
  it.each(corpus)("%j", (q) => {
    const first = parseX(q);
    const out = serializeX(first).text;
    expect(strip(parseX(out))).toEqual(strip(first));
  });
});

describe("serializeX: 正規形（そのまま出る）", () => {
  const canonical = [
    "ぺこら 配信",
    '"兎田 ぺこら" -"a b" -ネタバレ',
    "from:a to:b @c list:123 -from:a -to:b -@c",
    "filter:media -filter:retweets lang:ja min_faves:50",
    "since:2026-11-01 until:2026-11-07",
    "ぺこら (配信 OR 歌枠) -(a OR b)",
    "(A)",
    "-(A)",
    "foo:bar",
  ];
  it.each(canonical)("%j", (q) => {
    expect(text(q)).toBe(q);
  });

  it("括弧なしの OR は括弧で囲んだ形に直す", () => {
    expect(text("配信 OR 歌枠 ぺこら")).toBe("(配信 OR 歌枠) ぺこら");
  });

  it("余分な空白を詰める", () => {
    expect(text("  a    b ")).toBe("a b");
  });

  it("閉じていない引用符・括弧を含む OR は、括弧で囲まずそのまま出す", () => {
    expect(text('A OR "b')).toBe('A OR "b');
    expect(text("A OR (b")).toBe("A OR (b");
  });
});

describe("serializeX: 無効・空・手組みのノード", () => {
  it("enabled: false のノードは出さない", () => {
    const root = group("AND", [term("a"), term("b", { enabled: false })]);
    expect(serializeX(root).text).toBe("a");
  });

  it("有効な子が無いグループは出さない（() を作らない）", () => {
    const root = group("AND", [
      term("a"),
      group("OR", [term("x", { enabled: false })]),
      group("AND", []),
    ]);
    expect(serializeX(root).text).toBe("a");
  });

  it("無効にしたグループは中身ごと出さない", () => {
    const root = group("AND", [
      term("a"),
      group("OR", [term("x"), term("y")], { enabled: false }),
    ]);
    expect(serializeX(root).text).toBe("a");
  });

  it("OR の子が無効化で1つになっても括弧は外さない", () => {
    const root = group("AND", [
      group("OR", [term("x"), term("y", { enabled: false })]),
    ]);
    expect(serializeX(root).text).toBe("(x)");
  });

  it("根が OR のときは、括弧なしで OR で結ぶ", () => {
    expect(serializeX(group("OR", [term("a"), term("b")])).text).toBe("a OR b");
  });

  it("表記ゆれ（variants）は (a OR b)。値が1つなら値だけ", () => {
    const v = (values: string[], negate = false): Node => ({
      id: "v",
      kind: "variants",
      values,
      enabled: true,
      negate,
    });
    expect(serializeX(group("AND", [v(["ぺこら", "ペコラ"])])).text).toBe(
      "(ぺこら OR ペコラ)",
    );
    expect(serializeX(group("AND", [v(["ぺこら"])])).text).toBe("ぺこら");
    expect(serializeX(group("AND", [v(["a", "b"], true)])).text).toBe(
      "-(a OR b)",
    );
  });
});

describe("serializeX: 期間と警告", () => {
  it("since／until は日付のまま出し、終了日を翌日へ変えない（日本時間で until は指定日を含む）", () => {
    const f = (name: "since" | "until", value: string): Node => ({
      id: name,
      kind: "filter",
      name,
      value,
      enabled: true,
      negate: false,
    });
    const out = serializeX(
      group("AND", [f("since", "2026-11-01"), f("until", "2026-11-07")]),
    ).text;
    expect(out).toBe("since:2026-11-01 until:2026-11-07");
    expect(out).not.toContain("since_time:");
    expect(out).not.toContain("until_time:");
  });

  it("貼り付けで得た since_time／until_time は、往復のため入力のまま保持する", () => {
    expect(text("since_time:1700000000")).toBe("since_time:1700000000");
  });

  it("X への出力では失う情報が無いので、警告は空", () => {
    expect(serializeX(parseX("a -from:b list:1 foo:bar")).warnings).toEqual([]);
  });
});
