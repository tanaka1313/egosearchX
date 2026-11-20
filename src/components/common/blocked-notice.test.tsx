import { cleanup, fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenTarget } from "@/api";
import { createBackend } from "@/backend";
import { mount } from "@/components/search/harness";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { BlockedNotice } from "./blocked-notice";

const target = (
  engine: "x" | "yahoo",
  query: string,
  n: number,
): OpenTarget => ({
  engine,
  query,
  url: `https://example.test/${n}`,
  stored: query,
  warnings: [],
});
const targets = [
  target("x", "ぺこら", 1),
  target("yahoo", "歌枠", 2),
  target("x", "切り抜き", 3),
];

async function mountNotice() {
  const api = createBackend({
    kv: new MemoryAdapter(),
    clock: { today: () => "2026-11-20", now: () => "2026-11-20T03:00:00.000Z" },
  });
  await api.data.init();
  // 一覧が新しい配列に差し替わる（＝新しい実行）ときを再現する
  function Host() {
    const [list, setList] = useState(targets);
    return (
      <>
        <button type="button" onClick={() => setList([...targets])}>
          再実行
        </button>
        <BlockedNotice total={4} blocked={list} />
      </>
    );
  }
  return mount(api, <Host />, { scope: false });
}

const nextButton = () =>
  screen.getByRole("button", { name: /次を開く|すべて開きました/ });

beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
    "ja-JP",
  ]);
  vi.spyOn(window, "open").mockImplementation(() => ({}) as Window);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("BlockedNotice の［次を開く］", () => {
  it("押すたびに、未開封の先頭を1件だけ開き、件数が進む", async () => {
    await mountNotice();
    expect(nextButton().textContent).toBe("次を開く（1/3）");
    fireEvent.click(nextButton());
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(vi.mocked(window.open).mock.calls[0][0]).toBe(targets[0].url);
    expect(nextButton().textContent).toBe("次を開く（2/3）");
    fireEvent.click(nextButton());
    expect(vi.mocked(window.open).mock.calls[1][0]).toBe(targets[1].url);
  });

  it("全部開くと『すべて開きました』になって無効になり、それ以上は開かない", async () => {
    await mountNotice();
    for (let i = 0; i < 3; i++) fireEvent.click(nextButton());
    expect(nextButton().textContent).toBe("すべて開きました");
    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(nextButton());
    expect(window.open).toHaveBeenCalledTimes(3);
  });

  it("個別リンクを押した行は飛ばし、開いた行には印が付く", async () => {
    await mountNotice();
    fireEvent.click(screen.getByRole("link", { name: "ぺこら" }));
    expect(screen.getAllByText("開いた")).toHaveLength(1);
    expect(nextButton().textContent).toBe("次を開く（2/3）");
    fireEvent.click(nextButton());
    expect(vi.mocked(window.open).mock.calls[0][0]).toBe(targets[1].url);
    expect(nextButton().textContent).toBe("次を開く（3/3）");
  });

  it("開けなかった一覧が新しくなったら、開いた印をリセットする", async () => {
    await mountNotice();
    fireEvent.click(nextButton());
    expect(screen.getAllByText("開いた")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "再実行" }));
    expect(nextButton().textContent).toBe("次を開く（1/3）");
    expect(screen.queryByText("開いた")).toBeNull();
  });

  it("開けなかったとき（null）は印を付けず、同じ件を再び試せる", async () => {
    vi.mocked(window.open).mockImplementation(() => null);
    await mountNotice();
    fireEvent.click(nextButton());
    expect(screen.queryByText("開いた")).toBeNull();
    expect(nextButton().textContent).toBe("次を開く（1/3）");
  });
});
