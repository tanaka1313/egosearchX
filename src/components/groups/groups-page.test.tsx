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
import { GroupsPage } from "./groups-page";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

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
  await api.data.groups.save({
    name: "配信後エゴサ",
    items: [
      { query: "ぺこら  -filter:retweets", engine: "x" }, // 空白が違っても同じお気に入りと見なす
      { query: "歌枠 min_faves:100", engine: "yahoo" }, // お気に入りに無い文字列
    ],
  });
  return api;
}

const mountPage = (api: EgoSearchApi) =>
  mount(api, <GroupsPage />, { scope: false });
const rows = () =>
  within(
    screen.getByRole("list", { name: "いつものエゴサの一覧" }),
  ).getAllByRole("listitem");

beforeEach(() => {
  push.mockReset();
  // jsdom の Blob に stream() が無いので、ランチャーの URL は圧縮なし（v1u.）で作る
  vi.stubGlobal("CompressionStream", undefined);
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
  vi.unstubAllGlobals();
});

describe("S4 いつものエゴサ：一覧の行", () => {
  it("名前（件数）・今日は未・項目の名前を「／」でつなぐ（お気に入りと一致すればその名前、無ければ文字列）", async () => {
    await mountPage(await setup());
    const r = rows();
    expect(r).toHaveLength(1);
    expect(within(r[0]).getByText("配信後エゴサ（2）")).toBeInTheDocument();
    expect(within(r[0]).getByText("□ 今日は未")).toBeInTheDocument();
    expect(
      within(r[0]).getByText("ぺこらエゴサ／歌枠 min_faves:100"),
    ).toBeInTheDocument();
  });

  it("0件のときは、空状態の案内と［＋ 追加］（S4-E へのリンク）を出す", async () => {
    const api = createBackend({ kv: new MemoryAdapter(), clock });
    await api.data.init();
    await mountPage(api);
    expect(
      screen.getByText(
        "いつものエゴサがありません。「配信後エゴサ」などを作ってみましょう",
      ),
    ).toBeInTheDocument();
    for (const add of screen.getAllByRole("link", { name: "＋ 追加" }))
      expect(add).toHaveAttribute("href", "/groups/edit");
    expect(
      screen.queryByRole("list", { name: "いつものエゴサの一覧" }),
    ).toBeNull();
  });

  it("［編集］は id 付きの S4-E へのリンク", async () => {
    const api = await setup();
    const [g] = (await api.data.init()).groups;
    await mountPage(api);
    expect(
      within(rows()[0]).getByRole("link", { name: "配信後エゴサを編集" }),
    ).toHaveAttribute("href", `/groups/edit?id=${g.id}`);
  });
});

describe("S4 いつものエゴサ：一括実行", () => {
  it("各項目を保存した検索先で開き、lastRunAt が付いて「✓ 今日は済」になる（#86）", async () => {
    const api = await setup();
    await mountPage(api);
    fireEvent.click(
      within(rows()[0]).getByRole("button", { name: "配信後エゴサを一括実行" }),
    );
    expect(window.open).toHaveBeenCalledTimes(2);
    const urls = vi.mocked(window.open).mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain("x.com/search");
    expect(urls[1]).toContain("search.yahoo.co.jp/realtime/search");
    await waitFor(() =>
      expect(within(rows()[0]).getByText("✓ 今日は済")).toBeInTheDocument(),
    );
    const [g] = (await api.data.init()).groups;
    expect(g.lastRunAt).toBe(clock.now());
  });

  it("開いたあと、結果を持ってランチャー（そのいつものエゴサの URL）へ移る。ブロックされても同じで、このページには出さない", async () => {
    vi.mocked(window.open).mockImplementation(() => null);
    const api = await setup();
    await mountPage(api);
    fireEvent.click(
      screen.getByRole("button", { name: "配信後エゴサを一括実行" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    const to = String(push.mock.calls[0][0]);
    expect(to).toMatch(/^\/launch#v1/);
    const [g] = (await api.data.init()).groups;
    expect(await api.launcher.decode(to.split("#")[1])).toEqual({
      name: g.name,
      items: g.items,
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("ランチャーの URL を作れなかったときだけ、このページの中に件数と個別リンクを出す（［×］で消せる）", async () => {
    vi.mocked(window.open).mockImplementation(() => null);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onBlocked = vi.fn();
    const api = await setup();
    vi.spyOn(api.launcher, "encode").mockRejectedValue(new Error("x"));
    await mount(api, <GroupsPage />, { scope: false, onBlocked });
    fireEvent.click(
      screen.getByRole("button", { name: "配信後エゴサを一括実行" }),
    );
    const note = await screen.findByRole("status");
    expect(note).toHaveTextContent("2件中2件を開けませんでした。");
    expect(within(note).getAllByRole("link")).toHaveLength(2);
    // 帯の下（共通の表示）ではなく、このページの中に出す
    expect(onBlocked).not.toHaveBeenCalled();
    fireEvent.click(within(note).getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("S4 いつものエゴサ：削除", () => {
  it("削除済みへ移して一覧から消え、［元に戻す］で戻る（中身も変わらない）", async () => {
    const api = await setup();
    await mountPage(api);
    fireEvent.click(screen.getByRole("button", { name: "配信後エゴサを削除" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("list", { name: "いつものエゴサの一覧" }),
      ).toBeNull(),
    );
    expect((await api.data.init()).groups).toHaveLength(0);
    fireEvent.click(await screen.findByRole("button", { name: "元に戻す" }));
    await waitFor(() => expect(rows()).toHaveLength(1));
    const [g] = (await api.data.init()).groups;
    expect(g.items).toHaveLength(2);
  });
});

describe("D2 ブックマークURLの発行", () => {
  // jsdom の Blob には `stream()` が無く、圧縮つき（v1.）は作れない。圧縮が使えない端末の形（v1u.。api-spec 4.4）で確かめる
  beforeEach(() => {
    vi.stubGlobal("CompressionStream", undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("URL は /launch# の後ろに hash を付けたもので、decode すると名前と項目に戻る。警告は出さない", async () => {
    const api = await setup();
    await mountPage(api);
    fireEvent.click(
      within(rows()[0]).getByRole("button", {
        name: "配信後エゴサのブックマークURLを発行",
      }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "ブックマークURLを発行：配信後エゴサ",
    });
    const url = await within(dialog).findByLabelText("ブックマーク用URL");
    const text = url.textContent ?? "";
    expect(text.startsWith(`${window.location.origin}/launch#`)).toBe(true);
    expect(text).toMatch(/\/launch#v1u\./);
    const decoded = await api.launcher.decode(text.split("/launch#")[1]);
    expect(decoded).toEqual({
      name: "配信後エゴサ",
      items: [
        { query: "ぺこら  -filter:retweets", engine: "x" },
        { query: "歌枠 min_faves:100", engine: "yahoo" },
      ],
    });
    // 項目の名前の一覧と手順
    expect(within(dialog).getByText("ぺこらエゴサ")).toBeInTheDocument();
    expect(within(dialog).getByText(/ブックマークに追加する手順/)).toBeTruthy();
    expect(within(dialog).queryByText(/長/)).toBeNull();
  });

  it("［コピー］でクリップボードへ書き、トーストで知らせる", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    await mountPage(await setup());
    fireEvent.click(
      screen.getByRole("button", {
        name: "配信後エゴサのブックマークURLを発行",
      }),
    );
    const dialog = await screen.findByRole("dialog");
    const url = await within(dialog).findByLabelText("ブックマーク用URL");
    fireEvent.click(within(dialog).getByRole("button", { name: "コピー" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(url.textContent),
    );
    expect(
      await screen.findByText("ブックマーク用URLをコピーしました"),
    ).toBeInTheDocument();
  });

  it("発行しても保存データは変わらない（lastRunAt も動かない）", async () => {
    const api = await setup();
    const before = (await api.data.init()).groups;
    await mountPage(api);
    fireEvent.click(
      screen.getByRole("button", {
        name: "配信後エゴサのブックマークURLを発行",
      }),
    );
    await screen.findByLabelText("ブックマーク用URL");
    expect((await api.data.init()).groups).toEqual(before);
  });
});
