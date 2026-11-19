import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBackend } from "@/backend";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { ApiProvider } from "@/store/api-context";
import { I18nProvider } from "@/store/i18n-context";
import { StoreProvider } from "@/store/store-context";
import { CorruptNotice } from "./corrupt-notice";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};
const BROKEN = "{壊れた";
const FAV_KEY = "egosearch:v2:favorites";

const mount = (kv: MemoryAdapter) =>
  render(
    <ApiProvider api={createBackend({ kv, clock })}>
      <StoreProvider>
        <I18nProvider>
          <button>前の要素</button>
          <CorruptNotice />
        </I18nProvider>
      </StoreProvider>
    </ApiProvider>,
  );

const corruptKv = async () => {
  const kv = new MemoryAdapter();
  await kv.set("egosearch:meta", JSON.stringify({ version: 1 }));
  await kv.set(FAV_KEY, BROKEN);
  return kv;
};

beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["ja-JP"]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CorruptNotice", () => {
  it("保存データが正常なら何も出さない", async () => {
    mount(new MemoryAdapter());
    await waitFor(() => expect(screen.getByText("前の要素")).toBeVisible());
    await new Promise((r) => setTimeout(r, 50)); // 読み込みの完了を待つ
    expect(screen.queryByText(/復元できません/)).toBeNull();
  });

  it("壊れているとき、文言と［データを初期化する］を出し、フォーカスは奪わない", async () => {
    mount(await corruptKv());
    expect(await screen.findByText(/復元できません/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "データを初期化する" }),
    ).toBeVisible();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it("押すと確認ダイアログ（D3）が開き、［キャンセル］が初期フォーカス。キャンセルしても何も消さない", async () => {
    const kv = await corruptKv();
    mount(kv);
    fireEvent.click(
      await screen.findByRole("button", { name: "データを初期化する" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("データを初期化しますか？");
    expect(dialog).toHaveTextContent("元に戻せません");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "キャンセル" })).toHaveFocus(),
    );
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByText(/復元できません/)).toBeVisible();
    expect(await kv.get(FAV_KEY)).toBe(BROKEN);
  });

  it("キャンセルで閉じると［データを初期化する］へフォーカスが戻る", async () => {
    mount(await corruptKv());
    const opener = await screen.findByRole("button", {
      name: "データを初期化する",
    });
    opener.focus();
    fireEvent.click(opener);
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("Esc で閉じても何も消さない", async () => {
    const kv = await corruptKv();
    mount(kv);
    fireEvent.click(
      await screen.findByRole("button", { name: "データを初期化する" }),
    );
    await screen.findByRole("alertdialog");
    fireEvent.keyDown(document.activeElement ?? document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(await kv.get(FAV_KEY)).toBe(BROKEN);
  });

  it("［初期化する］で保存データを破棄し、表示が消えて、プリセットから作り直される", async () => {
    const kv = await corruptKv();
    mount(kv);
    fireEvent.click(
      await screen.findByRole("button", { name: "データを初期化する" }),
    );
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "初期化する" }));
    await waitFor(() =>
      expect(screen.queryByText(/復元できません/)).toBeNull(),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(await kv.get(FAV_KEY)).not.toBe(BROKEN);
    expect(await kv.get("egosearch:v2:chips")).toContain("hololive");
  });
});
