import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);
import { formatBuildTime } from "@/lib/build-info";
import { VersionDialog } from "./version-dialog";

describe("formatBuildTime", () => {
  it("UTC の ISO 文字列を日本時間に直す", () => {
    expect(formatBuildTime("2026-11-17T05:05:00.000Z")).toBe(
      "2026-11-17 14:05 (JST)",
    );
  });
  it("日付をまたぐ時刻も日本時間で表す", () => {
    expect(formatBuildTime("2026-11-17T16:00:00.000Z")).toBe(
      "2026-11-18 01:00 (JST)",
    );
  });
  it.each(["", "not-a-date"])("不正な値「%s」は「不明」", (v) => {
    expect(formatBuildTime(v)).toBe("不明");
  });
});

describe("VersionDialog", () => {
  it("ボタンを押すとビルド日時とコミットを表示する", () => {
    render(
      <VersionDialog
        info={{ builtAt: "2026-11-17T05:05:00.000Z", commit: "abc1234" }}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "バージョン情報" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "2026-11-17 14:05 (JST)",
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("abc1234");
  });

  it("コミットが空なら「不明」と表示し、Esc で閉じる", () => {
    render(<VersionDialog info={{ builtAt: "", commit: "" }} />);
    fireEvent.click(screen.getByRole("button", { name: "バージョン情報" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("不明");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
