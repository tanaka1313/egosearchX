import { describe, expect, it } from "vitest";
import { FILTER_KEYS } from "@/api";
import type { Node } from "./ast";
import { ACCOUNT_OPS, PARSE_ONLY_OPS } from "./operators";
import { parseX } from "./parse-x";
import { strip } from "./test-utils";

const shape = (q: string) => parseX(q).children.map(strip);

const term = (value: string, negate = false) => ({
  kind: "term",
  mode: "plain",
  value,
  negate,
});
const exact = (value: string, negate = false) => ({
  kind: "term",
  mode: "exact",
  value,
  negate,
});
const raw = (text: string) => ({ kind: "raw", text, negate: false });
const group = (join: "AND" | "OR", children: unknown[], negate = false) => ({
  kind: "group",
  join,
  children,
  negate,
});

describe("parseX: 根", () => {
  it("根は AND のグループで、空文字列は子を持たない", () => {
    const root = parseX("");
    expect(root).toMatchObject({
      kind: "group",
      join: "AND",
      negate: false,
      enabled: true,
      children: [],
    });
    expect(parseX("   ").children).toEqual([]);
  });

  it("ID は解析ごとの連番で、同じ入力なら同じ結果になり、重複しない", () => {
    const q = "ぺこら (配信 OR 歌枠) -filter:retweets foo:bar";
    expect(parseX(q)).toEqual(parseX(q));
    const ids: string[] = [];
    const walk = (n: Node) => {
      ids.push(n.id);
      if (n.kind === "group") n.children.forEach(walk);
    };
    walk(parseX(q));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("parseX: 語", () => {
  it("空白で分けた語は通常の語になる", () => {
    expect(shape("ぺこら 配信")).toEqual([term("ぺこら"), term("配信")]);
  });

  it('引用符で囲んだ語は完全一致になり、空白を含められる（"兎田 ぺこら"）', () => {
    expect(shape('"兎田 ぺこら" 配信')).toEqual([
      exact("兎田 ぺこら"),
      term("配信"),
    ]);
  });

  it("-語 と -完全一致 は除外になる", () => {
    expect(shape('-ネタバレ -"a b"')).toEqual([
      term("ネタバレ", true),
      exact("a b", true),
    ]);
  });

  it("小文字の or は語。単独の大文字 OR だけが演算子になる", () => {
    expect(shape("a or b")).toEqual([term("a"), term("or"), term("b")]);
    expect(shape("-OR")).toEqual([term("OR", true)]);
  });

  it("空の引用符・`-` だけ・`--語` は raw で保持する", () => {
    expect(shape('""')).toEqual([raw('""')]);
    expect(shape("-")).toEqual([raw("-")]);
    expect(shape("--foo")).toEqual([raw("--foo")]);
  });

  it("引用符が語の途中にある・閉じていないときは raw で保持する", () => {
    expect(shape('a"b c"')).toEqual([raw('a"b c"')]);
    expect(shape('"abc')).toEqual([raw('"abc')]);
    expect(shape('A "b c')).toEqual([term("A"), raw('"b c')]);
  });
});

describe("parseX: アカウント", () => {
  it("from:／to:／@／list: を解析する", () => {
    expect(shape("from:abc to:def @ghi list:123")).toEqual([
      { kind: "account", op: "from", value: "abc", negate: false },
      { kind: "account", op: "to", value: "def", negate: false },
      { kind: "account", op: "mention", value: "ghi", negate: false },
      { kind: "account", op: "list", value: "123", negate: false },
    ]);
  });

  it("-from:／-to:／-@ は除外のアカウントとして解析する（E6）", () => {
    expect(shape("-from:abc -to:def -@ghi")).toEqual([
      { kind: "account", op: "from", value: "abc", negate: true },
      { kind: "account", op: "to", value: "def", negate: true },
      { kind: "account", op: "mention", value: "ghi", negate: true },
    ]);
  });

  it("-list: は X で検索がエラーになるので、解析せず raw で保持する（E6）", () => {
    expect(shape("-list:123")).toEqual([raw("-list:123")]);
  });

  it("値が空のアカウント演算子は raw", () => {
    expect(shape("from: @")).toEqual([raw("from:"), raw("@")]);
  });

  it("定義（operators.ts）の全アカウント演算子を解析し、否定できるかは negatable に従う", () => {
    for (const [op, def] of Object.entries(ACCOUNT_OPS)) {
      expect(shape(`${def.x}abc`), op).toEqual([
        { kind: "account", op, value: "abc", negate: false },
      ]);
      expect(shape(`-${def.x}abc`), `-${op}`).toEqual(
        def.negatable
          ? [{ kind: "account", op, value: "abc", negate: true }]
          : [raw(`-${def.x}abc`)],
      );
    }
  });
});

describe("parseX: フィルタ・値付きの演算子", () => {
  it("filter:<key> と -filter:<key> を解析する（定義の全キー）", () => {
    for (const key of FILTER_KEYS) {
      expect(shape(`filter:${key}`), key).toEqual([
        { kind: "filter", name: key, negate: false },
      ]);
      expect(shape(`-filter:${key}`), `-${key}`).toEqual([
        { kind: "filter", name: key, negate: true },
      ]);
    }
  });

  it("知らない filter: は raw", () => {
    expect(shape("filter:foo -filter:bar")).toEqual([
      raw("filter:foo"),
      raw("-filter:bar"),
    ]);
  });

  it("lang: を解析する。否定と空の値は raw", () => {
    expect(shape("lang:ja")).toEqual([
      { kind: "filter", name: "lang", value: "ja", negate: false },
    ]);
    expect(shape("-lang:ja lang:")).toEqual([raw("-lang:ja"), raw("lang:")]);
  });

  it("min_faves／min_retweets／min_replies は 1 以上の整数だけ解析し、それ以外は raw", () => {
    expect(shape("min_faves:100 min_retweets:5 min_replies:1")).toEqual([
      { kind: "filter", name: "min_faves", value: "100", negate: false },
      { kind: "filter", name: "min_retweets", value: "5", negate: false },
      { kind: "filter", name: "min_replies", value: "1", negate: false },
    ]);
    expect(
      shape("min_faves:0 min_faves:abc min_faves:1.5 -min_faves:10"),
    ).toEqual([
      raw("min_faves:0"),
      raw("min_faves:abc"),
      raw("min_faves:1.5"),
      raw("-min_faves:10"),
    ]);
  });

  it("since／until は YYYY-MM-DD だけ解析する。形式違いは raw", () => {
    expect(shape("since:2026-11-10 until:2026-11-11")).toEqual([
      { kind: "filter", name: "since", value: "2026-11-10", negate: false },
      { kind: "filter", name: "until", value: "2026-11-11", negate: false },
    ]);
    expect(shape("since:abc since:2026-11-1 -since:2026-11-10")).toEqual([
      raw("since:abc"),
      raw("since:2026-11-1"),
      raw("-since:2026-11-10"),
    ]);
  });

  it("相対期間の記号（since:yesterday など）は since として解析する。until には使えない", () => {
    expect(shape("since:yesterday since:3days_ago since:1week_ago")).toEqual([
      { kind: "filter", name: "since", value: "yesterday", negate: false },
      { kind: "filter", name: "since", value: "3days_ago", negate: false },
      { kind: "filter", name: "since", value: "1week_ago", negate: false },
    ]);
    expect(shape("until:yesterday")).toEqual([raw("until:yesterday")]);
  });

  it("since_time／until_time は生成しないが、貼り付けられたものは構造として保持する（E2）", () => {
    for (const name of Object.keys(PARSE_ONLY_OPS)) {
      expect(shape(`${name}:1700000000`), name).toEqual([
        { kind: "filter", name, value: "1700000000", negate: false },
      ]);
      expect(shape(`${name}:abc`), `${name} 不正`).toEqual([
        raw(`${name}:abc`),
      ]);
    }
  });
});

describe("parseX: 括弧と OR", () => {
  it("(A OR B) C は OR のグループと語になる", () => {
    expect(shape("(A OR B) C")).toEqual([
      group("OR", [term("A"), term("B")]),
      term("C"),
    ]);
  });

  it("括弧は入れ子にできる", () => {
    expect(shape("(A OR (B C)) D")).toEqual([
      group("OR", [term("A"), group("AND", [term("B"), term("C")])]),
      term("D"),
    ]);
  });

  it("-(…) は除外のグループになる", () => {
    expect(shape("-(A B)")).toEqual([
      group("AND", [term("A"), term("B")], true),
    ]);
    expect(shape("-(A OR B)")).toEqual([
      group("OR", [term("A"), term("B")], true),
    ]);
  });

  it("括弧なしの OR は、通常の語と混ざるとき OR を先に結ぶ（X・Yahoo とも実機で確認。E9）", () => {
    expect(shape("ぺこら 配信 OR 歌枠")).toEqual([
      term("ぺこら"),
      group("OR", [term("配信"), term("歌枠")]),
    ]);
    expect(shape("A B OR C D")).toEqual([
      term("A"),
      group("OR", [term("B"), term("C")]),
      term("D"),
    ]);
  });

  it("A OR B OR C は 3 つの子を持つ 1 つの OR グループ", () => {
    expect(shape("A OR B OR C")).toEqual([
      group("OR", [term("A"), term("B"), term("C")]),
    ]);
  });

  it("OR の項には演算子も使える", () => {
    expect(shape("from:a OR -filter:retweets")).toEqual([
      group("OR", [
        { kind: "account", op: "from", value: "a", negate: false },
        { kind: "filter", name: "retweets", negate: true },
      ]),
    ]);
  });
});

describe("parseX: 解析できないものは raw で保持する（内容を欠かさない）", () => {
  it("知らない演算子・URL は、先頭の - を含めて入力のまま保持する", () => {
    expect(shape("foo:bar -foo:bar https://x.com/a")).toEqual([
      raw("foo:bar"),
      raw("-foo:bar"),
      raw("https://x.com/a"),
    ]);
  });

  it("対応しない ) は raw", () => {
    expect(shape("A )")).toEqual([term("A"), raw(")")]);
    expect(shape("(A))")).toEqual([group("AND", [term("A")]), raw(")")]);
  });

  it("閉じていない ( は、そこから最後までを 1 つの raw にする", () => {
    expect(shape("(A B")).toEqual([raw("(A B")]);
    expect(shape("X (A (B C)")).toEqual([term("X"), raw("(A (B C)")]);
  });

  it("空の括弧は raw", () => {
    expect(shape("()")).toEqual([raw("()")]);
    expect(shape("-()")).toEqual([raw("-()")]);
  });

  it("先頭・末尾・連続の OR は raw", () => {
    expect(shape("OR A")).toEqual([raw("OR"), term("A")]);
    expect(shape("A OR")).toEqual([term("A"), raw("OR")]);
    expect(shape("A OR OR B")).toEqual([
      term("A"),
      raw("OR"),
      raw("OR"),
      term("B"),
    ]);
    expect(shape("(A OR)")).toEqual([group("AND", [term("A"), raw("OR")])]);
  });
});

describe("parseX: 実際の検索", () => {
  it("条件ボタン・期間・アカウント除外を含む検索を解析する", () => {
    expect(
      shape(
        'ぺこら (配信 OR 歌枠) -filter:retweets since:yesterday min_faves:10 list:123 -@spam "a b"',
      ),
    ).toEqual([
      term("ぺこら"),
      group("OR", [term("配信"), term("歌枠")]),
      { kind: "filter", name: "retweets", negate: true },
      { kind: "filter", name: "since", value: "yesterday", negate: false },
      { kind: "filter", name: "min_faves", value: "10", negate: false },
      { kind: "account", op: "list", value: "123", negate: false },
      { kind: "account", op: "mention", value: "spam", negate: true },
      exact("a b"),
    ]);
  });
});
