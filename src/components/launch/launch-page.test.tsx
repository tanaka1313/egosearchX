import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EgoSearchApi, LauncherPayload } from "@/api";
import { createBackend } from "@/backend";
import { ToastProvider } from "@/components/common/toast";
import { mount } from "@/components/search/harness";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { ApiProvider } from "@/store/api-context";
import { I18nProvider } from "@/store/i18n-context";
import { StoreProvider } from "@/store/store-context";
import { LaunchPage } from "./launch-page";

// jsdom の描画が重く、並列実行の負荷で5秒を超えることがあるため、このファイルだけ延ばす
vi.setConfig({ testTimeout: 30_000 });

let today = "2026-11-19";
const clock = {
  today: () => today,
  now: () => `${today}T03:00:00.000Z`,
};

const payload: LauncherPayload = {
  name: "配信後エゴサ",
  items: [
    { query: "ぺこら  -filter:retweets", engine: "x" }, // 空白が違っても同じお気に入りと見なす
    { query: "歌枠 since:yesterday", engine: "yahoo" },
    { query: "切り抜き", engine: "both" },
  ],
};

/** jsdom の Blob に `stream()` が無いので、圧縮なし（`v1u.`）で作る（`v1.` の往復は codec.test.ts） */
async function hashOf(api: EgoSearchApi, p = payload): Promise<string> {
  vi.stubGlobal("CompressionStream", undefined);
  const hash = await api.launcher.encode(p);
  vi.unstubAllGlobals();
  return hash;
}

async function setup(): Promise<EgoSearchApi> {
  const api = createBackend({ kv: new MemoryAdapter(), clock });
  await api.data.init();
  await api.data.favorites.save({
    name: "ぺこらエゴサ",
    query: "ぺこら -filter:retweets",
    engine: "x",
  });
  return api;
}

const open = async (api: EgoSearchApi, hash: string) => {
  window.location.hash = hash;
  return mount(api, <LaunchPage />, { scope: false });
};

const rows = () =>
  within(screen.getByRole("list", { name: "開く検索の一覧" })).getAllByRole(
    "listitem",
  );

beforeEach(() => {
  today = "2026-11-19";
  vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
    "ja-JP",
  ]);
  vi.spyOn(window, "open").mockImplementation(
    () => ({ opener: "x" }) as unknown as Window,
  );
});
afterEach(() => {
  cleanup();
  window.location.hash = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("S9 ランチャー：表示", () => {
  it("見出し・件数・各行（番号・名前・検索先の正式名・展開済みの文字列）を出し、開いただけではタブを開かない", async () => {
    const api = await setup();
    await open(api, await hashOf(api));
    expect(
      await screen.findByRole("heading", {
        name: "いつものエゴサ：配信後エゴサ",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("3件の検索を新しいタブで開きます"),
    ).toBeInTheDocument();
    const r = rows();
    expect(r).toHaveLength(3);
    // 一致するお気に入りがあればその名前、無ければ文字列
    expect(within(r[0]).getByText("1")).toBeInTheDocument();
    expect(r[0]).toHaveTextContent("ぺこらエゴサ（X）");
    expect(r[1]).toHaveTextContent(
      "歌枠 since:yesterday（Yahoo!リアルタイム検索）",
    );
    expect(r[2]).toHaveTextContent(
      "切り抜き（XとYahoo!リアルタイム検索の両方）",
    );
    // 相対期間は日付に展開して出す
    expect(within(r[1]).getByText("歌枠 since:2026-11-18")).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
  });

  it("英語の画面では辞書の英語を出す", async () => {
    vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
      "en-US",
    ]);
    const api = await setup();
    await open(api, await hashOf(api));
    expect(
      await screen.findByRole("heading", { name: "Routine: 配信後エゴサ" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "▶ Open all" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

describe("S9 ランチャー：実行", () => {
  it("［すべて開く］で項目の検索先どおりに開き（両方は2タブ）、履歴は launch、一致するお気に入りだけ lastRunAt が付く", async () => {
    const api = await setup();
    await api.data.groups.save({ name: "手元", items: payload.items });
    await open(api, await hashOf(api));
    fireEvent.click(
      await screen.findByRole("button", { name: "▶ すべて開く" }),
    );
    const urls = vi.mocked(window.open).mock.calls.map((c) => String(c[0]));
    expect(urls).toHaveLength(4);
    expect(urls[0]).toContain("x.com/search");
    expect(urls[1]).toContain("search.yahoo.co.jp/realtime/search");
    expect(urls[2]).toContain("x.com/search");
    expect(urls[3]).toContain("search.yahoo.co.jp/realtime/search");
    await waitFor(async () => {
      const d = await api.data.init();
      expect(d.history).toHaveLength(4);
    });
    const d = await api.data.init();
    expect(d.history.every((h) => h.source.kind === "launch")).toBe(true);
    expect(d.favorites[0].lastRunAt).toBe(clock.now());
    // ランチャーは ID を持たないので、同じ項目を持つ手元のいつものエゴサの lastRunAt は動かない
    expect(d.groups[0].lastRunAt).toBeNull();
  });

  it("相対期間は、ページを開いたときではなく押した時点の日付に展開する", async () => {
    const api = await setup();
    await open(api, await hashOf(api));
    const button = await screen.findByRole("button", { name: "▶ すべて開く" });
    today = "2026-12-01"; // ページを開いたあとに日付が変わった
    fireEvent.click(button);
    const yahoo = String(vi.mocked(window.open).mock.calls[1][0]);
    expect(decodeURIComponent(yahoo)).toContain("歌枠");
    // 2026-11-30 0:00（日本時間）。開いた時点（11-18）の値ではない
    const lts = new URL(yahoo).searchParams.get("lts");
    expect(lts).toBe(String(Date.parse("2026-11-30T00:00:00+09:00") / 1000));
  });

  it("各行に［X で開く］［Yahoo で開く］があり、押した検索先だけで、その項目だけを開く", async () => {
    const api = await setup();
    await open(api, await hashOf(api));
    await screen.findByRole("list", { name: "開く検索の一覧" });
    // 3行とも、項目の検索先（X・Yahoo・両方）に関係なく、2つのボタンが出る
    for (const row of rows()) {
      expect(
        within(row).getByRole("button", { name: /を X で開く$/ }),
      ).toBeInTheDocument();
      expect(
        within(row).getByRole("button", { name: /を Yahoo で開く$/ }),
      ).toBeInTheDocument();
    }
    // Yahoo の項目を、X で開く
    fireEvent.click(
      within(rows()[1]).getByRole("button", {
        name: "歌枠 since:yesterdayを X で開く",
      }),
    );
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(window.open).mock.calls[0][0])).toContain("x.com");
    // X の項目を、Yahoo で開く
    fireEvent.click(
      within(rows()[0]).getByRole("button", { name: /を Yahoo で開く$/ }),
    );
    expect(window.open).toHaveBeenCalledTimes(2);
    expect(String(vi.mocked(window.open).mock.calls[1][0])).toContain(
      "search.yahoo.co.jp",
    );
  });

  it("ブロックされたら、［すべて開く］の下に件数と個別リンクを出す（［×］で消せる）", async () => {
    vi.mocked(window.open).mockImplementation(() => null);
    const api = await setup();
    await open(api, await hashOf(api));
    fireEvent.click(
      await screen.findByRole("button", { name: "▶ すべて開く" }),
    );
    const status = await screen.findByRole("status");
    expect(
      within(status).getByText("4件中4件を開けませんでした。"),
    ).toBeInTheDocument();
    expect(within(status).getAllByRole("link")).toHaveLength(4);
    fireEvent.click(within(status).getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("1回のタップで1件しか開けない端末（2件目以降が null）では、［次を開く］で残りを1件ずつ開く", async () => {
    // iPhone の Safari の挙動（実機。1件目だけ開き、残りはブロックされる）
    vi.mocked(window.open)
      .mockImplementationOnce(() => ({ opener: "x" }) as unknown as Window)
      .mockImplementation(() => null);
    const api = await setup();
    await open(api, await hashOf(api));
    fireEvent.click(
      await screen.findByRole("button", { name: "▶ すべて開く" }),
    );
    const status = await screen.findByRole("status");
    expect(
      within(status).getByText("4件中3件を開けませんでした。"),
    ).toBeInTheDocument();
    // 以降のタップは開ける端末になったとして、1回ごとに1件だけ開く
    vi.mocked(window.open).mockImplementation(
      () => ({ opener: "x" }) as unknown as Window,
    );
    const callsBefore = vi.mocked(window.open).mock.calls.length;
    fireEvent.click(
      within(status).getByRole("button", { name: "次を開く（1/3）" }),
    );
    expect(vi.mocked(window.open).mock.calls.length).toBe(callsBefore + 1);
    fireEvent.click(
      within(status).getByRole("button", { name: "次を開く（2/3）" }),
    );
    fireEvent.click(
      within(status).getByRole("button", { name: "次を開く（3/3）" }),
    );
    expect(vi.mocked(window.open).mock.calls.length).toBe(callsBefore + 3);
    expect(
      within(status).getByRole("button", { name: "すべて開きました" }),
    ).toBeDisabled();
  });
});

describe("S9 ランチャー：エラーと保存しないこと", () => {
  it.each([
    ["ハッシュが無い", ""],
    ["壊れている", "v1u.!!!"],
  ])("%s：読み込めない表示と［ホームへ］を出す", async (_n, hash) => {
    const api = await setup();
    await open(api, hash);
    expect(
      await screen.findByText("ブックマークURLを読み込めませんでした"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ホームへ" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByRole("button", { name: "▶ すべて開く" })).toBeNull();
    // エラーは通常の空状態と区別する（role=alert。色だけにせず、アイコンと文言を添える）
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("ブックマークURLを読み込めませんでした");
    expect(alert.querySelector("svg")).not.toBeNull();
  });

  it("知らない版：更新の案内と［ホームへ］を出す", async () => {
    const api = await setup();
    await open(api, "v2.abc");
    expect(
      await screen.findByText("新しい形式のURLです。アプリを更新してください"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ホームへ" })).toBeInTheDocument();
  });

  it("hashchange で別のブックマークに切り替わる", async () => {
    const api = await setup();
    await open(api, await hashOf(api));
    await screen.findByRole("heading", {
      name: "いつものエゴサ：配信後エゴサ",
    });
    const next = await hashOf(api, {
      name: "毎朝エゴサ",
      items: [{ query: "朝", engine: "x" }],
    });
    act(() => {
      window.location.hash = next;
    });
    expect(
      await screen.findByRole("heading", {
        name: "いつものエゴサ：毎朝エゴサ",
      }),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(1);
  });

  it("開いても、実行しても、［ホームへ］を押しても、お気に入りといつものエゴサは増減しない", async () => {
    const api = await setup();
    await open(api, await hashOf(api));
    fireEvent.click(
      await screen.findByRole("button", { name: "▶ すべて開く" }),
    );
    fireEvent.click(screen.getByRole("link", { name: "ホームへ" }));
    await waitFor(async () =>
      expect((await api.data.init()).history.length).toBeGreaterThan(0),
    );
    const d = await api.data.init();
    expect(d.favorites).toHaveLength(1);
    expect(d.groups).toHaveLength(0);
  });

  it("保存データが壊れていても（CORRUPT）開ける", async () => {
    const kv = new MemoryAdapter();
    await kv.set("egosearch:meta", JSON.stringify({ version: 1 }));
    await kv.set("egosearch:v2:favorites", "{壊れた");
    const api = createBackend({ kv, clock });
    const hash = await hashOf(api);
    window.location.hash = hash;
    render(
      <ApiProvider api={api}>
        <StoreProvider>
          <I18nProvider>
            <ToastProvider>
              <LaunchPage />
            </ToastProvider>
          </I18nProvider>
        </StoreProvider>
      </ApiProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "▶ すべて開く" }),
    );
    expect(window.open).toHaveBeenCalledTimes(4);
  });
});
