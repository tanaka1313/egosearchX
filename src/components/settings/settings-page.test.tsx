import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBackend } from "@/backend";
import { mount } from "@/components/search/harness";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { SettingsPage } from "./settings-page";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
    "ja-JP",
  ]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const group = () => screen.getByRole("radiogroup", { name: "興味の対象" });

describe("S11：設定（興味の対象）", () => {
  it("見出し「設定」と、「試験的」の表示、3つの選択肢（既定はホロライブ）を出す", async () => {
    const api = createBackend({ kv: new MemoryAdapter(), clock });
    await mount(api, <SettingsPage />, { scope: false });
    expect(screen.getByRole("heading", { name: "設定" })).toBeInTheDocument();
    expect(screen.getByText("試験的")).toBeInTheDocument();
    const radios = within(group()).getAllByRole("radio");
    expect(
      radios.map((r) => r.getAttribute("aria-label") ?? r.id),
    ).toHaveLength(3);
    expect(
      within(group()).getByRole("radio", { name: "ホロライブ" }),
    ).toBeChecked();
    expect(
      within(group()).getByRole("radio", { name: "にじさんじ" }),
    ).not.toBeChecked();
    expect(
      within(group()).getByRole("radio", { name: "その他" }),
    ).not.toBeChecked();
  });

  it("選ぶと prefs.interest が保存され、再読み込み後も残る", async () => {
    const kv = new MemoryAdapter();
    const api = createBackend({ kv, clock });
    await mount(api, <SettingsPage />, { scope: false });
    fireEvent.click(within(group()).getByRole("radio", { name: "にじさんじ" }));
    await waitFor(async () =>
      expect((await api.data.init()).prefs.interest).toBe("nijisanji"),
    );
    expect(
      within(group()).getByRole("radio", { name: "にじさんじ" }),
    ).toBeChecked();

    cleanup();
    const again = createBackend({ kv, clock }); // 同じ保存先から作り直す
    await mount(again, <SettingsPage />, { scope: false });
    expect(
      within(group()).getByRole("radio", { name: "にじさんじ" }),
    ).toBeChecked();
  });

  it("説明文に、条件ボタンだけが切り替わり、この端末にだけ保存されることを書く", async () => {
    const api = createBackend({ kv: new MemoryAdapter(), clock });
    await mount(api, <SettingsPage />, { scope: false });
    expect(screen.getByText(/この端末にだけ保存します/)).toBeInTheDocument();
  });
});

describe("S11：設定（データをすべて初期化）", () => {
  const setupData = async () => {
    const api = createBackend({ kv: new MemoryAdapter(), clock });
    await api.data.init();
    await api.data.favorites.save({
      name: "ぺこら",
      query: "ぺこら",
      engine: "x",
    });
    await api.data.groups.save({
      name: "配信後",
      items: [{ query: "ぺこら", engine: "x" }],
    });
    await mount(api, <SettingsPage />, { scope: false });
    return api;
  };

  it("［データをすべて初期化］を押すと、消える内容を書いた確認を出し、［キャンセル］では何も消さない", async () => {
    const api = await setupData();
    fireEvent.click(
      screen.getByRole("button", { name: "データをすべて初期化" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("データを初期化しますか？");
    expect(dialog).toHaveTextContent("元に戻せません");
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    const data = await api.data.init();
    expect(data.favorites).toHaveLength(1);
    expect(data.groups).toHaveLength(1);
  });

  it("確認で［初期化する］を押すと、お気に入り・いつものエゴサを消してプリセットに戻し、トーストで知らせる", async () => {
    const api = await setupData();
    fireEvent.click(
      screen.getByRole("button", { name: "データをすべて初期化" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "初期化する" }));
    expect(
      await screen.findByText("データを初期化しました"),
    ).toBeInTheDocument();
    const data = await api.data.init();
    expect(data.favorites).toEqual([]);
    expect(data.groups).toEqual([]);
    expect(data.chips.get("hololive")?.length).toBeGreaterThan(0);
  });
});
