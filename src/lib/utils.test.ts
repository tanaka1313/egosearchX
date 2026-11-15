import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("競合する Tailwind クラスは後勝ちで解決する", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("falsy な値を取り除く", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });
});
