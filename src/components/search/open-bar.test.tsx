import {
  cleanup,
  fireEvent,
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
import type { EgoSearchApi, OpenTarget } from "@/api";
import { createBackend } from "@/backend";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { mount, Seed } from "./harness";
import { OpenBar } from "./open-bar";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

async function setup(): Promise<EgoSearchApi> {
  const api = createBackend({ kv: new MemoryAdapter(), clock });
  const data = await api.data.init();
  for (const list of data.chips.values())
    for (const c of list) await api.data.chips.setOn(c.id, false);
  return api;
}

let open: Mock<
  (url?: string | URL, target?: string, features?: string) => Window | null
>;
let writeText: Mock<(text: string) => Promise<void>>;
beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["ja-JP"]);
  open = vi.fn(() => ({ opener: "x" }) as unknown as Window);
  vi.spyOn(window, "open").mockImplementation(open);
  writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const withWord = (word = "ぺこら") => (
  <>
    <Seed home={{ word, exact: false }} />
    <OpenBar />
  </>
);

describe("OpenBar：開く", () => {
  it("［X で開く］は X の検索 URL（最新タブ）を新しいタブで開き、履歴に残す", async () => {
    const api = await setup();
    await mount(api, withWord());
    fireEvent.click(await screen.findByRole("button", { name: "X で開く" }));
    expect(open).toHaveBeenCalledTimes(1);
    const [url, target] = open.mock.calls[0];
    expect(String(url)).toBe(
      "https://x.com/search?q=%E3%81%BA%E3%81%93%E3%82%89&f=live",
    );
    expect(target).toBe("_blank");
    await waitFor(async () => {
      const { history } = await api.data.init();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        query: "ぺこら",
        engine: "x",
        source: { kind: "home" },
      });
    });
  });

  it("［Yahoo で開く］は Yahoo!リアルタイム検索の URL を開く。title は正式名", async () => {
    await mount(await setup(), withWord());
    const button = await screen.findByRole("button", { name: "Yahoo で開く" });
    expect(button).toHaveAttribute("title", "Yahoo!リアルタイム検索で開く");
    fireEvent.click(button);
    expect(String(open.mock.calls[0][0])).toContain(
      "https://search.yahoo.co.jp/realtime/search?p=",
    );
  });

  it("相対期間は開くときの日付に展開して開き、履歴にも展開後を残す", async () => {
    const api = await setup();
    await mount(
      api,
      <>
        <Seed
          home={{
            word: "ぺこら",
            exact: false,
            period: { kind: "d1", from: "", to: "" },
          }}
        />
        <OpenBar />
      </>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "X で開く" }));
    expect(decodeURIComponent(String(open.mock.calls[0][0]))).toContain(
      "ぺこら since:2026-11-18",
    );
    await waitFor(async () =>
      expect((await api.data.init()).history[0].query).toBe(
        "ぺこら since:2026-11-18",
      ),
    );
  });

  it("検索語も条件も無いとき（blockers）は、開くボタンが押せず、タブも開かない", async () => {
    await mount(await setup(), <OpenBar />);
    const x = screen.getByRole("button", { name: "X で開く" });
    expect(x).toBeDisabled();
    expect(screen.getByRole("button", { name: "Yahoo で開く" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "この検索を保存" }),
    ).toBeEnabled();
    fireEvent.click(x);
    expect(open).not.toHaveBeenCalled();
  });

  it("ブロックされて開けなかったときは、開けなかった検索を知らせる（履歴にはすべて残す）", async () => {
    const api = await setup();
    open.mockReturnValue(null);
    const onBlocked = vi.fn<(total: number, blocked: OpenTarget[]) => void>();
    await mount(api, withWord(), { onBlocked });
    fireEvent.click(await screen.findByRole("button", { name: "X で開く" }));
    expect(onBlocked).toHaveBeenCalledTimes(1);
    expect(onBlocked.mock.calls[0][0]).toBe(1);
    expect(onBlocked.mock.calls[0][1]).toHaveLength(1);
    await waitFor(async () =>
      expect((await api.data.init()).history).toHaveLength(1),
    );
  });

  it("ページを開いただけでは、タブを開かない", async () => {
    await mount(await setup(), withWord());
    await screen.findByRole("button", { name: "X で開く" });
    expect(open).not.toHaveBeenCalled();
  });
});

describe("OpenBar：クエリ表示", () => {
  it("名前付きの region として読み上げられ、キーボードでフォーカスでき、中身は検索文字列", async () => {
    await mount(await setup(), withWord());
    const preview = await screen.findByRole("region", {
      name: "組み立てた検索クエリ（長いときは横にスクロール）",
    });
    expect(preview).toHaveAttribute("tabindex", "0");
    expect(preview).toHaveTextContent("ぺこら");
    preview.focus();
    expect(preview).toHaveFocus();
  });
});

describe("OpenBar：［⋯］", () => {
  it("リンクをコピー（X）／（Yahoo）は URL をコピーして知らせ、履歴には残さない", async () => {
    const api = await setup();
    await mount(api, withWord());
    fireEvent.click(
      await screen.findByRole("button", { name: "そのほかの操作" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "リンクをコピー（X）" }),
    );
    expect(writeText).toHaveBeenLastCalledWith(
      "https://x.com/search?q=%E3%81%BA%E3%81%93%E3%82%89&f=live",
    );
    expect(
      await screen.findByText("Xの検索リンクをコピーしました"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "リンクをコピー（X）" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "そのほかの操作" }));
    fireEvent.click(
      screen.getByRole("button", { name: "リンクをコピー（Yahoo）" }),
    );
    expect(writeText.mock.lastCall?.[0]).toContain(
      "https://search.yahoo.co.jp/realtime/search?p=",
    );
    expect((await api.data.init()).history).toHaveLength(0);
    expect(open).not.toHaveBeenCalled();
  });

  it("Esc で閉じて、［⋯］にフォーカスが戻る", async () => {
    await mount(await setup(), withWord());
    const more = await screen.findByRole("button", { name: "そのほかの操作" });
    fireEvent.click(more);
    fireEvent.keyDown(
      screen.getByRole("button", { name: "リンクをコピー（X）" }),
      { key: "Escape" },
    );
    expect(
      screen.queryByRole("button", { name: "リンクをコピー（X）" }),
    ).toBeNull();
    expect(more).toHaveFocus();
  });

  it("開閉は aria-expanded で伝え、矢印キーで動けない menu の役割は名乗らない", async () => {
    await mount(await setup(), withWord());
    const more = await screen.findByRole("button", { name: "そのほかの操作" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(more).not.toHaveAttribute("aria-haspopup");
    fireEvent.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("menuitem")).toBeNull();
  });

  it("blockers のときは、リンクのコピーもできない", async () => {
    await mount(await setup(), <OpenBar />);
    fireEvent.click(screen.getByRole("button", { name: "そのほかの操作" }));
    const item = screen.getByRole("button", { name: "リンクをコピー（X）" });
    expect(item).toBeDisabled();
    fireEvent.click(item);
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe("OpenBar：☆ 保存", () => {
  const openSheet = async () => {
    fireEvent.click(
      await screen.findByRole("button", { name: "この検索を保存" }),
    );
    return screen.findByRole("dialog", { name: "この検索を保存" });
  };

  it("名前欄は空で、プレースホルダーに検索語から作った名前を出し、保存する検索文字列を見せる", async () => {
    await mount(await setup(), withWord("ぺこら"));
    const dialog = await openSheet();
    const name = within(dialog).getByLabelText("お気に入りの名前");
    expect(name).toHaveValue("");
    expect(name).toHaveAttribute("placeholder", "ぺこら");
    expect(within(dialog).getByText("ぺこら")).toBeVisible();
    // 検索先の初期値は X
    expect(within(dialog).getByRole("radio", { name: "X" })).toBeChecked();
  });

  it("相対期間は記号のまま保存し、検索先を選べる。保存するとトーストで知らせてシートを閉じる", async () => {
    const api = await setup();
    await mount(
      api,
      <>
        <Seed
          home={{
            word: "ぺこら",
            exact: false,
            period: { kind: "d1", from: "", to: "" },
          }}
        />
        <OpenBar />
      </>,
    );
    const dialog = await openSheet();
    fireEvent.click(
      within(dialog).getByRole("radio", { name: "Yahoo!リアルタイム検索" }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    expect(await screen.findByText("お気に入りに保存しました")).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    const { favorites } = await api.data.init();
    expect(favorites).toHaveLength(1);
    // 名前を入力していないので、プレースホルダーの名前で保存する
    expect(favorites[0]).toMatchObject({
      name: "ぺこら",
      query: "ぺこら since:yesterday",
      engine: "yahoo",
      lastRunAt: null,
    });
  });

  it("名前が空白だけでも、プレースホルダーの名前で保存する。入力すればその名前で保存する", async () => {
    const api = await setup();
    await mount(api, withWord());
    let dialog = await openSheet();
    fireEvent.change(within(dialog).getByLabelText("お気に入りの名前"), {
      target: { value: "  " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    await waitFor(async () =>
      expect((await api.data.init()).favorites.map((f) => f.name)).toEqual([
        "ぺこら",
      ]),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    dialog = await openSheet();
    fireEvent.change(within(dialog).getByLabelText("お気に入りの名前"), {
      target: { value: "朝の確認" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    await waitFor(async () =>
      expect((await api.data.init()).favorites.map((f) => f.name)).toContain(
        "朝の確認",
      ),
    );
  });

  it("長い検索語は切り詰めて末尾に「…」を付けた名前になる", async () => {
    await mount(
      await setup(),
      withWord("あいうえおかきくけこさしすせそたちつてとなにぬねの"),
    );
    const dialog = await openSheet();
    expect(within(dialog).getByLabelText("お気に入りの名前")).toHaveAttribute(
      "placeholder",
      "あいうえおかきくけこさしすせそたちつてとなにぬ…",
    );
  });

  it("期間の開始日が終了日より後のときは保存せず、理由を出す", async () => {
    const api = await setup();
    await mount(
      api,
      <>
        <Seed
          home={{
            word: "ぺこら",
            period: { kind: "date", from: "2026-11-10", to: "2026-11-01" },
          }}
        />
        <OpenBar />
      </>,
    );
    const dialog = await openSheet();
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "期間の開始日が終了日より後になっています",
    );
    expect((await api.data.init()).favorites).toHaveLength(0);
  });

  it("既存のいつものエゴサに追加できる", async () => {
    const api = await setup();
    const group = await api.data.groups.save({
      name: "配信後エゴサ",
      items: [{ query: "既存", engine: "x" }],
    });
    await mount(api, withWord());
    const dialog = await openSheet();
    fireEvent.click(
      within(dialog).getByRole("radio", { name: "「配信後エゴサ」に追加" }),
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    expect(
      await screen.findByText(
        "お気に入りに保存し、「配信後エゴサ」に追加しました",
      ),
    ).toBeVisible();
    const saved = (await api.data.init()).groups.find((g) => g.id === group.id);
    expect(saved?.items).toEqual([
      { query: "既存", engine: "x" },
      { query: "ぺこら", engine: "x" },
    ]);
  });

  it("新しいいつものエゴサを作る：名前が空ならお気に入りの名前と同じ（プレースホルダー）。入力すればその名前", async () => {
    const api = await setup();
    await mount(api, withWord());
    const dialog = await openSheet();
    fireEvent.click(
      within(dialog).getByRole("radio", { name: "新しいいつものエゴサを作る" }),
    );
    const groupName = within(dialog).getByLabelText(
      "新しいいつものエゴサの名前（初期値はお気に入りの名前）",
    );
    expect(groupName).toHaveValue("");
    expect(groupName).toHaveAttribute("placeholder", "ぺこら");
    // お気に入りの名前を直すと、空のうちは追従する
    fireEvent.change(within(dialog).getByLabelText("お気に入りの名前"), {
      target: { value: "朝の確認" },
    });
    expect(groupName).toHaveAttribute("placeholder", "朝の確認");

    fireEvent.change(groupName, { target: { value: "毎朝" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    await waitFor(async () => {
      const { groups, favorites } = await api.data.init();
      expect(favorites[0].name).toBe("朝の確認");
      expect(groups).toHaveLength(1);
      expect(groups[0]).toMatchObject({
        name: "毎朝",
        items: [{ query: "ぺこら", engine: "x" }],
      });
    });
  });

  it("［キャンセル］と Esc では何も保存せず、押した［☆ 保存］にフォーカスが戻る", async () => {
    const api = await setup();
    await mount(api, withWord());
    const trigger = await screen.findByRole("button", {
      name: "この検索を保存",
    });
    const dialog = await openSheet();
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(trigger).toHaveFocus();

    const again = await openSheet();
    fireEvent.keyDown(again, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await api.data.init()).favorites).toHaveLength(0);
  });

  it("開いたシートを閉じて開き直すと、入力は初期値に戻る", async () => {
    await mount(await setup(), withWord());
    let dialog = await openSheet();
    fireEvent.change(within(dialog).getByLabelText("お気に入りの名前"), {
      target: { value: "途中" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    dialog = await openSheet();
    expect(within(dialog).getByLabelText("お気に入りの名前")).toHaveValue("");
  });
});
