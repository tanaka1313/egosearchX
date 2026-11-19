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
import { labeled, mount } from "@/components/search/harness";
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
      screen.getByText("まだありません。下の①か②で追加してください。"),
    ).toBeInTheDocument();
  });

  it("名前が空のときは保存せず、理由を出す", async () => {
    const { api } = await setup();
    await mountPage(api);
    save();
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "名前を入力してください",
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
    expect(within(items()[0]).getByText("1. ぺこらエゴサ")).toBeInTheDocument();
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
    expect(within(items()[0]).getByTitle("検索先：X")).toHaveTextContent(/^X$/);
    expect(
      within(items()[1]).getByTitle("検索先：Yahoo!リアルタイム検索"),
    ).toHaveTextContent(/^Yahoo$/);
    // お気に入りに無い文字列は、そのまま名前の代わりに出る
    expect(within(items()[1]).getByText(/2\. 歌枠 min_faves:100/)).toBeTruthy();

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

describe("S4-E：②条件を指定して新しく作る", () => {
  it("お気に入りに保存して項目に足し、組み立てを空に戻す。名前は「<いつものエゴサ名>：<検索語>」で自動", async () => {
    const { api } = await setup();
    await mountPage(api);
    fireEvent.change(nameInput(), { target: { value: "毎朝エゴサ" } });
    fireEvent.change(word(), { target: { value: "さくら" } });
    expect(screen.getByText("毎朝エゴサ：さくら")).toBeInTheDocument();
    addToGroup();

    await waitFor(() => expect(items()).toHaveLength(1));
    const favs = (await api.data.init()).favorites;
    const made = favs.find((f) => f.name === "毎朝エゴサ：さくら")!;
    expect(made.query).toBe("さくら");
    expect(made.engine).toBe("x");
    expect(items()[0]).toHaveTextContent("毎朝エゴサ：さくら");
    // 組み立ては空に戻る。いつものエゴサ自体はまだ保存していない
    expect(word().value).toBe("");
    expect((await api.data.init()).groups.map((g) => g.name)).toEqual([
      "配信後エゴサ",
    ]);
  });

  it("検索先を選んで追加すると、その検索先が項目と新しいお気に入りに入る", async () => {
    const { api } = await setup();
    await mountPage(api);
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
    expect(
      within(items()[0]).getByTitle("検索先：Yahoo!リアルタイム検索"),
    ).toBeInTheDocument();
    expect(
      (await api.data.init()).favorites.find(
        (f) => f.name === "毎朝エゴサ：さくら",
      )!.engine,
    ).toBe("yahoo");
  });

  it("検索語も条件も無いときは追加せず、理由を出し、お気に入りも作らない", async () => {
    const { api } = await setup();
    await mountPage(api);
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
    const homeBefore = homeText();
    fireEvent.click(
      screen.getAllByRole("button", { name: labeled("返信のみ") })[0],
    );
    expect(
      screen.getAllByRole("button", { name: labeled("返信のみ") })[0],
    ).toHaveAttribute("aria-pressed", "true");

    const w = api.master.wordSet("hololive")[0].words[0];
    fireEvent.click(screen.getByRole("button", { name: "検索ワード集" }));
    const dialog = await screen.findByRole("dialog", { name: "検索ワード集" });
    fireEvent.click(
      within(dialog).getByRole("button", { name: labeled(w.label) }),
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
