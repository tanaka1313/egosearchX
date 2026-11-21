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
import { chipButton, labeled, mount } from "@/components/search/harness";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { useAppStore } from "@/store/store-context";
import { FavoriteEditPage } from "./favorite-edit-page";

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

// ぺこら filter:images -filter:retweets foo:bar（foo:bar はどの条件ボタンにも当たらない）
const QUERY = "ぺこら filter:images -filter:retweets foo:bar";

function Probe() {
  const home = useAppStore((s) => s.home);
  return <output aria-label="home">{JSON.stringify(home)}</output>;
}

async function setup() {
  const api = createBackend({ kv: new MemoryAdapter(), clock });
  await api.data.init();
  const fav = await api.data.favorites.save({
    name: "ぺこらエゴサ",
    query: QUERY,
    engine: "yahoo",
  });
  search = `id=${fav.id}`;
  return { api, fav };
}
const mountPage = (api: EgoSearchApi) =>
  mount(
    api,
    <>
      <FavoriteEditPage />
      <Probe />
    </>,
    { scope: false },
  );
const hololive = async (api: EgoSearchApi) =>
  (await api.data.init()).chips.get("hololive")!;
const word = () => screen.getByLabelText("検索する語") as HTMLInputElement;
const chip = chipButton;
const preview = () =>
  screen.getAllByLabelText(
    "組み立てた検索クエリ（長いときは横にスクロール）",
  )[0];
const save = () =>
  fireEvent.click(screen.getAllByRole("button", { name: "保存" })[0]);

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

describe("S3-E：開いたときの展開", () => {
  it("読み込みが終わる前に描画されても、読み込み後の条件ボタンに当てはめて展開する（空の条件ボタンで固定しない）", async () => {
    const { api } = await setup();
    // `mount` は描画してから読み込みの完了を待つ。読み込み前に展開すると、条件ボタンが空のまま固定される
    await mountPage(api);
    expect(word().value).toBe("ぺこら");
    expect(chip("画像つき")).toHaveAttribute("aria-pressed", "true");
    expect(chip("リポストを除く")).toHaveAttribute("aria-pressed", "true");
    expect(chip("返信のみ")).toHaveAttribute("aria-pressed", "false");
    // 当てはまらない条件は欠けずに残る
    expect(preview()).toHaveTextContent("foo:bar");
    expect(
      screen.getByText(/当てはまらなかった条件は詳細条件に入っています/),
    ).toBeInTheDocument();
  });

  it("名前・検索先（保存した値）・保存している検索文字列（編集前）を出す", async () => {
    const { api } = await setup();
    await mountPage(api);
    expect(screen.getByLabelText("名前")).toHaveValue("ぺこらエゴサ");
    expect(
      screen.getByRole("radio", { name: "Yahoo!リアルタイム検索" }),
    ).toBeChecked();
    // 編集前の文字列は、見出しの下とプレビューの両方に出る
    expect(screen.getAllByText(QUERY).length).toBeGreaterThan(0);
  });

  it("同じ検索文字列（正規化して一致）のいつものエゴサがあれば、名前と件数を案内する。無ければ無いと出す", async () => {
    const { api } = await setup();
    await api.data.groups.save({
      name: "配信後エゴサ",
      items: [
        {
          query: "  ぺこら   filter:images -filter:retweets foo:bar ",
          engine: "x",
        },
      ],
    });
    await mountPage(api);
    expect(
      screen.getByText(/いつものエゴサ（「配信後エゴサ」1件）にあります/),
    ).toBeInTheDocument();
    cleanup();
    const other = await setup();
    await mountPage(other.api);
    expect(
      screen.getByText("この検索文字列を持つ、いつものエゴサはありません。"),
    ).toBeInTheDocument();
  });

  it("id に当たるお気に入りが無いときは、空状態と一覧へのリンクを出す", async () => {
    const { api } = await setup();
    search = "id=nothing";
    await mountPage(api);
    expect(
      screen.getByText(
        "このお気に入りは見つかりません（削除済みの可能性があります）",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "お気に入りの一覧へ" }),
    ).toHaveAttribute("href", "/favorites");
    expect(screen.queryByLabelText("検索する語")).toBeNull();
  });
});

describe("S3-E：保存", () => {
  it("組み立て直した文字列でお気に入りを上書きし、同じ文字列のいつものエゴサの項目も更新する。［元に戻す］で両方戻る", async () => {
    const { api, fav } = await setup();
    const group = await api.data.groups.save({
      name: "配信後エゴサ",
      items: [
        { query: QUERY, engine: "x" },
        { query: "別の検索", engine: "x" },
      ],
    });
    await mountPage(api);
    fireEvent.change(screen.getByLabelText("名前"), {
      target: { value: "さくらエゴサ" },
    });
    fireEvent.change(word(), { target: { value: "さくら" } });
    fireEvent.click(chip("画像つき")); // OFF にする
    save();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/favorites"));
    const after = await api.data.init();
    const saved = after.favorites.find((f) => f.id === fav.id)!;
    expect(saved.name).toBe("さくらエゴサ");
    expect(saved.query).toContain("さくら");
    expect(saved.query).not.toContain("filter:images");
    expect(saved.query).toContain("foo:bar");
    const g = after.groups.find((x) => x.id === group.id)!;
    expect(g.items[0].query).toBe(saved.query);
    expect(g.items[1].query).toBe("別の検索");
    expect(
      await screen.findByText("いつものエゴサの1件の項目も更新しました"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    await waitFor(async () => {
      const back = await api.data.init();
      expect(back.favorites.find((f) => f.id === fav.id)!.query).toBe(QUERY);
      expect(back.groups.find((x) => x.id === group.id)!.items[0].query).toBe(
        QUERY,
      );
    });
  });

  it("一致するいつものエゴサが無ければ、件数のトーストは出さず「保存しました」", async () => {
    const { api } = await setup();
    await mountPage(api);
    fireEvent.change(screen.getByLabelText("名前"), {
      target: { value: "改名" },
    });
    save();
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(await screen.findByText("保存しました")).toBeInTheDocument();
    expect(screen.queryByText(/件の項目も更新しました/)).toBeNull();
  });

  it("検索先を選び直して保存できる", async () => {
    const { api, fav } = await setup();
    await mountPage(api);
    fireEvent.click(screen.getByRole("radio", { name: "両方" }));
    save();
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(
      (await api.data.init()).favorites.find((f) => f.id === fav.id)!.engine,
    ).toBe("both");
  });

  it("名前が空のときは保存せず、理由を出す", async () => {
    const { api, fav } = await setup();
    await mountPage(api);
    fireEvent.change(screen.getByLabelText("名前"), {
      target: { value: "  " },
    });
    save();
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "名前を入力してください",
    );
    expect(push).not.toHaveBeenCalled();
    expect(
      (await api.data.init()).favorites.find((f) => f.id === fav.id)!.name,
    ).toBe("ぺこらエゴサ");
  });

  it("検索語も条件も無いときは保存せず、理由を出す", async () => {
    const { api, fav } = await setup();
    await mountPage(api);
    fireEvent.change(word(), { target: { value: "" } });
    fireEvent.click(chip("画像つき"));
    fireEvent.click(chip("リポストを除く"));
    // 当てはまらなかった条件（foo:bar）が詳細条件に残っているので、それも外す
    fireEvent.change(screen.getByLabelText("テキストで追加する条件"), {
      target: { value: "" },
    });
    save();
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "検索語か条件を入力してください",
    );
    expect(push).not.toHaveBeenCalled();
    expect(
      (await api.data.init()).favorites.find((f) => f.id === fav.id)!.query,
    ).toBe(QUERY);
  });
});

describe("S3-E：複製・キャンセル", () => {
  it("［複製］は編集中の内容を新しいお気に入り「<名前>（複製）」として保存し、元といつものエゴサは変えない", async () => {
    const { api, fav } = await setup();
    const group = await api.data.groups.save({
      name: "配信後エゴサ",
      items: [{ query: QUERY, engine: "x" }],
    });
    await mountPage(api);
    fireEvent.change(word(), { target: { value: "さくら" } });
    fireEvent.click(screen.getAllByRole("button", { name: "複製" })[0]);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/favorites"));
    const after = await api.data.init();
    expect(after.favorites).toHaveLength(2);
    const copy = after.favorites.find((f) => f.id !== fav.id)!;
    expect(copy.name).toBe("ぺこらエゴサ（複製）");
    expect(copy.query).toContain("さくら");
    expect(copy.engine).toBe("yahoo");
    expect(after.favorites.find((f) => f.id === fav.id)!.query).toBe(QUERY);
    expect(after.groups.find((g) => g.id === group.id)!.items[0].query).toBe(
      QUERY,
    );
  });

  it("英語の画面では複製の名前も英語の辞書で作る", async () => {
    vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
      "en-US",
    ]);
    const { api, fav } = await setup();
    await mountPage(api);
    fireEvent.click(screen.getAllByRole("button", { name: "Duplicate" })[0]);
    await waitFor(() => expect(push).toHaveBeenCalled());
    const copy = (await api.data.init()).favorites.find(
      (f) => f.id !== fav.id,
    )!;
    expect(copy.name).toBe("ぺこらエゴサ (copy)");
  });

  it("［キャンセル］は遷移前のアプリ内ページへ戻り、記録が無ければ一覧へ戻る。何も保存しない", async () => {
    const { api, fav } = await setup();
    await mountPage(api);
    fireEvent.change(screen.getByLabelText("名前"), { target: { value: "x" } });
    fireEvent.click(screen.getAllByRole("button", { name: "キャンセル" })[0]);
    expect(push).toHaveBeenLastCalledWith("/favorites");
    cleanup();

    sessionStorage.setItem("egosearch:path:prev", "/");
    sessionStorage.setItem("egosearch:path:current", "/favorites/edit");
    await mountPage(api);
    fireEvent.click(screen.getAllByRole("button", { name: "キャンセル" })[1]);
    expect(push).toHaveBeenLastCalledWith("/");
    expect(
      (await api.data.init()).favorites.find((f) => f.id === fav.id)!.name,
    ).toBe("ぺこらエゴサ");
  });
});

describe("S3-E：この画面の操作がホーム・保存済みの ON に漏れない", () => {
  const homeText = () => screen.getByLabelText("home").textContent;

  it("条件ボタンの ON/OFF は、この画面の中だけで、保存済みの ON もホームの状態も変えない", async () => {
    const { api } = await setup();
    const before = (await hololive(api)).map((c) => [c.id, c.on]);
    await mountPage(api);
    const homeBefore = homeText();
    fireEvent.click(chip("返信のみ"));
    expect(chip("返信のみ")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(chip("画像つき"));
    expect(chip("画像つき")).toHaveAttribute("aria-pressed", "false");
    expect(preview()).toHaveTextContent("filter:replies");
    expect((await hololive(api)).map((c) => [c.id, c.on])).toEqual(before);
    expect(homeText()).toBe(homeBefore);
  });

  it("値付きの条件ボタンの値を変えても、値はボタンに保存されるが、保存済みの ON は変えない", async () => {
    const { api } = await setup();
    await mountPage(api);
    chip("返信のみ"); // 折りたたみで隠れたボタン（ファボ）を出すため、［もっと開く］を押す
    const faves = screen.getByRole("group", { name: "ファボ" });
    fireEvent.change(within(faves).getByLabelText("ファボのファボ数"), {
      target: { value: "120" },
    });
    // この画面では ON になり、クエリに入る
    await waitFor(() => expect(preview()).toHaveTextContent("min_faves:120"));
    expect(within(faves).getByRole("button", { pressed: true })).toBeVisible();
    // 値は共通（ボタンに保存）、ON は保存しない（ホームの ON を勝手に変えない）
    const saved = (await hololive(api)).find((c) => c.label === "ファボ")!;
    expect(saved.query).toBe("min_faves:120");
    expect(saved.on).toBe(false);
  });

  it("検索ワード集の ON は、この画面のクエリにだけ入り、ホームの状態に漏れない", async () => {
    const { api } = await setup();
    await mountPage(api);
    const homeBefore = homeText();
    const w = api.master.wordSet("hololive")[1].words[0];
    fireEvent.click(screen.getByRole("button", { name: "検索ワード集" }));
    const dialog = await screen.findByRole("dialog", { name: "検索ワード集" });
    fireEvent.click(
      within(dialog).getByRole("button", { name: labeled(w.label.ja) }),
    );
    expect(
      within(dialog).getByLabelText(
        "組み立てた検索クエリ（長いときは横にスクロール）",
      ),
    ).toHaveTextContent(w.query);
    expect(homeText()).toBe(homeBefore);
    expect(JSON.parse(homeText() ?? "{}").suggestionTokens).toEqual([]);
  });
});

describe("S3-E：保存せずに開く", () => {
  it("［X で開く］は、この画面の検索を開き、お気に入りの名前の履歴ではなく試し開きとして残す", async () => {
    const { api } = await setup();
    await mountPage(api);
    fireEvent.click(screen.getAllByRole("button", { name: "X で開く" })[0]);
    expect(window.open).toHaveBeenCalledTimes(1);
    await waitFor(async () =>
      expect((await api.data.init()).history[0]?.source.kind).toBe("other"),
    );
  });
});
