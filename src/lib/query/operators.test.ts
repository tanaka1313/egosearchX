import { describe, expect, it } from "vitest";
import { FILTER_KEYS, ISSUE_CODES, PARAM_OP_TYPES, VALUE_OPS } from "@/api";
import {
  ACCOUNT_OPS,
  FILTER_OPS,
  PARAM_OPS,
  PARSE_ONLY_OPS,
  YAHOO_PERIOD_PARAMS,
  allOperatorDefs,
  yahooIssueCodes,
} from "./operators";

describe("operators: キーの網羅", () => {
  it("PARAM_OP_TYPES の全キーに定義があり、値の種類が契約と一致する", () => {
    for (const [key, type] of Object.entries(PARAM_OP_TYPES)) {
      expect(PARAM_OPS[key as keyof typeof PARAM_OPS], key).toBeDefined();
      expect(PARAM_OPS[key as keyof typeof PARAM_OPS].valueType).toBe(type);
    }
    expect(Object.keys(PARAM_OPS).sort()).toEqual(
      Object.keys(PARAM_OP_TYPES).sort(),
    );
  });

  it("FILTER_KEYS の全キーに定義があり、X では filter:<key> と書く", () => {
    for (const key of FILTER_KEYS) {
      expect(FILTER_OPS[key].x).toBe(`filter:${key}`);
    }
  });
});

describe("operators: アカウント", () => {
  it("list は否定できない（-list: は X でエラー。E6）", () => {
    expect(ACCOUNT_OPS.list.negatable).toBe(false);
    expect(ACCOUNT_OPS.from.negatable).toBe(true);
    expect(ACCOUNT_OPS.to.negatable).toBe(true);
    expect(ACCOUNT_OPS.mention.negatable).toBe(true);
  });

  it("X の書式：from:／to:／@／list:", () => {
    expect(ACCOUNT_OPS.from.x).toBe("from:");
    expect(ACCOUNT_OPS.to.x).toBe("to:");
    expect(ACCOUNT_OPS.mention.x).toBe("@");
    expect(ACCOUNT_OPS.list.x).toBe("list:");
  });

  it("Yahoo：from→ID:、to→@ に変換する", () => {
    expect(ACCOUNT_OPS.from.yahoo).toEqual({ kind: "rename", prefix: "ID:" });
    expect(ACCOUNT_OPS.to.yahoo).toEqual({ kind: "rename", prefix: "@" });
  });

  it("Yahoo：list は警告して除く、mention は @ のまま出して警告する", () => {
    expect(ACCOUNT_OPS.list.yahoo).toEqual({
      kind: "drop",
      code: "yahoo.listUnsupported",
    });
    expect(ACCOUNT_OPS.mention.yahoo).toEqual({
      kind: "keep",
      code: "yahoo.mentionAsReply",
    });
  });

  it("Yahoo：アカウントの除外は警告コード yahoo.accountExcludeUnsupported", () => {
    expect(ACCOUNT_OPS.from.yahooNegated).toEqual({
      kind: "drop",
      code: "yahoo.accountExcludeUnsupported",
    });
    expect(ACCOUNT_OPS.to.yahooNegated.kind).toBe("drop");
    expect(ACCOUNT_OPS.mention.yahooNegated.kind).toBe("drop");
  });
});

describe("operators: Yahoo の扱い", () => {
  it("filter: は警告して除く", () => {
    for (const key of FILTER_KEYS) {
      expect(FILTER_OPS[key].yahoo).toEqual({
        kind: "drop",
        code: "yahoo.filterUnsupported",
      });
    }
  });

  it("min_faves／min_retweets／min_replies は yahoo.minCountUnsupported で除く", () => {
    for (const op of ["min_faves", "min_retweets", "min_replies"] as const) {
      expect(PARAM_OPS[op].yahoo).toEqual({
        kind: "drop",
        code: "yahoo.minCountUnsupported",
      });
    }
  });

  it("since／until は URL パラメータ lts／uts に変換する", () => {
    expect(PARAM_OPS.since.yahoo).toEqual({
      kind: "param",
      param: "lts",
    });
    expect(PARAM_OPS.until.yahoo).toEqual({
      kind: "param",
      param: "uts",
    });
    expect(YAHOO_PERIOD_PARAMS).toEqual({ from: "lts", to: "uts" });
  });

  it("参照する警告コードがすべて ISSUE_CODES にある", () => {
    const codes = yahooIssueCodes();
    expect(codes.length).toBeGreaterThan(0);
    for (const code of codes) {
      expect(ISSUE_CODES, code).toContain(code);
    }
    expect(codes).toEqual(
      expect.arrayContaining([
        "yahoo.mentionAsReply",
        "yahoo.langUnsupported",
        "yahoo.minCountUnsupported",
      ]),
    );
  });
});

describe("operators: lang と since_time／until_time", () => {
  it("lang: は X では lang:、Yahoo では警告して除く", () => {
    expect(PARAM_OPS).not.toHaveProperty("lang");
    const lang = allOperatorDefs().find((d) => d.id === "lang");
    expect(lang?.x).toBe("lang:");
    expect(lang?.yahoo).toEqual({
      kind: "drop",
      code: "yahoo.langUnsupported",
    });
  });

  it("since_time／until_time は stable、解析だけで生成に使わず、Yahoo は lts／uts", () => {
    expect(PARSE_ONLY_OPS.since_time).toMatchObject({
      x: "since_time:",
      status: "stable",
      generate: false,
      yahoo: { kind: "param", param: "lts" },
    });
    expect(PARSE_ONLY_OPS.until_time).toMatchObject({
      x: "until_time:",
      status: "stable",
      generate: false,
      yahoo: { kind: "param", param: "uts" },
    });
  });

  it("生成に使う演算子は since_time／until_time 以外すべて generate: true", () => {
    const generated = allOperatorDefs().filter((d) => d.generate);
    expect(generated.map((d) => d.id)).not.toContain("since_time");
    expect(generated.map((d) => d.id)).not.toContain("until_time");
    expect(generated.map((d) => d.id)).toContain("since");
  });

  it("-list: の定義は無い", () => {
    expect(allOperatorDefs().some((d) => d.x === "-list:")).toBe(false);
  });
});

describe("operators: status", () => {
  it("すべての定義が status を持ち、現時点で experimental は無い", () => {
    for (const d of allOperatorDefs()) {
      expect(["stable", "experimental"], d.id).toContain(d.status);
      expect(d.status, d.id).toBe("stable");
    }
  });
});

describe("値付きの演算子（VALUE_OPS）と operators.ts の定義の一致", () => {
  it("接頭辞が、数値・日付の演算子とアカウントの演算子の書式（x）と一致する", () => {
    const x: Record<string, string> = {
      ...Object.fromEntries(
        Object.entries(PARAM_OPS).map(([k, d]) => [k, d.x]),
      ),
      "-since": `-${PARAM_OPS.since.x}`,
      from: ACCOUNT_OPS.from.x,
      "-from": `-${ACCOUNT_OPS.from.x}`,
      mention: ACCOUNT_OPS.mention.x,
      "-mention": `-${ACCOUNT_OPS.mention.x}`,
      list: ACCOUNT_OPS.list.x,
    };
    expect(Object.keys(VALUE_OPS).sort()).toEqual(Object.keys(x).sort());
    for (const [op, d] of Object.entries(VALUE_OPS))
      expect(d.prefix, op).toBe(x[op]);
  });
  it("否定できないリストは、否定の値付き演算子を持たない（-list: は X でエラー）", () => {
    expect(ACCOUNT_OPS.list.negatable).toBe(false);
    expect(Object.keys(VALUE_OPS)).not.toContain("-list");
  });
});
