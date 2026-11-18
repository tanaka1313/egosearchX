import { describe, expect, it } from "vitest";
import { parseListId } from "./list-id";

const ID = "1412278227767218179";

describe("parseListId", () => {
  it.each([
    [ID],
    [`  ${ID}  `],
    [`https://x.com/i/lists/${ID}`],
    [`https://twitter.com/i/lists/${ID}`],
    [`https://x.com/i/lists/${ID}/members`],
    [`https://x.com/i/lists/${ID}?s=20`],
    [`https://www.x.com/i/lists/${ID}`],
  ])("ID を取り出せる: %s", (input) => {
    expect(parseListId(input)).toEqual({ ok: true, value: ID });
  });

  it.each([
    [""],
    ["abc"],
    ["1234"], // 短すぎる
    [`https://example.com/i/lists/${ID}`], // X のホストではない
    ["https://x.com/search?q=a"],
    [`https://x.com/i/lists/abc`],
  ])("取り出せないときは list.invalid: %s", (input) => {
    expect(parseListId(input)).toEqual({
      ok: false,
      error: { code: "list.invalid" },
    });
  });
});
