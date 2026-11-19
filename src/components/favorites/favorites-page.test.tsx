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
import { formatRunAt } from "@/lib/format-date";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { FavoritesPage } from "./favorites-page";

// jsdom の描画が重く、並列実行の負荷で5秒を超えることがあるため、このファイルだけ延ばす
vi.setConfig({ testTimeout: 30_000 });

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

async function setup(): Promise<EgoSearchApi> {
  const api = createBackend({ kv: new MemoryAdapter(), clock });
  await api.data.init();
  await api.data.favorites.save({
    name: "ぺこらエゴサ",
    query: "ぺこら -filter:retweets",
    engine: "x",
  });
  await api.data.favorites.save({
    name: "歌枠チェック",
    query: "歌枠 filter:images",
    engine: "yahoo",
  });
  await api.data.favorites.save({
    name: "両方で見る",
    query: "雑談",
    engine: "both",
  });
  return api;
}

const mountPage = (api: EgoSearchApi) =>
  mount(api, <FavoritesPage />, { scope: false });
const rows = () =>
  within(screen.getByRole("list", { name: "お気に入りの一覧" })).getAllByRole(
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

describe("S3 お気に入り：一覧の行", () => {
  it("保存順に、名前・検索先バッジ（X／Yahoo／X＋Yahoo）・保存している検索文字列を出す", async () => {
    await mountPage(await setup());
    const r = rows();
    expect(r).toHaveLength(3);
    expect(within(r[0]).getByText("ぺこらエゴサ")).toBeInTheDocument();
    expect(within(r[0]).getByTitle("検索先：X")).toHaveTextContent(/^X$/);
    expect(
      within(r[0]).getByText("ぺこら -filter:retweets"),
    ).toBeInTheDocument();
    // バッジは短縮名、正式名は title と読み上げ
    expect(
      within(r[1]).getByTitle("検索先：Yahoo!リアルタイム検索"),
    ).toHaveTextContent(/^Yahoo$/);
    expect(
      within(r[2]).getByTitle("検索先：X＋Yahoo!リアルタイム検索"),
    ).toHaveTextContent(/^X＋Yahoo$/);
  });

  it("3行目は、まだ開いていなければ「未実行」、開いたものは「前回 M/D HH:mm」（端末の現地時刻）", async () => {
    const api = await setup();
    await api.data.history.record(
      api.url.plan([{ query: "ぺこら -filter:retweets", engine: "x" }]),
      { kind: "favorite", label: "ぺこらエゴサ" },
    );
    await mountPage(api);
    const r = rows();
    expect(
      within(r[0]).getByText(`前回 ${formatRunAt(clock.now())}`),
    ).toBeInTheDocument();
    expect(within(r[1]).getByText("未実行")).toBeInTheDocument();
    expect(within(r[2]).getByText("未実行")).toBeInTheDocument();
  });

  it("Yahoo!リアルタイム検索で使えない演算子を含み、検索先に Yahoo を含むものだけ⚠を出す（内容は title）", async () => {
    await mountPage(await setup());
    const r = rows();
    expect(within(r[0]).queryByLabelText("警告あり")).toBeNull(); // X だけ
    const warn = within(r[1]).getByLabelText("警告あり");
    expect(warn.getAttribute("title")).toContain("filter:");
    expect(within(r[2]).queryByLabelText("警告あり")).toBeNull(); // Yahoo でも使える検索
  });

  it("お気に入りが0件なら、空状態の案内を出す", async () => {
    const api = createBackend({ kv: new MemoryAdapter(), clock });
    await api.data.init();
    await mountPage(api);
    expect(
      screen.getByText("ホームで条件を触って ☆ 保存 するとここに入ります"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "お気に入りの一覧" })).toBeNull();
  });
});

describe("S3 お気に入り：絞り込み", () => {
  it("名前に含むものだけを出し、並べ替えを反映しない旨を注記する。空に戻すと注記は消える", async () => {
    await mountPage(await setup());
    const input = screen.getByLabelText("名前で絞り込み");
    expect(screen.queryByText("絞り込み中は並べ替えを反映しません")).toBeNull();
    fireEvent.change(input, { target: { value: "歌枠" } });
    expect(rows().map((r) => r.textContent)).toEqual([
      expect.stringContaining("歌枠チェック"),
    ]);
    expect(
      screen.getByText("絞り込み中は並べ替えを反映しません"),
    ).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "" } });
    expect(rows()).toHaveLength(3);
    expect(screen.queryByText("絞り込み中は並べ替えを反映しません")).toBeNull();
  });
});

describe("S3 お気に入り：実行", () => {
  it("［▶ 実行］で保存した検索先の URL を新しいタブで開き、前回の日時が付く", async () => {
    const api = await setup();
    await mountPage(api);
    fireEvent.click(
      within(rows()[0]).getByRole("button", { name: "ぺこらエゴサを実行" }),
    );
    expect(window.open).toHaveBeenCalledTimes(1);
    const url = String(vi.mocked(window.open).mock.calls[0][0]);
    expect(url).toContain("x.com/search");
    expect(decodeURIComponent(url)).toContain("ぺこら -filter:retweets");
    await waitFor(async () => {
      const fav = (await api.data.init()).favorites[0];
      expect(fav.lastRunAt).toBe(clock.now());
    });
    expect(
      await within(rows()[0]).findByText(`前回 ${formatRunAt(clock.now())}`),
    ).toBeInTheDocument();
  });

  it("検索先が「両方」なら2タブ開く", async () => {
    await mountPage(await setup());
    fireEvent.click(
      within(rows()[2]).getByRole("button", { name: "両方で見るを実行" }),
    );
    expect(window.open).toHaveBeenCalledTimes(2);
  });
});

describe("S3 お気に入り：削除", () => {
  it("［×］で削除済みへ移り、いつものエゴサは変わらない。［元に戻す］で戻る", async () => {
    const api = await setup();
    await api.data.groups.save({
      name: "毎日",
      items: [{ query: "ぺこら -filter:retweets", engine: "x" }],
    });
    const groupsBefore = (await api.data.init()).groups;
    await mountPage(api);

    fireEvent.click(
      within(rows()[0]).getByRole("button", { name: "ぺこらエゴサを削除" }),
    );
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(
      screen.getByText("「ぺこらエゴサ」を削除済みへ移しました"),
    ).toBeInTheDocument();
    const mid = await api.data.init();
    expect(mid.favorites.map((f) => f.name)).not.toContain("ぺこらエゴサ");
    expect(mid.groups).toEqual(groupsBefore); // 連動しない
    expect(
      (await api.data.trash.list()).map((e) => `${e.kind}:${e.id}`),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(rows()[0]).toHaveTextContent("ぺこらエゴサ");
  });
});

describe("S3 お気に入り：編集への導線と英語", () => {
  it("［編集］は編集ページ（id つき）へのリンク", async () => {
    const api = await setup();
    await mountPage(api);
    const id = (await api.data.init()).favorites[1].id;
    expect(
      within(rows()[1]).getByRole("link", { name: "歌枠チェックを編集" }),
    ).toHaveAttribute("href", `/favorites/edit?id=${id}`);
  });

  it("英語の画面では文言が英語になる", async () => {
    vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
      "en-US",
    ]);
    await mountPage(await setup());
    expect(screen.getByLabelText("Filter by name")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Favorites" });
    expect(within(list).getAllByText("Never run")).toHaveLength(3);
  });
});
