import { expect, test } from "vitest";
import { broken } from "./ci-break";

test("CI の失敗確認：わざと失敗させる", () => {
  expect(broken).toBe(1);
});
