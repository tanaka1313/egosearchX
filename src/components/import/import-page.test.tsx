import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EgoSearchApi } from "@/api";
import { createBackend } from "@/backend";
import { mount } from "@/components/search/harness";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { useAppStore } from "@/store/store-context";
import { ImportPage } from "./import-page";

// jsdom でシートを開く操作が重く、並列実行の負荷で5秒を超えることがあるため、このファイルだけ延ばす
vi.setConfig({ testTimeout: 30_000 });

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

// ぺこら filter:images -filter:retweets foo:bar（foo:bar は解析できない）
const X_URL =
  "https://x.com/search?q=%E3%81%BA%E3%81%93%E3%82%89%20filter%3Aimages%20-filter%3Aretweets%20foo%3Abar&f=live";
const YAHOO_URL =
  "https://search.yahoo.co.jp/realtime/search?p=%E3%81%BA%E3%81%93%E3%82%89&ei=UTF-8";

function Probe() {
  const home = useAppStore((s) => s.home);
  return <output aria-label="home">{JSON.stringify(home)}</output>;
}

async function setup(): Promise<EgoSearchApi> {
  const api = createBackend({ kv: new MemoryAdapter(), clock });
  await api.data.init();
  return api;
}
const mountPage = (api: EgoSearchApi) =>
  mount(
    api,
    <>
      <ImportPage />
      <Probe />
    </>,
    { scope: false },
  );
const paste = (text: string) =>
  fireEvent.change(screen.getByLabelText("取り込む URL"), {
    target: { value: text },
  });
const homeState = () =>
  JSON.parse(screen.getByLabelText("home").textContent ?? "{}") as {
    word: string;
    exact: boolean;
  };
const hololiveChips = async (api: EgoSearchApi) =>
  (await api.data.init()).chips.get("hololive")!;

beforeEach(() => {
  push.mockClear();
  vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
    "ja-JP",
  ]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("S7 URL解析：解析結果の表示", () => {
  it("X の URL を貼ると、トークンを1行ずつ出し、解析できない部分に「生トークン」を添える", async () => {
    await mountPage(await setup());
    paste(X_URL);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("code")?.textContent)).toEqual([
      "ぺこら",
      "filter:images",
      "-filter:retweets",
      "foo:bar",
    ]);
    expect(within(items[0]).getByText("条件")).toBeInTheDocument();
    expect(
      within(items[3]).getByText("生トークン（解析できなかった部分）"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("Yahoo!リアルタイム検索の URL も条件に分ける", async () => {
    await mountPage(await setup());
    paste(YAHOO_URL);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("code")?.textContent)).toEqual([
      "ぺこら",
    ]);
  });

  it.each([
    ["not a url", "URL として読み取れません"],
    [
      "https://example.com/search?q=a",
      "X または Yahoo!リアルタイム検索の URL ではありません",
    ],
    ["https://x.com/search?f=live", "検索語（q / p）が含まれていません"],
  ])(
    "読めない入力 %s は、入力欄の下に理由を出し、両方のボタンを押せなくする",
    async (input, reason) => {
      await mountPage(await setup());
      paste(input);
      expect(screen.getByRole("alert")).toHaveTextContent(reason);
      expect(screen.queryByRole("list")).toBeNull();
      expect(
        screen.getByRole("button", { name: "ホームで編集する" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "新規お気に入りとして保存" }),
      ).toBeDisabled();
    },
  );

  it("空（空白だけを含む）の入力では理由を出さず、両方のボタンを押せない", async () => {
    await mountPage(await setup());
    expect(screen.queryByRole("alert")).toBeNull();
    paste("   \n ");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("button", { name: "ホームで編集する" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "新規お気に入りとして保存" }),
    ).toBeDisabled();
  });

  it("英語の画面では理由もラベルも英語で出る", async () => {
    vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
      "en-US",
    ]);
    await mountPage(await setup());
    fireEvent.change(screen.getByLabelText("URL to analyze"), {
      target: { value: "not a url" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This cannot be read as a URL",
    );
    fireEvent.change(screen.getByLabelText("URL to analyze"), {
      target: { value: X_URL },
    });
    expect(
      screen.getByText("Raw token (could not be analyzed)"),
    ).toBeInTheDocument();
  });
});

describe("S7 URL解析：ホームで編集する", () => {
  it("検索語・条件ボタンの ON をホームへ展開し、ホームへ移動する（残りは詳細条件へ）", async () => {
    const api = await setup();
    const chips = await hololiveChips(api);
    const images = chips.find((c) => c.query === "filter:images")!;
    const noRt = chips.find((c) => c.query === "-filter:retweets")!;
    // 貼る URL とは逆の状態にしておく：画像つきが ON、RTを除くが OFF
    await api.data.chips.setOn(images.id, false);
    await api.data.chips.setOn(noRt.id, false);
    await api.data.chips.setOn(
      chips.find((c) => c.query === "lang:ja")!.id,
      true,
    );
    await mountPage(api);
    paste(X_URL);
    fireEvent.click(screen.getByRole("button", { name: "ホームで編集する" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    const after = await hololiveChips(api);
    expect(after.find((c) => c.id === images.id)!.on).toBe(true);
    expect(after.find((c) => c.id === noRt.id)!.on).toBe(true);
    expect(after.find((c) => c.query === "lang:ja")!.on).toBe(false);
    expect(homeState().word).toBe("ぺこら");
    expect(screen.getByLabelText("home").textContent).toContain("foo:bar");
  });

  it("非表示の条件ボタンは照合せず、ON なら OFF にして、その条件は詳細条件へ回す（要件定義書 11.4 ①）", async () => {
    const api = await setup();
    const images = (await hololiveChips(api)).find(
      (c) => c.query === "filter:images",
    )!;
    await api.data.chips.setOn(images.id, true);
    await api.data.chips.setVisible(images.id, false);
    await mountPage(api);
    paste(X_URL);
    fireEvent.click(screen.getByRole("button", { name: "ホームで編集する" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    const after = (await hololiveChips(api)).find((c) => c.id === images.id)!;
    expect(after.on).toBe(false);
    expect(after.visible).toBe(false);
    const home = JSON.parse(
      screen.getByLabelText("home").textContent ?? "{}",
    ) as { detail: { flt: Record<string, string> } };
    expect(home.detail.flt.images).toBe("inc");
  });

  it("貼った URL では保存済みのお気に入りを増やさず、書き換えもしない", async () => {
    const api = await setup();
    const before = await api.data.favorites.save({
      name: "既存",
      query: "ぺこら",
      engine: "x",
    });
    await mountPage(api);
    paste(X_URL);
    fireEvent.click(screen.getByRole("button", { name: "ホームで編集する" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect((await api.data.init()).favorites).toEqual([before]);
  });
});

describe("S7 URL解析：新規お気に入りとして保存", () => {
  it("シートを開き、名前の初期値は「<検索語> の検索」、検索先の初期値は貼った URL のもの", async () => {
    await mountPage(await setup());
    paste(YAHOO_URL);
    fireEvent.click(
      screen.getByRole("button", { name: "新規お気に入りとして保存" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("お気に入りの名前")).toHaveValue(
      "ぺこら の検索",
    );
    expect(
      within(dialog).getByRole("radio", { name: "Yahoo!リアルタイム検索" }),
    ).toBeChecked();
    expect(within(dialog).getByRole("radio", { name: "X" })).not.toBeChecked();
  });

  it("検索先を選び直して保存すると、新規に1件足される（同じ検索文字列の既存は変わらない）", async () => {
    const api = await setup();
    const existing = await api.data.favorites.save({
      name: "既存",
      query: "ぺこら",
      engine: "x",
    });
    await mountPage(api);
    paste(YAHOO_URL);
    fireEvent.click(
      screen.getByRole("button", { name: "新規お気に入りとして保存" }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: "両方" }));
    fireEvent.change(within(dialog).getByLabelText("お気に入りの名前"), {
      target: { value: "取り込み" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const favs = (await api.data.init()).favorites;
    expect(favs).toHaveLength(2);
    expect(favs.find((f) => f.id === existing.id)).toEqual(existing);
    const added = favs.find((f) => f.id !== existing.id)!;
    expect(added).toMatchObject({
      name: "取り込み",
      query: "ぺこら",
      engine: "both",
    });
    expect(screen.getByText("お気に入りに保存しました")).toBeInTheDocument();
  });

  it("名前が空のときは保存せず、シートの中に理由を出す", async () => {
    const api = await setup();
    await mountPage(api);
    paste(X_URL);
    fireEvent.click(
      screen.getByRole("button", { name: "新規お気に入りとして保存" }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("お気に入りの名前"), {
      target: { value: "  " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "名前を入力してください",
    );
    expect((await api.data.init()).favorites).toHaveLength(0);
  });
});
