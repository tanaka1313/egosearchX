import { describe, expect, it } from "vitest";
import type { Engine } from "@/api";
import { normalize } from "../query/model";
import { planRun } from "./build";
import { parseUrl } from "./parse";

const TODAY = "2026-11-19";
const xUrl = (q: string, host = "x.com") =>
  `https://${host}/search?q=${encodeURIComponent(q)}&f=live`;
const yUrl = (p: string, extra = "") =>
  `https://search.yahoo.co.jp/realtime/search?p=${encodeURIComponent(p)}&ei=UTF-8${extra}`;
const ok = (input: string) => {
  const r = parseUrl(input);
  if (!r.ok) throw new Error(`failed: ${r.error.code}`);
  return r.value;
};
const fail = (input: string) => {
  const r = parseUrl(input);
  if (r.ok) throw new Error("should fail");
  return r.error.code;
};
/** 日本時間の0時（UNIX 秒） */
const jst = (y: number, m: number, d: number) =>
  Date.UTC(y, m - 1, d - 1, 15) / 1000;

describe("parseUrl: 失敗", () => {
  it("URL として読めない", () => {
    expect(fail("ぺこら")).toBe("url.unreadable");
    expect(fail("")).toBe("url.unreadable");
  });
  it("X・Yahoo!リアルタイム検索以外は unsupportedHost", () => {
    expect(fail("https://example.com/search?q=a")).toBe("url.unsupportedHost");
    // Yahoo の通常検索（リアルタイムではない）
    expect(fail("https://search.yahoo.co.jp/search?p=a")).toBe(
      "url.unsupportedHost",
    );
  });
  it("検索語が無い・空は noQuery", () => {
    expect(fail("https://x.com/search")).toBe("url.noQuery");
    expect(fail("https://x.com/search?q=%20%20")).toBe("url.noQuery");
    expect(fail("https://search.yahoo.co.jp/realtime/search?p=")).toBe(
      "url.noQuery",
    );
  });
  it("p が空で lts だけの URL は期間だけで保存形を作らず noQuery", () => {
    expect(
      fail(
        `https://search.yahoo.co.jp/realtime/search?lts=${jst(2026, 11, 1)}`,
      ),
    ).toBe("url.noQuery");
  });
});

describe("parseUrl: X", () => {
  it.each(["x.com", "twitter.com", "www.x.com", "mobile.twitter.com"])(
    "%s の q を保存形にする",
    (host) => {
      const v = ok(xUrl("ぺこら -filter:retweets", host));
      expect(v.engine).toBe("x");
      expect(v.query).toBe("ぺこら -filter:retweets");
    },
  );
  it("前後の空白を許す", () => {
    expect(ok(`  ${xUrl("a")}\n`).query).toBe("a");
  });
  it("解析できない演算子は raw として保持し、保存形に残る", () => {
    const v = ok(xUrl('"メンバーA" -filter:retweets foo:bar'));
    expect(v.query).toBe('"メンバーA" -filter:retweets foo:bar');
    expect(v.tokens).toEqual([
      { text: '"メンバーA"', raw: false },
      { text: "-filter:retweets", raw: false },
      { text: "foo:bar", raw: true },
    ]);
  });
  it("OR は括弧付きで出し、グループの中に raw があれば raw: true", () => {
    const v = ok(xUrl("a OR foo:bar"));
    expect(v.query).toBe("(a OR foo:bar)");
    expect(v.tokens).toEqual([{ text: "(a OR foo:bar)", raw: true }]);
  });
});

describe("parseUrl: Yahoo!リアルタイム検索（要件定義書 F4 の逆変換）", () => {
  it("(A B) → (A OR B)", () => {
    expect(ok(yUrl("(ぺこら 配信)")).query).toBe("(ぺこら OR 配信)");
  });
  it("A OR B → (A OR B)", () => {
    expect(ok(yUrl("a OR b")).query).toBe("(a OR b)");
  });
  it("括弧なしの OR は通常の語と混ざるとき OR を先に結ぶ（E9）", () => {
    expect(ok(yUrl("ぺこら 配信 OR 歌枠")).query).toBe("ぺこら (配信 OR 歌枠)");
  });
  it("ID:x・id:x → from:x", () => {
    expect(ok(yUrl("ID:abc id:def")).query).toBe("from:abc from:def");
  });
  it("@x → to:x", () => {
    expect(ok(yUrl("@abc")).query).toBe("to:abc");
  });
  it("括弧の中の ID:・@ も戻す", () => {
    expect(ok(yUrl("(ID:a ID:b) (@c @d)")).query).toBe(
      "(from:a OR from:b) (to:c OR to:d)",
    );
  });
  it("否定した括弧は否定した OR", () => {
    expect(ok(yUrl("-(a b)")).query).toBe("-(a OR b)");
  });
  it("lts → since:（現地の日付）", () => {
    expect(ok(yUrl("a", `&lts=${jst(2026, 11, 1)}`)).query).toBe(
      "a since:2026-11-01",
    );
  });
  it.each([
    [2026, 11, 4, "2026-11-03"],
    [2026, 12, 1, "2026-11-30"], // 月末
    [2027, 1, 1, "2026-12-31"], // 年末
    [2028, 3, 1, "2028-02-29"], // うるう日
  ])("uts（%i-%i-%i 0時）→ until:%s（1日前＝終了日を含む）", (y, m, d, s) => {
    expect(ok(yUrl("a", `&uts=${jst(y, m, d)}`)).query).toBe(`a until:${s}`);
  });
  it("lts と uts を両方取り込む", () => {
    const v = ok(yUrl("a", `&lts=${jst(2026, 11, 1)}&uts=${jst(2026, 11, 4)}`));
    expect(v.query).toBe("a since:2026-11-01 until:2026-11-03");
    expect(v.tokens.map((t) => t.text)).toEqual([
      "a",
      "since:2026-11-01",
      "until:2026-11-03",
    ]);
  });
  it("数字でない lts／uts は無視する", () => {
    const v = ok(yUrl("a", "&lts=abc&uts="));
    expect(v.query).toBe("a");
  });
  it("表に無い演算子は raw として入力のまま保持する", () => {
    for (const t of ["list:123", "lang:ja", "-@abc", "from:abc", "foo:bar"]) {
      const v = ok(yUrl(`a ${t}`));
      expect(v.query).toBe(`a ${t}`);
      expect(v.tokens.at(-1)).toEqual({ text: t, raw: true });
    }
  });
  it("通常の語・引用符・否定語はそのまま", () => {
    const v = ok(yUrl('"完全 一致" -除外 語'));
    expect(v.query).toBe('"完全 一致" -除外 語');
    expect(v.tokens.every((t) => !t.raw)).toBe(true);
  });
  it("engine は yahoo", () => {
    expect(ok(yUrl("a")).engine).toBe("yahoo");
  });
});

describe("往復：保存形 → planRun → parseUrl", () => {
  const url = (q: string, engine: Engine) =>
    planRun([{ query: q, engine }], TODAY).targets[0].url;

  it.each([
    "ぺこら 配信",
    '"完全一致" -除外 -filter:retweets min_faves:50 lang:ja',
    "(a OR b) -from:c list:123 since:2026-11-01 until:2026-11-03",
    "a foo:bar",
  ])("X：%s", (q) => {
    const v = ok(url(q, "x"));
    expect(v.engine).toBe("x");
    expect(normalize(v.query)).toBe(normalize(q));
  });

  it.each([
    "ぺこら 配信",
    "(a OR b) c",
    "(from:a OR from:b) ぺこら", // Yahoo では (ID:a ID:b)
    "from:a to:b",
    "ぺこら since:2026-11-01 until:2026-11-03", // lts／uts に抜けて末尾へ戻る
  ])("Yahoo：%s", (q) => {
    const v = ok(url(q, "yahoo"));
    expect(v.engine).toBe("yahoo");
    expect(normalize(v.query)).toBe(normalize(q));
  });

  it("Yahoo で戻らない形：mention は to: になる", () => {
    expect(ok(url("@abc", "yahoo")).query).toBe("to:abc");
  });
  it("Yahoo で戻らない形：list:・filter:・lang:・min_* は除かれて戻らない（警告は planRun が出す）", () => {
    const v = ok(url("a list:123 filter:images lang:ja min_faves:5", "yahoo"));
    expect(v.query).toBe("a");
  });
  it("Yahoo で戻らない形：-from: は除かれる", () => {
    expect(ok(url("a -from:b", "yahoo")).query).toBe("a");
  });
  it("Yahoo で戻らない形：否定した OR は -A -B になる", () => {
    expect(ok(url("-(a OR b)", "yahoo")).query).toBe("-a -b");
  });
});
