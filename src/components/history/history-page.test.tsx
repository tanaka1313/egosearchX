import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS, type EgoSearchApi, type RunSource } from "@/api";
import { createBackend } from "@/backend";
import { mount } from "@/components/search/harness";
import { formatRunAt } from "@/lib/format-date";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { HistoryPage } from "./history-page";

// jsdom の描画が重く、並列実行の負荷で5秒を超えることがあるため、このファイルだけ延ばす
vi.setConfig({ testTimeout: 30_000 });

/** 呼ぶたびに1秒進む時計（履歴は日時の新しい順に並ぶので、同じ時刻だと順序が決まらない） */
function makeClock() {
  let sec = 0;
  return {
    today: () => "2026-11-19",
    now: () => new Date(Date.UTC(2026, 10, 19, 3, 0, sec++)).toISOString(),
  };
}

async function record(
  api: EgoSearchApi,
  query: string,
  engine: "x" | "yahoo",
  source: RunSource,
) {
  await api.data.history.record(api.url.plan([{ query, engine }]), source);
}

/** 古い順：ぺこら（ホーム）→ 歌枠（お気に入り・Yahoo）→ 雑談（いつものエゴサ） */
async function setup(): Promise<EgoSearchApi> {
  const api = createBackend({ kv: new MemoryAdapter(), clock: makeClock() });
  await api.data.init();
  await record(api, "ぺこら filter:images", "x", {
    kind: "home",
    label: "ぺこら",
  });
  await record(api, "歌枠", "yahoo", {
    kind: "favorite",
    label: "歌枠チェック",
  });
  await record(api, "雑談", "x", { kind: "group", label: "配信後エゴサ" });
  return api;
}

const mountPage = (api: EgoSearchApi) =>
  mount(api, <HistoryPage />, { scope: false });
const rows = () =>
  within(screen.getByRole("list", { name: "履歴の一覧" })).getAllByRole(
    "listitem",
  );

beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
    "ja-JP",
  ]);
  vi.spyOn(window, "open").mockImplementation(
    () => ({ opener: "x" }) as unknown as Window,
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("S5 履歴：一覧", () => {
  it("0件のときは空状態を出し、件数は 0/100、［全件削除］は押せない", async () => {
    const api = createBackend({ kv: new MemoryAdapter(), clock: makeClock() });
    await api.data.init();
    await mountPage(api);
    expect(screen.getByText("実行するとここに残ります")).toBeInTheDocument();
    expect(screen.getByText(`0/${LIMITS.history}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全件削除" })).toBeDisabled();
    expect(screen.queryByRole("list", { name: "履歴の一覧" })).toBeNull();
  });

  it("新しい順に、日時・検索先の正式名・実行元・検索文字列を出す", async () => {
    const api = await setup();
    await mountPage(api);
    const r = rows();
    expect(r).toHaveLength(3);
    expect(within(r[0]).getByText("雑談")).toBeInTheDocument();
    expect(within(r[0]).getByText("X")).toBeInTheDocument();
    expect(
      within(r[0]).getByText("いつものエゴサ「配信後エゴサ」"),
    ).toBeInTheDocument();
    expect(within(r[1]).getByText("歌枠")).toBeInTheDocument();
    // 履歴の検索先はバッジの短縮名ではなく正式名
    expect(
      within(r[1]).getByText("Yahoo!リアルタイム検索"),
    ).toBeInTheDocument();
    expect(
      within(r[1]).getByText("お気に入り「歌枠チェック」"),
    ).toBeInTheDocument();
    expect(within(r[2]).getByText("ホーム")).toBeInTheDocument();
    const at = (await api.data.init()).history[2].at;
    expect(within(r[2]).getByText(formatRunAt(at)!)).toBeInTheDocument();
    expect(screen.getByText(`3/${LIMITS.history}`)).toBeInTheDocument();
  });

  it("使った条件ボタンは、検索文字列に当てはまる今の対象のボタンの名前を出し、無ければ行を出さない", async () => {
    await mountPage(await setup());
    const r = rows();
    expect(
      within(r[2]).getByText("使った条件ボタン：画像つき"),
    ).toBeInTheDocument();
    expect(within(r[1]).queryByText(/使った条件ボタン/)).toBeNull();
    expect(within(r[0]).queryByText(/使った条件ボタン/)).toBeNull();
  });

  it("100件を超えると古いものから消え、件数は 100/100 になる", async () => {
    const api = createBackend({ kv: new MemoryAdapter(), clock: makeClock() });
    await api.data.init();
    for (let i = 0; i < LIMITS.history + 1; i++)
      await record(api, `検索${i}`, "x", { kind: "other", label: `検索${i}` });
    await mountPage(api);
    expect(
      screen.getByText(`${LIMITS.history}/${LIMITS.history}`),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(LIMITS.history);
    expect(screen.queryByText("検索0")).toBeNull();
    expect(screen.getByText(`検索${LIMITS.history}`)).toBeInTheDocument();
  });
});

describe("S5 履歴：再実行", () => {
  it("［再実行］で同じ検索を開き、履歴に1件足す", async () => {
    const api = await setup();
    await mountPage(api);
    fireEvent.click(within(rows()[1]).getByRole("button", { name: "再実行" }));
    expect(window.open).toHaveBeenCalledTimes(1);
    const url = new URL(vi.mocked(window.open).mock.calls[0][0] as string);
    expect(url.hostname).toBe("search.yahoo.co.jp");
    expect(url.searchParams.get("p")).toBe("歌枠");
    await waitFor(() =>
      expect(screen.getByText(`4/${LIMITS.history}`)).toBeInTheDocument(),
    );
    expect(within(rows()[0]).getByText("歌枠")).toBeInTheDocument();
  });
});

describe("S5 履歴：☆ お気に入りに保存", () => {
  it("名前欄のプレースホルダーは検索語から作った名前、検索先の初期値は実行した検索先。保存で新規に足す", async () => {
    const api = await setup();
    await mountPage(api);
    fireEvent.click(
      within(rows()[1]).getByRole("button", { name: "☆ お気に入りに保存" }),
    );
    const dialog = await screen.findByRole("dialog");
    const name = within(dialog).getByLabelText("お気に入りの名前");
    expect(name).toHaveValue("");
    expect(name).toHaveAttribute("placeholder", "歌枠");
    expect(
      within(dialog).getByRole("radio", { name: "Yahoo!リアルタイム検索" }),
    ).toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const favorites = (await api.data.init()).favorites;
    expect(favorites).toHaveLength(1);
    expect(favorites[0]).toMatchObject({
      name: "歌枠",
      query: "歌枠",
      engine: "yahoo",
    });
  });

  it("検索語が無い履歴のプレースホルダーは ON の条件ボタン名。名前が空なら、その名前で保存する", async () => {
    const api = createBackend({ kv: new MemoryAdapter(), clock: makeClock() });
    await api.data.init();
    await record(api, "filter:images", "x", { kind: "other", label: "" });
    await mountPage(api);
    fireEvent.click(screen.getByRole("button", { name: "☆ お気に入りに保存" }));
    const dialog = await screen.findByRole("dialog");
    const name = within(dialog).getByLabelText("お気に入りの名前");
    expect(name).toHaveAttribute("placeholder", "画像つき");
    fireEvent.change(name, { target: { value: "  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await api.data.init()).favorites.map((f) => f.name)).toEqual([
      "画像つき",
    ]);
  });
});

describe("S5 履歴：全件削除", () => {
  it("確認ダイアログのキャンセルでは消えず、削除すると0件になる", async () => {
    const api = await setup();
    await mountPage(api);
    fireEvent.click(screen.getByRole("button", { name: "全件削除" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("元に戻せません。")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(rows()).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "全件削除" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "削除する",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText("実行するとここに残ります")).toBeInTheDocument(),
    );
    expect((await api.data.init()).history).toHaveLength(0);
  });
});

describe("S5 履歴：全件削除のフォーカス", () => {
  it("キャンセルすると［全件削除］へフォーカスが戻る", async () => {
    await mountPage(await setup());
    const opener = screen.getByRole("button", { name: "全件削除" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("削除して［全件削除］が押せなくなったら、本文（main）へフォーカスが移る", async () => {
    await mountPage(await setup());
    const opener = screen.getByRole("button", { name: "全件削除" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "削除する",
      }),
    );
    await waitFor(() => expect(opener).toBeDisabled());
    await waitFor(() => expect(screen.getByRole("main")).toHaveFocus());
  });
});

describe("S5 履歴：英語", () => {
  it("英語の画面では文言が英語になる", async () => {
    vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
      "en-US",
    ]);
    await mountPage(await setup());
    expect(
      screen.getByRole("heading", { name: "History" }),
    ).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "History" });
    expect(
      within(list).getAllByRole("button", { name: "Run again" }),
    ).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: "Delete all" }),
    ).toBeInTheDocument();
  });
});

describe("S5 履歴：もう一方の検索先で開く", () => {
  it("X の行には［Yahoo で開く］があり、Yahoo!リアルタイム検索の URL で同じ検索を開いて履歴に1件足す", async () => {
    const api = await setup();
    await mountPage(api);
    // r[0]=雑談（X）
    fireEvent.click(
      within(rows()[0]).getByRole("button", { name: "Yahoo で開く" }),
    );
    expect(window.open).toHaveBeenCalledTimes(1);
    const url = new URL(vi.mocked(window.open).mock.calls[0][0] as string);
    expect(url.hostname).toBe("search.yahoo.co.jp");
    expect(url.searchParams.get("p")).toBe("雑談");
    await waitFor(() =>
      expect(screen.getByText(`4/${LIMITS.history}`)).toBeInTheDocument(),
    );
    expect(
      within(rows()[0]).getByText("Yahoo!リアルタイム検索"),
    ).toBeInTheDocument();
  });

  it("Yahoo の行には［X で開く］があり、［Yahoo で開く］は無い", async () => {
    const api = await setup();
    await mountPage(api);
    // r[1]=歌枠（Yahoo）
    expect(
      within(rows()[1]).queryByRole("button", { name: "Yahoo で開く" }),
    ).toBeNull();
    fireEvent.click(
      within(rows()[1]).getByRole("button", { name: "X で開く" }),
    );
    const url = new URL(vi.mocked(window.open).mock.calls[0][0] as string);
    expect(url.hostname).toBe("x.com");
  });

  it("Yahoo で使えない演算子を含む X の行は、行の下に Yahoo!リアルタイム検索での警告を出す。無い行は出さない", async () => {
    const api = await setup();
    await mountPage(api);
    // r[2]=ぺこら filter:images（X）
    expect(
      within(rows()[2]).getByText(/Yahoo!リアルタイム検索で開くと：/),
    ).toBeInTheDocument();
    expect(
      within(rows()[0]).queryByText(/Yahoo!リアルタイム検索で開くと：/),
    ).toBeNull();
  });
});

describe("S5 履歴：絞り込み", () => {
  it("検索文字列で絞れる", async () => {
    await mountPage(await setup());
    fireEvent.change(screen.getByLabelText("検索文字列や実行元で絞り込み"), {
      target: { value: "filter:images" },
    });
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText("ホーム")).toBeInTheDocument();
  });

  it("実行元の表示名で絞れ、該当が無いと「該当なし」を出す", async () => {
    await mountPage(await setup());
    const input = screen.getByLabelText("検索文字列や実行元で絞り込み");
    fireEvent.change(input, { target: { value: "配信後エゴサ" } });
    expect(rows()).toHaveLength(1);
    fireEvent.change(input, { target: { value: "存在しない語zzz" } });
    expect(screen.getByText("該当なし")).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});
