import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS, type EgoSearchApi } from "@/api";
import { createBackend } from "@/backend";
import { mount } from "@/components/search/harness";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { TrashPage } from "./trash-page";

// jsdom の描画が重く、並列実行の負荷で5秒を超えることがあるため、このファイルだけ延ばす
vi.setConfig({ testTimeout: 30_000 });

/** 呼ぶたびに1秒進む時計（削除済みは削除日時の新しい順に並ぶので、同じ時刻だと順序が決まらない） */
function makeClock() {
  let sec = 0;
  return {
    today: () => "2026-11-19",
    now: () => new Date(Date.UTC(2026, 10, 19, 3, 0, sec++)).toISOString(),
  };
}

const newApi = async () => {
  const api = createBackend({ kv: new MemoryAdapter(), clock: makeClock() });
  await api.data.init();
  return api;
};

/** 古い順に削除：条件ボタン（にじさんじ）→ お気に入り → いつものエゴサ */
async function setup(): Promise<EgoSearchApi> {
  const api = await newApi();
  const chip = await api.data.chips.save({
    interestId: "nijisanji",
    label: "テスト条件",
    query: "zz_test",
  });
  const fav = await api.data.favorites.save({
    name: "歌枠チェック",
    query: "歌枠 -filter:retweets",
    engine: "yahoo",
  });
  // いつものエゴサの項目の名前は、有効なお気に入りの名前から導く
  await api.data.favorites.save({
    name: "雑談の検索",
    query: "雑談",
    engine: "x",
  });
  const group = await api.data.groups.save({
    name: "配信後エゴサ",
    items: [{ query: "雑談", engine: "x" }],
  });
  await api.data.chips.remove(chip.id);
  await api.data.favorites.remove(fav.id);
  await api.data.groups.remove(group.id);
  return api;
}

const mountPage = (api: EgoSearchApi) =>
  mount(api, <TrashPage />, { scope: false });
const rows = () =>
  within(screen.getByRole("list", { name: "削除済みの一覧" })).getAllByRole(
    "listitem",
  );
const tab = (name: string) => screen.getByRole("tab", { name });
const trashIds = async (api: EgoSearchApi) =>
  (await api.data.trash.list()).map((e) => e.id);

beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
    "ja-JP",
  ]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("S6 削除済み：一覧と種類のタブ", () => {
  it("0件のときは空状態を出し、［すべて完全削除］は押せない。種類のタブでは種類ごとの文言と、押せない［<種類>をすべて完全削除］", async () => {
    await mountPage(await newApi());
    expect(
      await screen.findByText("削除したものはここに入ります"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "すべて完全削除" }),
    ).toBeDisabled();
    expect(tab("すべて 0")).toHaveAttribute("aria-selected", "true");

    fireEvent.click(tab(`条件ボタン 0/${LIMITS.trash}`));
    expect(
      screen.getByText("削除した条件ボタンはありません"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "条件ボタンをすべて完全削除" }),
    ).toBeDisabled();
  });

  it("注記に保持数の上限（定数）と、種類が独立していることを出す", async () => {
    await mountPage(await newApi());
    expect(
      await screen.findByText(
        new RegExp(`それぞれ${LIMITS.trash}件まで残ります`),
      ),
    ).toBeInTheDocument();
  });

  it("削除した新しい順に並べ、種類のタブに件数（N と N/上限）を出し、タブで絞り込む", async () => {
    await mountPage(await setup());
    await screen.findByRole("list", { name: "削除済みの一覧" });
    const r = rows();
    expect(r).toHaveLength(3);
    expect(within(r[0]).getByText("配信後エゴサ")).toBeInTheDocument();
    expect(within(r[1]).getByText("歌枠チェック")).toBeInTheDocument();
    expect(within(r[2]).getByText("テスト条件")).toBeInTheDocument();

    expect(tab("すべて 3")).toBeInTheDocument();
    fireEvent.click(tab(`お気に入り 1/${LIMITS.trash}`));
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText("歌枠チェック")).toBeInTheDocument();
    expect(tab(`お気に入り 1/${LIMITS.trash}`)).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "お気に入りをすべて完全削除" }),
    ).toBeEnabled();
  });

  it("矢印キーでタブを移れる", async () => {
    await mountPage(await setup());
    await screen.findByRole("list", { name: "削除済みの一覧" });
    const all = tab("すべて 3");
    all.focus();
    fireEvent.keyDown(all, { key: "ArrowRight" });
    const next = tab(`条件ボタン 1/${LIMITS.trash}`);
    expect(next).toHaveAttribute("aria-selected", "true");
    expect(next).toHaveFocus();
    fireEvent.keyDown(next, { key: "ArrowLeft" });
    expect(tab("すべて 3")).toHaveFocus();
  });

  it("条件ボタンの行には、削除したときの興味の対象の名前を出す", async () => {
    await mountPage(await setup());
    await screen.findByRole("list", { name: "削除済みの一覧" });
    expect(
      within(rows()[2]).getByText("条件ボタン（にじさんじ）"),
    ).toBeInTheDocument();
    expect(within(rows()[1]).getByText("お気に入り")).toBeInTheDocument();
  });
});

describe("S6 削除済み：中身を見る", () => {
  it("条件ボタンは条件の文字列、お気に入りは開くときの文字列、いつものエゴサは項目の名前と文字列を出し、隠せる", async () => {
    const api = await setup();
    await mountPage(api);
    await screen.findByRole("list", { name: "削除済みの一覧" });

    const group = rows()[0];
    fireEvent.click(within(group).getByRole("button", { name: "中身を見る" }));
    expect(await within(group).findByText("雑談の検索")).toBeInTheDocument();
    expect(within(group).getByText("雑談")).toBeInTheDocument();
    const hide = within(group).getByRole("button", { name: "中身を隠す" });
    expect(hide).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(hide);
    expect(within(group).queryByText("雑談の検索")).toBeNull();

    const fav = rows()[1];
    fireEvent.click(within(fav).getByRole("button", { name: "中身を見る" }));
    expect(
      await within(fav).findByText(api.query.expand("歌枠 -filter:retweets")),
    ).toBeInTheDocument();

    const chip = rows()[2];
    fireEvent.click(within(chip).getByRole("button", { name: "中身を見る" }));
    expect(await within(chip).findByText("zz_test")).toBeInTheDocument();
  });
});

describe("S6 削除済み：復元", () => {
  it("確認なしで戻り、行が消え、フォーカスは選んでいるタブへ移る", async () => {
    const api = await setup();
    await mountPage(api);
    await screen.findByRole("list", { name: "削除済みの一覧" });
    fireEvent.click(within(rows()[1]).getByRole("button", { name: "復元" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(screen.queryByText("歌枠チェック")).toBeNull();
    expect((await api.data.init()).favorites.map((f) => f.name)).toContain(
      "歌枠チェック",
    );
    await waitFor(() => expect(tab("すべて 2")).toHaveFocus());
  });

  it("条件ボタンは、削除したときの並びの元の位置に戻る", async () => {
    const api = await newApi();
    const saved = [];
    for (const label of ["A", "B", "C"])
      saved.push(
        await api.data.chips.save({
          interestId: "nijisanji",
          label,
          query: `zz_${label}`,
        }),
      );
    await api.data.chips.remove(saved[1].id);
    await mountPage(api);
    await screen.findByRole("list", { name: "削除済みの一覧" });
    fireEvent.click(screen.getByRole("button", { name: "復元" }));
    await waitFor(() =>
      expect(screen.queryByRole("list", { name: "削除済みの一覧" })).toBeNull(),
    );
    const labels = ((await api.data.init()).chips.get("nijisanji") ?? [])
      .map((x) => x.label)
      .filter((l) => ["A", "B", "C"].includes(l));
    expect(labels).toEqual(["A", "B", "C"]);
  });

  it("戻す先の条件ボタンが上限のときは、［復元］が押せず、理由を行の下に出す。別の対象の行は戻せる", async () => {
    const api = await newApi();
    const full = await api.data.chips.save({
      interestId: "hololive",
      label: "満杯の対象",
      query: "zz_full",
    });
    const other = await api.data.chips.save({
      interestId: "nijisanji",
      label: "別の対象",
      query: "zz_other",
    });
    await api.data.chips.remove(full.id);
    await api.data.chips.remove(other.id);
    const have = (await api.data.init()).chips.get("hololive")?.length ?? 0;
    for (let i = have; i < LIMITS.chips; i++)
      await api.data.chips.save({
        interestId: "hololive",
        label: `c${i}`,
        query: `zz${i}`,
      });
    await mountPage(api);
    await screen.findByRole("list", { name: "削除済みの一覧" });
    const fullRow = rows().find((r) => within(r).queryByText("満杯の対象"))!;
    expect(
      within(fullRow).getByRole("button", { name: "復元" }),
    ).toBeDisabled();
    expect(
      within(fullRow).getByText(
        `⚠ 条件ボタンが上限（${LIMITS.chips}件）のため復元できません`,
      ),
    ).toBeInTheDocument();
    const otherRow = rows().find((r) => within(r).queryByText("別の対象"))!;
    expect(
      within(otherRow).getByRole("button", { name: "復元" }),
    ).toBeEnabled();
    expect(within(otherRow).queryByText(/上限/)).toBeNull();
  });
});

describe("S6 削除済み：完全削除（確認ダイアログを必ず挟む）", () => {
  it("1件：キャンセルでは消えず、［完全に削除］で消える。フォーカスは選んでいるタブへ移る", async () => {
    const api = await setup();
    await mountPage(api);
    await screen.findByRole("list", { name: "削除済みの一覧" });
    fireEvent.click(
      within(rows()[1]).getByRole("button", { name: "完全に削除" }),
    );
    let dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("「歌枠チェック」を完全に削除しますか？"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("元に戻せません。")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "キャンセル" }),
    ).toHaveFocus();
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(await trashIds(api)).toHaveLength(3);
    // キャンセルでは、押した［完全に削除］へフォーカスが戻る
    await waitFor(() =>
      expect(
        within(rows()[1]).getByRole("button", { name: "完全に削除" }),
      ).toHaveFocus(),
    );

    fireEvent.click(
      within(rows()[1]).getByRole("button", { name: "完全に削除" }),
    );
    dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "完全に削除" }));
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(await trashIds(api)).toHaveLength(2);
    await waitFor(() => expect(tab("すべて 2")).toHaveFocus());
  });

  it("種類ごと：選んでいる種類だけが消え、ほかの種類は残る", async () => {
    const api = await setup();
    await mountPage(api);
    await screen.findByRole("list", { name: "削除済みの一覧" });
    fireEvent.click(tab(`お気に入り 1/${LIMITS.trash}`));
    fireEvent.click(
      screen.getByRole("button", { name: "お気に入りをすべて完全削除" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText(
        "お気に入りの削除済みをすべて完全削除しますか？",
      ),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(await trashIds(api)).toHaveLength(3);

    fireEvent.click(
      screen.getByRole("button", { name: "お気に入りをすべて完全削除" }),
    );
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "完全に削除",
      }),
    );
    await waitFor(async () =>
      expect((await api.data.trash.list()).map((e) => e.kind).sort()).toEqual([
        "chip",
        "group",
      ]),
    );
    expect(
      await screen.findByText("削除したお気に入りはありません"),
    ).toBeInTheDocument();
  });

  it("すべて：キャンセルでは消えず、実行するとすべて消えて空状態になる", async () => {
    const api = await setup();
    await mountPage(api);
    await screen.findByRole("list", { name: "削除済みの一覧" });
    fireEvent.click(screen.getByRole("button", { name: "すべて完全削除" }));
    let dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("削除済みをすべて完全削除しますか？"),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(await trashIds(api)).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "すべて完全削除" }));
    dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "完全に削除" }));
    expect(
      await screen.findByText("削除したものはここに入ります"),
    ).toBeInTheDocument();
    expect(await trashIds(api)).toEqual([]);
  });
});

describe("S6 削除済み：英語", () => {
  it("英語の画面では文言が英語になる", async () => {
    vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
      "en-US",
    ]);
    await mountPage(await setup());
    expect(
      await screen.findByRole("heading", { name: "Trash" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete all permanently" }),
    ).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Deleted items" });
    // 条件ボタンの興味の対象は、英語の画面では英語名
    expect(
      within(list).getByText("Condition button (NIJISANJI)"),
    ).toBeInTheDocument();
    expect(
      within(list).getAllByRole("button", { name: "Restore" }),
    ).toHaveLength(3);
  });
});
