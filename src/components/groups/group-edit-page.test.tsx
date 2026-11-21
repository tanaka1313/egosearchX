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
import { labeled, mount, openMore } from "@/components/search/harness";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { useAppStore } from "@/store/store-context";
import { GroupEditPage } from "./group-edit-page";

// jsdom の描画が重く、並列実行の負荷で5秒を超えることがあるため、このファイルだけ延ばす
vi.setConfig({ testTimeout: 30_000 });

const push = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search),
}));

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

function Probe() {
  const home = useAppStore((s) => s.home);
  return <output aria-label="home">{JSON.stringify(home)}</output>;
}

async function setup() {
  const api = createBackend({ kv: new MemoryAdapter(), clock });
  await api.data.init();
  const fav = await api.data.favorites.save({
    name: "ぺこらエゴサ",
    query: "ぺこら -filter:retweets",
    engine: "x",
  });
  const group = await api.data.groups.save({
    name: "配信後エゴサ",
    items: [
      { query: "ぺこら -filter:retweets", engine: "x" },
      { query: "歌枠 min_faves:100", engine: "yahoo" },
    ],
  });
  search = "";
  return { api, fav, group };
}
const mountPage = (api: EgoSearchApi) =>
  mount(
    api,
    <>
      <GroupEditPage />
      <Probe />
    </>,
    { scope: false },
  );
const hololive = async (api: EgoSearchApi) =>
  (await api.data.init()).chips.get("hololive")!;
const nameInput = () => screen.getByLabelText("名前") as HTMLInputElement;
const word = () => screen.getByLabelText("検索する語") as HTMLInputElement;
const save = () =>
  fireEvent.click(screen.getAllByRole("button", { name: "保存" })[0]);
const items = () =>
  within(screen.getByRole("list", { name: "中身の検索" })).queryAllByRole(
    "listitem",
  );
const homeText = () => screen.getByLabelText("home").textContent;
const tab = (name: string) => screen.getByRole("tab", { name });
const openMaker = () => fireEvent.click(tab("新しく作る"));
/** 項目の行の、検索先のラジオ（正式名）が選ばれているか */
const engineOf = (row: HTMLElement, name: string) =>
  within(row).getByRole("radio", { name });
/** 履歴を1件残す（履歴は日付に展開済みの文字列で残る） */
const runOnce = (
  api: EgoSearchApi,
  query: string,
  engine: "x" | "yahoo" = "x",
) =>
  api.data.history.record(api.url.plan([{ query, engine }]), {
    kind: "home",
    label: query,
  });
const addToGroup = () =>
  fireEvent.click(
    screen.getAllByRole("button", { name: "お気に入りに保存して追加" })[0],
  );

beforeEach(() => {
  push.mockClear();
  sessionStorage.clear();
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

describe("S4-E：追加（id なし）", () => {
  it("名前も中身も空で開き、「いつものエゴサを追加」の見出しと0件の案内を出す", async () => {
    const { api } = await setup();
    await mountPage(api);
    expect(
      screen.getByRole("heading", { name: "いつものエゴサを追加" }),
    ).toBeInTheDocument();
    expect(nameInput().value).toBe("");
    expect(items()).toHaveLength(0);
    expect(
      screen.getByText("まだありません。下の「追加する」から足してください。"),
    ).toBeInTheDocument();
  });

  it("名前が空でも、中身があれば自動の名前（1件目の名前＋ほかN件）で保存する。名前欄のプレースホルダーに出している", async () => {
    const { api } = await setup();
    await api.data.favorites.save({
      name: "歌枠",
      query: "歌枠 min_faves:100",
      engine: "yahoo",
    });
    await mountPage(api);
    expect(nameInput()).toHaveAttribute("placeholder", "いつものエゴサ 2");
    fireEvent.click(screen.getByRole("button", { name: "ぺこらエゴサを追加" }));
    expect(nameInput()).toHaveAttribute("placeholder", "ぺこらエゴサ");
    fireEvent.click(screen.getByRole("button", { name: "歌枠を追加" }));
    expect(nameInput()).toHaveAttribute("placeholder", "ぺこらエゴサ ほか1件");
    save();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/groups"));
    expect(
      (await api.data.init()).groups.some(
        (g) => g.name === "ぺこらエゴサ ほか1件",
      ),
    ).toBe(true);
  });

  it("名前も中身も空のときは、中身が無い理由を出して保存しない", async () => {
    const { api } = await setup();
    await mountPage(api);
    save();
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "検索を1つ以上入れてください",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("項目が0件のときは保存せず、理由を出す", async () => {
    const { api, group } = await setup();
    await mountPage(api);
    fireEvent.change(nameInput(), { target: { value: "毎朝エゴサ" } });
    save();
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "検索を1つ以上入れてください",
    );
    expect(push).not.toHaveBeenCalled();
    expect((await api.data.init()).groups.map((g) => g.id)).toEqual([group.id]);
  });

  it("①お気に入りから追加した項目で保存すると、新規に保存して一覧へ移る", async () => {
    const { api } = await setup();
    await mountPage(api);
    fireEvent.change(nameInput(), { target: { value: "毎朝エゴサ" } });
    fireEvent.click(screen.getByRole("button", { name: "ぺこらエゴサを追加" }));
    expect(items()).toHaveLength(1);
    expect(within(items()[0]).getByText("ぺこらエゴサ")).toBeInTheDocument();
    save();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/groups"));
    const created = (await api.data.init()).groups.find(
      (g) => g.name === "毎朝エゴサ",
    )!;
    expect(created.items).toEqual([
      { query: "ぺこら -filter:retweets", engine: "x" },
    ]);
    expect(created.lastRunAt).toBeNull();
  });

  it("保存するまでは何も書かない（追加の途中でキャンセルしてもいつものエゴサは増えない）", async () => {
    const { api } = await setup();
    await mountPage(api);
    fireEvent.change(nameInput(), { target: { value: "毎朝エゴサ" } });
    fireEvent.click(screen.getByRole("button", { name: "ぺこらエゴサを追加" }));
    fireEvent.click(screen.getAllByRole("button", { name: "キャンセル" })[0]);
    expect(push).toHaveBeenLastCalledWith("/groups");
    expect((await api.data.init()).groups).toHaveLength(1);
  });
});

describe("S4-E：編集（?id=）", () => {
  it("名前と項目（番号・名前・検索先バッジ・文字列）を展開して出す。lastRunAt は保存しても残る", async () => {
    const { api, group } = await setup();
    // 実行済みにしておく
    await api.data.history.record(
      api.url.plan(group.items.map((i) => ({ ...i }))),
      { kind: "group", label: group.name, groupId: group.id },
    );
    const ran = (await api.data.init()).groups[0].lastRunAt;
    expect(ran).not.toBeNull();
    search = `id=${group.id}`;
    await mountPage(api);
    expect(
      screen.getByRole("heading", { name: "いつものエゴサを編集" }),
    ).toBeInTheDocument();
    expect(nameInput().value).toBe("配信後エゴサ");
    expect(items()).toHaveLength(2);
    expect(engineOf(items()[0], "X")).toBeChecked();
    expect(engineOf(items()[1], "Yahoo!リアルタイム検索")).toBeChecked();
    // お気に入りに無い文字列は、そのまま名前の代わりに出る
    expect(
      within(items()[1]).getAllByText("歌枠 min_faves:100").length,
    ).toBeGreaterThan(0);
    expect(within(items()[1]).getByText("2")).toBeInTheDocument();

    fireEvent.change(nameInput(), { target: { value: "改名" } });
    save();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/groups"));
    const after = (await api.data.init()).groups.find(
      (g) => g.id === group.id,
    )!;
    expect(after.name).toBe("改名");
    expect(after.items).toEqual(group.items);
    expect(after.lastRunAt).toBe(ran);
  });

  it("［↓］［↑］で順を変え、［×］で外し、保存すると反映される", async () => {
    const { api, group } = await setup();
    search = `id=${group.id}`;
    await mountPage(api);
    fireEvent.click(screen.getByRole("button", { name: "ぺこらエゴサを下へ" }));
    expect(items()[0]).toHaveTextContent("歌枠 min_faves:100");
    fireEvent.click(screen.getByRole("button", { name: "ぺこらエゴサを上へ" }));
    expect(items()[0]).toHaveTextContent("ぺこらエゴサ");
    fireEvent.click(screen.getByRole("button", { name: "ぺこらエゴサを下へ" }));
    fireEvent.click(
      screen.getByRole("button", { name: "歌枠 min_faves:100を外す" }),
    );
    expect(items()).toHaveLength(1);
    save();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/groups"));
    expect((await api.data.init()).groups[0].items).toEqual([
      { query: "ぺこら -filter:retweets", engine: "x" },
    ]);
  });

  it("［↓］で動かした項目のボタンにフォーカスが残る（キーボードで続けて動かせる）", async () => {
    const { api, group } = await setup();
    search = `id=${group.id}`;
    await mountPage(api);
    const down = screen.getByRole("button", { name: "ぺこらエゴサを下へ" });
    down.focus();
    fireEvent.click(down);
    expect(items()[1]).toHaveTextContent("ぺこらエゴサ");
    expect(document.activeElement).toBe(down);
  });

  it("id に当たるいつものエゴサが無いときは、空状態と一覧へのリンクを出す", async () => {
    const { api } = await setup();
    search = "id=nothing";
    await mountPage(api);
    expect(
      screen.getByText(
        "このいつものエゴサは見つかりません（削除済みの可能性があります）",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "いつものエゴサの一覧へ" }),
    ).toHaveAttribute("href", "/groups");
    expect(screen.queryByLabelText("名前")).toBeNull();
  });
});

describe("S4-E：追加元（お気に入り・履歴・新しく作る）のタブ", () => {
  it("［新しく作る］は3つ目のタブで、選ぶまで組み立ては出ず、矢印キーで3つを回れる", async () => {
    const { api } = await setup();
    await mountPage(api);
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "お気に入り",
      "履歴",
      "新しく作る",
    ]);
    expect(tab("お気に入り")).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText("検索する語")).toBeNull();
    fireEvent.keyDown(tab("お気に入り"), { key: "ArrowRight" });
    fireEvent.keyDown(tab("履歴"), { key: "ArrowRight" });
    expect(tab("新しく作る")).toHaveAttribute("aria-selected", "true");
    expect(word()).toBeInTheDocument();
    // 作るタブだけ高さが自由（お気に入り・履歴は高さ固定）
    expect(screen.getByRole("tabpanel")).not.toHaveClass("h-64");
    fireEvent.keyDown(tab("新しく作る"), { key: "ArrowRight" });
    expect(tab("お気に入り")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveClass("h-64");
  });

  it("項目の検索先を変えて保存すると、その項目だけが変わり、お気に入りの検索先は変わらない。追加済み（［削除］）のままになる", async () => {
    const { api, group } = await setup();
    const favBefore = (await api.data.init()).favorites.map((f) => ({
      query: f.query,
      engine: f.engine,
    }));
    search = `id=${group.id}`;
    await mountPage(api);
    // 1つ目（X）を、Yahoo に変える
    fireEvent.click(engineOf(items()[0], "Yahoo!リアルタイム検索"));
    expect(engineOf(items()[0], "Yahoo!リアルタイム検索")).toBeChecked();
    expect(engineOf(items()[1], "Yahoo!リアルタイム検索")).toBeChecked();
    // お気に入りの行は、検索先を変えても［削除］のまま（文字列だけで追加済みを判定する）
    expect(
      screen.getByRole("button", {
        name: /^ぺこらエゴサをこのいつものエゴサから削除$/,
      }),
    ).toBeInTheDocument();
    save();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/groups"));
    const d = await api.data.init();
    const after = d.groups.find((g) => g.id === group.id)!;
    expect(after.items.map((i) => i.engine)).toEqual(["yahoo", "yahoo"]);
    expect(after.items[0].query).toBe(group.items[0].query);
    expect(
      d.favorites.map((f) => ({ query: f.query, engine: f.engine })),
    ).toEqual(favBefore);
  });

  it("切替は［お気に入り］が初期で、矢印キーで［履歴］に移ると履歴の一覧が出る", async () => {
    const { api } = await setup();
    await runOnce(api, "さくら");
    await mountPage(api);
    expect(tab("お気に入り")).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("button", { name: "ぺこらエゴサを追加" }),
    ).toBeInTheDocument();
    tab("お気に入り").focus();
    fireEvent.keyDown(tab("お気に入り"), { key: "ArrowRight" });
    expect(tab("履歴")).toHaveAttribute("aria-selected", "true");
    expect(tab("履歴")).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: "ぺこらエゴサを追加" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "さくらを追加" }),
    ).toBeInTheDocument();
  });

  it("履歴は、同じ検索文字列と検索先の重複を1件にまとめる（検索先が違えば別）", async () => {
    const { api } = await setup();
    await runOnce(api, "さくら");
    await runOnce(api, "さくら");
    await runOnce(api, "さくら", "yahoo");
    await mountPage(api);
    fireEvent.click(tab("履歴"));
    const rows = screen.getAllByRole("button", { name: "さくらを追加" });
    expect(rows).toHaveLength(2);
  });

  it("履歴が0件のときは案内を出す", async () => {
    const { api } = await setup();
    await mountPage(api);
    fireEvent.click(tab("履歴"));
    expect(screen.getByText("実行するとここに残ります")).toBeInTheDocument();
  });

  it("履歴から追加すると、お気に入りも新しく作り（名前は「<いつものエゴサ名>：<検索語>」）、項目に足す", async () => {
    const { api } = await setup();
    await runOnce(api, "さくら", "yahoo");
    await mountPage(api);
    fireEvent.change(nameInput(), { target: { value: "毎朝エゴサ" } });
    fireEvent.click(tab("履歴"));
    fireEvent.click(screen.getByRole("button", { name: "さくらを追加" }));
    await waitFor(() => expect(items()).toHaveLength(1));
    const made = (await api.data.init()).favorites.find(
      (f) => f.name === "毎朝エゴサ：さくら",
    )!;
    expect(made).toMatchObject({ query: "さくら", engine: "yahoo" });
    expect(engineOf(items()[0], "Yahoo!リアルタイム検索")).toBeChecked();
  });

  it("同じ検索文字列のお気に入りが既にあるときは、お気に入りを作らず項目だけに足す", async () => {
    const { api } = await setup();
    await runOnce(api, "ぺこら -filter:retweets");
    await mountPage(api);
    fireEvent.click(tab("履歴"));
    fireEvent.click(screen.getByRole("button", { name: "ぺこらエゴサを追加" }));
    await waitFor(() => expect(items()).toHaveLength(1));
    expect((await api.data.init()).favorites).toHaveLength(1);
    expect(items()[0]).toHaveTextContent("ぺこらエゴサ");
  });

  it("追加したあと、押したボタンにフォーカスが残る（続けて追加できる）", async () => {
    const { api } = await setup();
    await mountPage(api);
    const add = screen.getByRole("button", { name: "ぺこらエゴサを追加" });
    add.focus();
    fireEvent.click(add);
    await waitFor(() => expect(items()).toHaveLength(1));
    // 同じボタンが［削除］に変わり、フォーカスはそのまま
    expect(document.activeElement).toBe(add);
    expect(add).toHaveAccessibleName(
      "ぺこらエゴサをこのいつものエゴサから削除",
    );
  });

  it("追加済みの行は［削除］になり、押すと項目だけが外れて［＋ 追加］に戻る（お気に入りは残る）。幅は変わらない", async () => {
    const { api } = await setup();
    await mountPage(api);
    const btn = screen.getByRole("button", { name: "ぺこらエゴサを追加" });
    const before = btn.className;
    fireEvent.click(btn);
    await waitFor(() => expect(items()).toHaveLength(1));
    expect(btn).toHaveTextContent("削除");
    expect(btn.className).toBe(before);
    fireEvent.click(btn);
    await waitFor(() => expect(items()).toHaveLength(0));
    expect(btn).toHaveTextContent("＋ 追加");
    expect((await api.data.init()).favorites).toHaveLength(1);
  });

  it("編集で、すでに入っている項目と同じお気に入りの行は最初から［削除］になる", async () => {
    const { api, group } = await setup();
    search = `id=${group.id}`;
    await mountPage(api);
    expect(
      screen.getByRole("button", {
        name: "ぺこらエゴサをこのいつものエゴサから削除",
      }),
    ).toHaveTextContent("削除");
  });
});

describe("S4-E：②条件を指定して新しく作る", () => {
  it("お気に入りに保存して項目に足し、組み立てを空に戻す。名前は「<いつものエゴサ名>：<検索語>」で自動", async () => {
    const { api } = await setup();
    await mountPage(api);
    openMaker();
    fireEvent.change(nameInput(), { target: { value: "毎朝エゴサ" } });
    fireEvent.change(word(), { target: { value: "さくら" } });
    expect(screen.getByText("毎朝エゴサ：さくら")).toBeInTheDocument();
    addToGroup();

    await waitFor(() => expect(items()).toHaveLength(1));
    const favs = (await api.data.init()).favorites;
    const made = favs.find((f) => f.name === "毎朝エゴサ：さくら")!;
    // 完全一致が初期で ON なので、検索語は引用符で囲まれる
    expect(made.query).toBe('"さくら"');
    expect(made.engine).toBe("x");
    expect(items()[0]).toHaveTextContent("毎朝エゴサ：さくら");
    // 組み立ては空に戻る（完全一致 ON）。いつものエゴサ自体はまだ保存していない
    expect(word().value).toBe("");
    expect(screen.getByRole("checkbox", { name: "完全一致" })).toBeChecked();
    expect((await api.data.init()).groups.map((g) => g.name)).toEqual([
      "配信後エゴサ",
    ]);
  });

  it("検索先を選んで追加すると、その検索先が項目と新しいお気に入りに入る", async () => {
    const { api } = await setup();
    await mountPage(api);
    openMaker();
    fireEvent.change(nameInput(), { target: { value: "毎朝エゴサ" } });
    fireEvent.change(word(), { target: { value: "さくら" } });
    fireEvent.click(
      screen.getAllByRole("radio", { name: "Yahoo!リアルタイム検索" })[0],
    );
    // 2か所の操作は同じ状態を共有する
    for (const r of screen.getAllByRole("radio", {
      name: "Yahoo!リアルタイム検索",
    }))
      expect(r).toBeChecked();
    addToGroup();
    await waitFor(() => expect(items()).toHaveLength(1));
    expect(engineOf(items()[0], "Yahoo!リアルタイム検索")).toBeChecked();
    expect(
      (await api.data.init()).favorites.find(
        (f) => f.name === "毎朝エゴサ：さくら",
      )!.engine,
    ).toBe("yahoo");
  });

  it("検索語も条件も無いときは追加せず、理由を出し、お気に入りも作らない", async () => {
    const { api } = await setup();
    await mountPage(api);
    openMaker();
    addToGroup();
    expect(items()).toHaveLength(0);
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "検索語か条件を入力してください",
    );
    expect((await api.data.init()).favorites).toHaveLength(1);
  });

  it("名前も検索語も空で、1つ目の ON のボタン名があればそれを名前にする。何も無ければ辞書の既定名", async () => {
    const { api } = await setup();
    await mountPage(api);
    openMaker();
    openMore(); // 画像つきは先頭 foldChips 個より後ろ
    fireEvent.click(
      screen.getAllByRole("button", { name: labeled("画像つき") })[0],
    );
    addToGroup();
    await waitFor(() => expect(items()).toHaveLength(1));
    const favs = (await api.data.init()).favorites;
    expect(favs.some((f) => f.name === "画像つき")).toBe(true);
  });

  it("条件ボタン・検索ワード集の ON は、この画面の中だけで、保存済みの ON もホームの状態も変えない", async () => {
    const { api } = await setup();
    const before = (await hololive(api)).map((c) => [c.id, c.on]);
    await mountPage(api);
    openMaker();
    const homeBefore = homeText();
    openMore(); // 返信のみは先頭 foldChips 個より後ろ
    fireEvent.click(
      screen.getAllByRole("button", { name: labeled("返信のみ") })[0],
    );
    expect(
      screen.getAllByRole("button", { name: labeled("返信のみ") })[0],
    ).toHaveAttribute("aria-pressed", "true");

    const w = api.master.wordSet("hololive")[1].words[0];
    fireEvent.click(screen.getByRole("button", { name: "検索ワード集" }));
    const dialog = await screen.findByRole("dialog", { name: "検索ワード集" });
    fireEvent.click(
      within(dialog).getByRole("button", { name: labeled(w.label.ja) }),
    );

    expect((await hololive(api)).map((c) => [c.id, c.on])).toEqual(before);
    expect(homeText()).toBe(homeBefore);
    expect(JSON.parse(homeText() ?? "{}").suggestionTokens).toEqual([]);
  });
});

describe("S4-E：キャンセル", () => {
  it("遷移前のアプリ内ページへ戻り、記録が無ければ一覧へ戻る", async () => {
    const { api } = await setup();
    await mountPage(api);
    fireEvent.click(screen.getAllByRole("button", { name: "キャンセル" })[0]);
    expect(push).toHaveBeenLastCalledWith("/groups");
    cleanup();

    sessionStorage.setItem("egosearch:path:prev", "/favorites");
    sessionStorage.setItem("egosearch:path:current", "/groups/edit");
    await mountPage(api);
    fireEvent.click(screen.getAllByRole("button", { name: "キャンセル" })[1]);
    expect(push).toHaveBeenLastCalledWith("/favorites");
  });
});
