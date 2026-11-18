// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type LauncherPayload } from "@/api";
import { decodeLauncher, encodeLauncher } from "./codec";

const payload: LauncherPayload = {
  name: "配信後エゴサ 🎤",
  items: [
    { query: "ホロライブ since:yesterday until:2026-11-19", engine: "x" },
    { query: '"きりぬき" OR (a b) -from:foo', engine: "yahoo" },
    { query: "list:123 lang:ja", engine: "both" },
  ],
};

async function codeOf(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    return e instanceof ApiError ? e.code : "other";
  }
  return "none";
}

afterEach(() => vi.unstubAllGlobals());

describe("encodeLauncher / decodeLauncher（圧縮あり）", () => {
  it("往復で内容が変わらない。相対期間の記号は展開されない", async () => {
    const hash = await encodeLauncher(payload);
    expect(hash.startsWith("v1.")).toBe(true);
    const back = await decodeLauncher(hash);
    expect(back).toEqual(payload);
    expect(back.items[0].query).toContain("since:yesterday");
  });

  it("項目が0件でも往復できる", async () => {
    const p = { name: "空", items: [] };
    expect(await decodeLauncher(await encodeLauncher(p))).toEqual(p);
  });

  it("ハッシュは # ・+ ・/ ・= を含まない", async () => {
    const hash = await encodeLauncher(payload);
    expect(hash).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
  });
});

describe("非圧縮（CompressionStream が無いとき）", () => {
  it("v1u. で出力し、往復できる", async () => {
    vi.stubGlobal("CompressionStream", undefined);
    const hash = await encodeLauncher(payload);
    expect(hash).toMatch(/^v1u\.[A-Za-z0-9_-]+$/);
    expect(await decodeLauncher(hash)).toEqual(payload);
  });

  it("v1u. は圧縮の有無に関係なく読める", async () => {
    vi.stubGlobal("CompressionStream", undefined);
    const hash = await encodeLauncher(payload);
    vi.unstubAllGlobals();
    expect(await decodeLauncher(hash)).toEqual(payload);
  });
});

describe("decodeLauncher の失敗", () => {
  const b64 = (s: string) => Buffer.from(s).toString("base64url");

  it.each([
    ["空", ""],
    ["接頭辞が無い", "abcdef"],
    ["本体が空", "v1."],
    ["base64url として不正", "v1u.!!!"],
    ["解凍できない", "v1.AAAA"],
    ["JSON でない", `v1u.${b64("not json")}`],
    ["name が空", `v1u.${b64(JSON.stringify({ name: "", items: [] }))}`],
    [
      "engine が不正",
      `v1u.${b64(JSON.stringify({ name: "a", items: [{ query: "q", engine: "bing" }] }))}`,
    ],
    ["items が無い", `v1u.${b64(JSON.stringify({ name: "a" }))}`],
  ])("壊れている（%s）→ LAUNCHER_BROKEN", async (_label, hash) => {
    expect(await codeOf(decodeLauncher(hash))).toBe("LAUNCHER_BROKEN");
  });

  it.each([["v2.abcd"], ["v2u.abcd"], ["v10.abcd"]])(
    "知らない版（%s）→ LAUNCHER_VERSION",
    async (hash) => {
      expect(await codeOf(decodeLauncher(hash))).toBe("LAUNCHER_VERSION");
    },
  );

  it("DecompressionStream が無い端末で v1. を読むと LAUNCHER_BROKEN", async () => {
    const hash = await encodeLauncher(payload);
    vi.stubGlobal("DecompressionStream", undefined);
    expect(await codeOf(decodeLauncher(hash))).toBe("LAUNCHER_BROKEN");
  });
});
