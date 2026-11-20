import {
  act,
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
import type { EgoSearchApi, RunSource } from "@/api";
import { createBackend } from "@/backend";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { ApiProvider } from "@/store/api-context";
import { I18nProvider } from "@/store/i18n-context";
import { StoreProvider } from "@/store/store-context";
import { AppShell } from "./app-shell";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

const TODAY = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};
const YESTERDAY = {
  today: () => "2026-11-18",
  now: () => "2026-11-18T03:00:00.000Z",
};

const apiOf = (kv: MemoryAdapter, clock = TODAY) =>
  createBackend({ kv, clock });

const source = (groupId?: string): RunSource => ({
  kind: "group",
  label: "配信後エゴサ",
  groupId,
});

/** グループを保存して実行した履歴を作る（lastRunAt は clock.now()） */
async function seedGroup(
  api: EgoSearchApi,
  name: string,
  items: { query: string; engine: "x" | "yahoo" | "both" }[],
  run = false,
) {
  await api.data.init();
  const g = await api.data.groups.save({ name, items });
  if (run) await api.data.history.record(api.url.plan(items), source(g.id));
  return g;
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

let open: Mock<
  (url?: string | URL, target?: string, features?: string) => Window | null
>;
beforeEach(() => {
  pathname = "/";
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["ja-JP"]);
  open = vi.fn(() => ({ opener: "x" }) as unknown as Window);
  vi.spyOn(window, "open").mockImplementation(open);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ヘッダー", () => {
  it("サイト名（ホームへのリンク）・機能タイトル・本文が出る。興味の対象の切替は置かない（設定ページへ移した）", async () => {
    mount(apiOf(new MemoryAdapter()));
    expect(
      await screen.findByRole("link", { name: "Hololive EgoSearch" }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByLabelText("機能：X（Twitter）")).toBeVisible();
    expect(screen.getByText("本文")).toBeVisible();
    expect(screen.queryByRole("button", { name: /興味の対象/ })).toBeNull();
  });
});

describe("いつものエゴサの帯", () => {
  it("0件のときは案内を出し、［＋］は追加ページへのリンク", async () => {
    mount(apiOf(new MemoryAdapter()));
    expect(await screen.findByText("まとめて1タップで開けます")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "いつものエゴサを追加" }),
    ).toHaveAttribute("href", "/groups/edit");
  });

  it("先頭 LIMITS.headerGroups（2）件だけ並べ、今日実行したものにだけ✓を付ける", async () => {
    const kv = new MemoryAdapter();
    const past = apiOf(kv, YESTERDAY);
    await seedGroup(past, "朝", [{ query: "朝の検索", engine: "x" }], true);
    const now = apiOf(kv, TODAY);
    await seedGroup(now, "昼", [{ query: "昼の検索", engine: "x" }], true);
    await seedGroup(now, "夜", [{ query: "夜の検索", engine: "x" }]);
    mount(now);
    const strip = await screen.findByRole("group", { name: "いつものエゴサ" });
    const buttons = within(strip).getAllByRole("button");
    expect(buttons).toHaveLength(2);
    // 朝は昨日の実行なので✓なし、昼は今日の実行なので✓あり。3件目の夜は出ない
    expect(buttons[0]).toHaveAccessibleName("朝（1個）を実行");
    expect(buttons[1]).toHaveAccessibleName("昼（1個）を実行（今日は済）");
    expect(within(strip).queryByText(/夜/)).toBeNull();
  });

  it("押すとクリックの中で項目のタブを開き（両方は2タブ）、履歴に残して✓が付く", async () => {
    const api = apiOf(new MemoryAdapter());
    await seedGroup(api, "配信後", [
      { query: "ぺこら", engine: "both" },
      { query: "まりん", engine: "x" },
    ]);
    mount(api);
    const run = await screen.findByRole("button", {
      name: "配信後（2個）を実行",
    });
    expect(run).toBeVisible();
    fireEvent.click(run);
    expect(open).toHaveBeenCalledTimes(3);
    const urls = open.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain("x.com/search");
    expect(urls[1]).toContain("search.yahoo.co.jp");
    expect(open.mock.calls[0][1]).toBe("_blank");
    // noopener を features に渡すと戻り値が常に null になり、ブロックを検出できない
    expect(open.mock.calls[0][2]).toBeUndefined();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "配信後（2個）を実行（今日は済）" }),
      ).toBeVisible(),
    );
    const data = await api.data.init();
    expect(data.history).toHaveLength(3);
  });

  it("ポップアップがブロックされたら、帯の下に件数と個別リンクを出す（モーダルにしない・フォーカスを奪わない）", async () => {
    const api = apiOf(new MemoryAdapter());
    await seedGroup(api, "配信後", [
      { query: "ぺこら", engine: "x" },
      { query: "まりん", engine: "yahoo" },
    ]);
    // 1つ目は開け、2つ目はブロックされる
    open
      .mockImplementationOnce(() => ({ opener: "x" }) as unknown as Window)
      .mockImplementationOnce(() => null);
    mount(api);
    fireEvent.click(
      await screen.findByRole("button", { name: "配信後（2個）を実行" }),
    );
    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent("2件中1件を開けませんでした");
    const link = within(notice).getByRole("link", { name: /まりん/ });
    expect(link).toHaveAttribute("href", expect.stringContaining("yahoo"));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
    expect(within(notice).getByText(/Yahoo!リアルタイム検索/)).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(notice.contains(document.activeElement)).toBe(false);
    // 履歴には、開けなかったものも含め実行したすべてを残す
    await waitFor(async () =>
      expect((await api.data.init()).history).toHaveLength(2),
    );
    fireEvent.click(within(notice).getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("フッター", () => {
  it("履歴が無いときは案内と非公式の表記を出す", async () => {
    mount(apiOf(new MemoryAdapter()));
    expect(await screen.findByText("実行するとここに残ります")).toBeVisible();
    expect(screen.getByText(/ファンが作った非公式/)).toBeVisible();
    expect(
      within(screen.getByRole("contentinfo")).getByRole("link", {
        name: /履歴/,
      }),
    ).toHaveAttribute("href", "/history");
  });

  it("最後の履歴を1件だけ、日時と検索文字列で出す", async () => {
    const kv = new MemoryAdapter();
    const past = apiOf(kv, YESTERDAY);
    await past.data.init();
    await past.data.history.record(
      past.url.plan([{ query: "古い検索", engine: "x" }]),
      { kind: "home", label: "" },
    );
    const api = apiOf(kv, TODAY);
    await api.data.history.record(
      api.url.plan([{ query: "新しい検索", engine: "x" }]),
      { kind: "home", label: "" },
    );
    mount(api);
    const footer = await screen.findByRole("contentinfo");
    await waitFor(() => expect(footer).toHaveTextContent("新しい検索"));
    expect(footer).toHaveTextContent("11/19 12:00");
    expect(footer).not.toHaveTextContent("古い検索");
  });

  it("［再実行］は同じ検索を開いて履歴に足すが、いつものエゴサの lastRunAt は動かさない", async () => {
    const kv = new MemoryAdapter();
    const past = apiOf(kv, YESTERDAY);
    const g = await seedGroup(
      past,
      "朝",
      [{ query: "朝の検索", engine: "x" }],
      true,
    );
    const api = apiOf(kv, TODAY);
    mount(api);
    const footer = await screen.findByRole("contentinfo");
    await waitFor(() => expect(footer).toHaveTextContent("朝の検索"));
    fireEvent.click(within(footer).getByRole("button", { name: "再実行" }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toContain("x.com/search");
    await waitFor(async () =>
      expect((await api.data.init()).history).toHaveLength(2),
    );
    const after = (await api.data.init()).groups.find((x) => x.id === g.id);
    expect(after?.lastRunAt).toBe("2026-11-18T03:00:00.000Z");
  });

  it("ランチャー（/launch）ではフッターを出さないが、帯は出す", async () => {
    pathname = "/launch";
    mount(apiOf(new MemoryAdapter()));
    expect(await screen.findByText("まとめて1タップで開けます")).toBeVisible();
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });
});

describe("左メニュー", () => {
  const openMenu = async () => {
    const toggle = await screen.findByRole("button", {
      name: "メニューを開く",
    });
    fireEvent.click(toggle);
    const nav = await screen.findByRole("navigation", { name: "メニュー" });
    return { toggle, nav };
  };

  it("項目が縦に並び、現在のページに aria-current と「表示中」が付く", async () => {
    pathname = "/history";
    mount(apiOf(new MemoryAdapter()));
    const { nav } = await openMenu();
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/",
      "/buttons",
      "/favorites",
      "/groups",
      "/history",
      "/trash",
      "/import",
      "/settings",
      "/about",
    ]);
    expect(within(nav).getByRole("link", { name: "設定" })).toBeVisible();
    const here = within(nav).getByRole("link", { name: /履歴/ });
    expect(here).toHaveAttribute("aria-current", "page");
    expect(here).toHaveTextContent("表示中");
    expect(
      within(nav).getByRole("link", { name: "ホーム" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("管理ページの読み上げは「〇〇の管理」", async () => {
    mount(apiOf(new MemoryAdapter()));
    const { nav } = await openMenu();
    for (const name of ["条件ボタン", "お気に入り", "いつものエゴサ"])
      expect(
        within(nav).getByRole("link", { name: `${name}の管理` }),
      ).toBeVisible();
    expect(within(nav).getByRole("link", { name: "履歴" })).toBeVisible();
  });

  it("開くと［×］にフォーカス。Esc で閉じて［≡］へ戻る。項目を押すと閉じる", async () => {
    mount(apiOf(new MemoryAdapter()));
    const { toggle, nav } = await openMenu();
    expect(
      within(nav).getByRole("button", { name: "メニューを閉じる" }),
    ).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("navigation", { name: "メニュー" })).toBeNull(),
    );
    expect(toggle).toHaveFocus();

    fireEvent.click(toggle);
    const nav2 = await screen.findByRole("navigation", { name: "メニュー" });
    fireEvent.click(within(nav2).getByRole("link", { name: /^ホーム/ }));
    expect(screen.queryByRole("navigation", { name: "メニュー" })).toBeNull();
  });

  it("メニューの中でバージョン情報を開いて Esc を押すと、バージョン情報だけが閉じ、メニューは開いたまま", async () => {
    mount(apiOf(new MemoryAdapter()));
    const { nav } = await openMenu();
    const trigger = within(nav).getByRole("button", {
      name: "バージョン情報",
    });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", {
      name: "バージョン情報",
    });
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("navigation", { name: "メニュー" })).toBeVisible();
  });

  it("下部に言語の切替とバージョン情報があり、削除済みの件数は0件なら出さない", async () => {
    mount(apiOf(new MemoryAdapter()));
    const { nav } = await openMenu();
    expect(within(nav).getByRole("group", { name: "言語" })).toBeVisible();
    expect(
      within(nav).getByRole("button", { name: "バージョン情報" }),
    ).toBeVisible();
    expect(
      within(nav).getByRole("link", { name: "削除済み" }),
    ).toHaveTextContent(/^削除済み$/);
  });

  it("削除済みに項目があれば件数のバッジを出す", async () => {
    const api = apiOf(new MemoryAdapter());
    await api.data.init();
    const g = await api.data.groups.save({
      name: "消す",
      items: [{ query: "x", engine: "x" }],
    });
    await api.data.groups.remove(g.id);
    mount(api);
    const { nav } = await openMenu();
    await waitFor(() =>
      expect(
        within(nav).getByRole("link", { name: /削除済み/ }),
      ).toHaveTextContent("1"),
    );
  });

  it("言語を切り替えると、メニュー・帯・フッターが英語になる", async () => {
    mount(apiOf(new MemoryAdapter()));
    const { nav } = await openMenu();
    await act(async () => {
      fireEvent.click(within(nav).getByRole("button", { name: "English" }));
    });
    expect(
      await screen.findByRole("navigation", { name: "Menu" }),
    ).toBeVisible();
    expect(
      screen.getByText("Open several searches with one tap"),
    ).toBeVisible();
    expect(screen.getByText(/unofficial/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Hololive EgoSearch" }),
    ).toBeVisible();
  });
});

describe("保存データが壊れているとき", () => {
  it("帯の下（本文の上）に CorruptNotice を出し、帯は空にする", async () => {
    const kv = new MemoryAdapter();
    await kv.set("egosearch:meta", JSON.stringify({ version: 1 }));
    await kv.set("egosearch:v2:favorites", "{壊れた");
    mount(apiOf(kv));
    expect(await screen.findByText(/復元できません/)).toBeVisible();
    expect(screen.queryByText("まとめて1タップで開けます")).toBeNull();
  });
});
