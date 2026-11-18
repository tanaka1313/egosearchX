import { describe, expect, it } from "vitest";
import { LIMITS } from "@/api";
import { planRun } from "./build";

const TODAY = "2026-11-19";
const one = (query: string, engine: "x" | "yahoo" | "both" = "both") =>
  planRun([{ query, engine }], TODAY);
const params = (url: string) => new URL(url).searchParams;
const keys = (url: string) => [...params(url).keys()].sort();
const find = (q: string, engine: "x" | "yahoo") =>
  one(q, "both").targets.find((t) => t.engine === engine)!;

/** 日本時間の0時（UNIX 秒） */
const jst = (y: number, m: number, d: number) =>
  Date.UTC(y, m - 1, d - 1, 15) / 1000;

describe("planRun: X の URL", () => {
  it("q と f=live だけを持ち、ホストは x.com", () => {
    const t = find("ぺこら -filter:retweets", "x");
    const u = new URL(t.url);
    expect(u.host).toBe("x.com");
    expect(u.pathname).toBe("/search");
    expect(keys(t.url)).toEqual(["f", "q"]);
    expect(params(t.url).get("f")).toBe("live");
    expect(params(t.url).get("q")).toBe("ぺこら -filter:retweets");
  });

  it("until は終了日のまま出し、翌日にずらさない", () => {
    const t = find("a since:2026-11-01 until:2026-11-03", "x");
    expect(params(t.url).get("q")).toBe("a since:2026-11-01 until:2026-11-03");
  });
});

describe("planRun: Yahoo!リアルタイム検索の URL", () => {
  it("p と ei=UTF-8 だけを持ち、rkf・ifr・utm_* を付けない", () => {
    const t = find("ぺこら", "yahoo");
    expect(new URL(t.url).host).toBe("search.yahoo.co.jp");
    expect(new URL(t.url).pathname).toBe("/realtime/search");
    expect(keys(t.url)).toEqual(["ei", "p"]);
    expect(params(t.url).get("ei")).toBe("UTF-8");
    expect(params(t.url).get("p")).toBe("ぺこら");
  });

  it("期間は p に入れず、lts（開始日の0時）と uts（終了日の翌日0時）にする", () => {
    const t = find("a since:2026-11-01 until:2026-11-03", "yahoo");
    expect(keys(t.url)).toEqual(["ei", "lts", "p", "uts"]);
    expect(params(t.url).get("p")).toBe("a");
    expect(params(t.url).get("lts")).toBe(String(jst(2026, 11, 1)));
    expect(params(t.url).get("uts")).toBe(String(jst(2026, 11, 4)));
  });

  it("OR は括弧に直す", () => {
    expect(params(find("a (b OR c)", "yahoo").url).get("p")).toBe("a (b c)");
  });
});

describe("planRun: 相対期間と検索先", () => {
  it("相対期間は stored に記号のまま残し、query と URL は日付に展開する", () => {
    const [t] = planRun(
      [{ query: "a since:yesterday", engine: "x" }],
      "2026-01-01",
    ).targets;
    expect(t.stored).toBe("a since:yesterday");
    expect(t.query).toBe("a since:2025-12-31");
    expect(params(t.url).get("q")).toBe("a since:2025-12-31");
  });

  it("both は X → Yahoo の2件、複数項目は項目順", () => {
    const plan = planRun(
      [
        { query: "a", engine: "both" },
        { query: "b", engine: "x" },
        { query: "c", engine: "yahoo" },
      ],
      TODAY,
    );
    expect(plan.targets.map((t) => [t.stored, t.engine])).toEqual([
      ["a", "x"],
      ["a", "yahoo"],
      ["b", "x"],
      ["c", "yahoo"],
    ]);
  });

  it("項目が空なら targets も空", () => {
    expect(planRun([], TODAY)).toEqual({ targets: [], warnings: [] });
  });
});

describe("planRun: 警告", () => {
  it("list: は Yahoo の target だけに警告し、p から消える", () => {
    const x = find("a list:123", "x");
    const y = find("a list:123", "yahoo");
    expect(x.warnings).toEqual([]);
    expect(y.warnings.map((w) => w.code)).toEqual(["yahoo.listUnsupported"]);
    expect(params(y.url).get("p")).toBe("a");
  });

  it("RunPlan.warnings は target の警告を重複なしでまとめる", () => {
    const plan = planRun(
      [
        { query: "a list:1", engine: "yahoo" },
        { query: "b list:2", engine: "yahoo" },
      ],
      TODAY,
    );
    expect(plan.warnings.map((w) => w.code)).toEqual(["yahoo.listUnsupported"]);
  });

  it("警告水準ちょうどでは出さず、1文字超えると query.tooLong（両方の検索先）", () => {
    const ok = one("a".repeat(LIMITS.urlWarn));
    expect(ok.warnings).toEqual([]);
    const long = one("a".repeat(LIMITS.urlWarn + 1));
    expect(long.targets.map((t) => t.warnings)).toEqual([
      [
        {
          code: "query.tooLong",
          params: { length: LIMITS.urlWarn + 1, limit: LIMITS.urlWarn },
        },
      ],
      [
        {
          code: "query.tooLong",
          params: { length: LIMITS.urlWarn + 1, limit: LIMITS.urlWarn },
        },
      ],
    ]);
    expect(long.warnings).toHaveLength(1);
  });

  it("長さは展開後の文字数で測る", () => {
    const base = "a".repeat(LIMITS.urlWarn - 10);
    const plan = planRun(
      [{ query: `${base} since:yesterday`, engine: "x" }],
      TODAY,
    );
    expect(plan.targets[0].warnings.map((w) => w.code)).toEqual([
      "query.tooLong",
    ]);
  });
});
