import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import type { EgoSearchApi } from "@/api";
import { createBackend } from "@/backend";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { ApiProvider } from "@/store/api-context";
import { I18nProvider } from "@/store/i18n-context";
import { StoreProvider } from "@/store/store-context";
import { AppShell } from "./app-shell";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push }),
}));

const CLOCK = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

async function seed() {
  const api = createBackend({ kv: new MemoryAdapter(), clock: CLOCK });
  await api.data.init();
  await api.data.groups.save({
    name: "配信後",
    items: [
      { query: "ぺこら", engine: "both" },
      { query: "まりん", engine: "x" },
    ],
  });
  await api.data.groups.save({
    name: "朝",
    items: [{ query: "朝の検索", engine: "x" }],
  });
  await api.data.favorites.save({
    name: "ぺこらエゴサ",
    query: "ぺこら -filter:retweets",
    engine: "yahoo",
  });
  return api;
}

const mount = (api: EgoSearchApi, children = <p>本文</p>) =>
  render(
    <ApiProvider api={api}>
      <StoreProvider>
        <I18nProvider>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </StoreProvider>
    </ApiProvider>,
  );

const pressK = (init: KeyboardEventInit = { ctrlKey: true }) =>
  fireEvent.keyDown(window, { key: "k", ...init });

const palette = () => screen.findByRole("dialog", { name: "コマンドパレット" });
const input = () =>
  screen.getByRole("textbox", { name: "実行・移動先を絞り込み" });

let open: Mock<
  (url?: string | URL, target?: string, features?: string) => Window | null
>;
beforeEach(() => {
  push.mockClear();
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["ja-JP"]);
  open = vi.fn(() => ({ opener: "x" }) as unknown as Window);
  vi.spyOn(window, "open").mockImplementation(open);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("コマンドパレットを開く", () => {
  it("Ctrl+K で開き、入力欄にフォーカスする。⌘+K でも開く", async () => {
    mount(await seed());
    await screen.findByRole("group", { name: "いつものエゴサ" });
    pressK();
    const dialog = await palette();
    await waitFor(() => expect(input()).toHaveFocus());
    expect(dialog).toBeVisible();
    fireEvent.keyDown(input(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    pressK({ metaKey: true });
    expect(await palette()).toBeVisible();
  });

  it("Ctrl+Shift+K・Alt+Ctrl+K・押しっぱなし・変換中では開かない", async () => {
    mount(await seed());
    await screen.findByRole("group", { name: "いつものエゴサ" });
    pressK({ ctrlKey: true, shiftKey: true });
    pressK({ ctrlKey: true, altKey: true });
    pressK({ ctrlKey: true, repeat: true });
    pressK({ ctrlKey: true, isComposing: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("左メニューの［コマンドパレット］（Ctrl/⌘+K の表示付き）から開ける", async () => {
    mount(await seed());
    await screen.findByRole("group", { name: "いつものエゴサ" });
    const item = screen.getAllByRole("button", { name: /コマンドパレット/ })[0];
    expect(within(item).getByText("Ctrl/⌘+K")).toBeVisible();
    fireEvent.click(item);
    expect(await palette()).toBeVisible();
  });

  it("ドロワーが開いているときの Ctrl+K は、ドロワーを閉じてパレットを開く", async () => {
    mount(await seed());
    fireEvent.click(
      await screen.findByRole("button", { name: "メニューを開く" }),
    );
    expect(
      await screen.findByRole("navigation", { name: "メニュー" }),
    ).toBeVisible();
    pressK();
    expect(await palette()).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "メニュー" })).toBeNull();
  });

  it("確認ダイアログなど、ほかのダイアログが開いている間は開かない", async () => {
    mount(
      await seed(),
      <div role="alertdialog" aria-label="完全に削除しますか？">
        確認
      </div>,
    );
    await screen.findByRole("group", { name: "いつものエゴサ" });
    pressK();
    expect(
      screen.queryByRole("dialog", { name: "コマンドパレット" }),
    ).toBeNull();
  });
});

describe("並びと絞り込み", () => {
  it("いつものエゴサ → お気に入り → ページの順に並ぶ", async () => {
    mount(await seed());
    await screen.findByRole("group", { name: "いつものエゴサ" });
    pressK();
    const dialog = await palette();
    const labels = within(dialog)
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(labels.slice(0, 4)).toEqual([
      "▶ いつものエゴサ：配信後（2個）",
      "▶ いつものエゴサ：朝（1個）",
      "▶ お気に入り：ぺこらエゴサ",
      "→ ホームへ移動",
    ]);
    expect(labels).toContain("→ このサイトについてへ移動");
  });

  it("入力した文字を含むものだけに絞る。無ければ「該当なし」", async () => {
    mount(await seed());
    await screen.findByRole("group", { name: "いつものエゴサ" });
    pressK();
    const dialog = await palette();
    fireEvent.change(input(), { target: { value: "ぺこら" } });
    expect(
      within(dialog)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["▶ お気に入り：ぺこらエゴサ"]);
    fireEvent.change(input(), { target: { value: "ありません" } });
    expect(within(dialog).queryAllByRole("button")).toHaveLength(0);
    expect(within(dialog).getByText("該当なし")).toBeVisible();
  });
});

describe("実行と移動", () => {
  it("Enter で先頭を実行（いつものエゴサの全項目を同じクリックの中で開く）し、閉じて履歴に残す", async () => {
    const api = await seed();
    mount(api);
    await screen.findByRole("group", { name: "いつものエゴサ" });
    pressK();
    await palette();
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(open).toHaveBeenCalledTimes(3);
    expect(String(open.mock.calls[0][0])).toContain("x.com/search");
    expect(String(open.mock.calls[1][0])).toContain("search.yahoo.co.jp");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(async () => {
      const data = await api.data.init();
      expect(data.history).toHaveLength(3);
      expect(data.history[0].source).toMatchObject({
        kind: "group",
        label: "配信後",
      });
      expect(data.groups.find((g) => g.name === "配信後")?.lastRunAt).toBe(
        CLOCK.now(),
      );
    });
  });

  it("お気に入りは保存した検索先で1タブだけ開く", async () => {
    const api = await seed();
    mount(api);
    await screen.findByRole("group", { name: "いつものエゴサ" });
    pressK();
    const dialog = await palette();
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "▶ お気に入り：ぺこらエゴサ",
      }),
    );
    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toContain("search.yahoo.co.jp");
    await waitFor(async () =>
      expect((await api.data.init()).history[0].source).toMatchObject({
        kind: "favorite",
        label: "ぺこらエゴサ",
      }),
    );
  });

  it("ページの項目は移動するだけで、検索は開かない", async () => {
    mount(await seed());
    await screen.findByRole("group", { name: "いつものエゴサ" });
    pressK();
    const dialog = await palette();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "→ 履歴へ移動" }),
    );
    expect(push).toHaveBeenCalledWith("/history");
    expect(open).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("日本語入力の変換中の Enter は実行しない", async () => {
    mount(await seed());
    await screen.findByRole("group", { name: "いつものエゴサ" });
    pressK();
    await palette();
    fireEvent.keyDown(input(), { key: "Enter", isComposing: true });
    expect(open).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeVisible();
  });

  it("開けなかった検索（ポップアップのブロック）は、帯の下に個別リンクで出す", async () => {
    open.mockImplementation(() => null);
    mount(await seed());
    await screen.findByRole("group", { name: "いつものエゴサ" });
    pressK();
    await palette();
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(await screen.findByRole("status")).toBeVisible();
    expect(
      within(screen.getByRole("status")).getAllByRole("link"),
    ).toHaveLength(3);
  });

  it("0件のときの Enter は何もしない", async () => {
    mount(await seed());
    await screen.findByRole("group", { name: "いつものエゴサ" });
    pressK();
    await palette();
    fireEvent.change(input(), { target: { value: "ありません" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(open).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeVisible();
  });
});

describe("閉じる", () => {
  it("Esc で閉じて、開く前にフォーカスのあった要素へ戻る", async () => {
    mount(await seed());
    const toggle = await screen.findByRole("button", {
      name: "メニューを開く",
    });
    toggle.focus();
    pressK();
    await palette();
    fireEvent.keyDown(input(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(toggle).toHaveFocus());
  });
});

describe("英語", () => {
  it("英語の画面では文言が英語になる", async () => {
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["en-US"]);
    mount(await seed());
    await screen.findByRole("group", { name: "Routines" });
    pressK();
    const dialog = await screen.findByRole("dialog", {
      name: "Command palette",
    });
    expect(
      within(dialog).getByRole("button", { name: "▶ Routine: 朝 (1)" }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "→ Go to History" }),
    ).toBeVisible();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Filter actions and pages" }),
      { target: { value: "zzz" } },
    );
    expect(within(dialog).getByText("No matches")).toBeVisible();
  });
});
