import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIMITS, type Chip, type EgoSearchApi } from "@/api";
import { createBackend } from "@/backend";
import { mount, recordOneHistory } from "@/components/search/harness";
import { ChipRow } from "@/components/search/chip-row";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { ChipsPage } from "./chips-page";

// jsdom でシートを開く操作が重く、並列実行の負荷で5秒を超えることがあるため、このファイルだけ延ばす
vi.setConfig({ testTimeout: 30_000 });

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

async function setup(): Promise<{ api: EgoSearchApi; chips: Chip[] }> {
  const api = createBackend({ kv: new MemoryAdapter(), clock });
  const data = await api.data.init();
  return { api, chips: data.chips.get("hololive")! };
}
const chipsNow = async (api: EgoSearchApi) =>
  (await api.data.init()).chips.get("hololive")!;
const mountPage = (api: EgoSearchApi) =>
  mount(api, <ChipsPage />, { scope: false });
const rows = () =>
  within(screen.getByRole("list", { name: "条件ボタンの一覧" })).getAllByRole(
    "listitem",
  );
const rowOf = (label: string) =>
  rows().find((r) => within(r).queryByText(label, { exact: true }))!;

let writeText: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
    "ja-JP",
  ]);
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

describe("S2 条件ボタン：一覧", () => {
  it("今の興味の対象の条件ボタンを全件、非表示のものも含めて並べ、件数と上限を出す", async () => {
    const { api, chips } = await setup();
    await api.data.chips.setVisible(chips[1].id, false);
    await mountPage(api);
    expect(rows()).toHaveLength(chips.length);
    expect(screen.getByLabelText("条件ボタンの数").textContent).toBe(
      `${chips.length}/${LIMITS.chips}`,
    );
    expect(
      within(rowOf(chips[1].label)).getByText("非表示"),
    ).toBeInTheDocument();
    expect(
      within(rowOf(chips[0].label)).getByText("プリセット"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/いま選んでいる「ホロライブ」の並び/),
    ).toBeInTheDocument();
  });

  it("［表示］を外すと保存され、行に「非表示」が付く（ボタンは消えない）", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    const box = within(rowOf(chips[0].label)).getByRole("checkbox");
    fireEvent.click(box);
    await waitFor(async () =>
      expect((await chipsNow(api))[0].visible).toBe(false),
    );
    expect(
      within(rowOf(chips[0].label)).getByText("非表示"),
    ).toBeInTheDocument();
  });

  it("［コピー］は条件の文字列をクリップボードに入れ、トーストで知らせる", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    fireEvent.click(
      within(rowOf(chips[0].label)).getByRole("button", { name: "コピー" }),
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(chips[0].query));
    expect(
      await screen.findByText(`「${chips[0].label}」の条件をコピーしました`),
    ).toBeInTheDocument();
  });

  it("［×］で削除済みへ移り、トーストの［元に戻す］で元の位置に戻る", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    const target = chips[2];
    fireEvent.click(
      within(rowOf(target.label)).getByRole("button", {
        name: `${target.label}を削除`,
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText(target.label, { exact: true })).toBeNull(),
    );
    expect((await api.data.trash.list()).map((e) => e.id)).toContain(target.id);
    fireEvent.click(await screen.findByRole("button", { name: "元に戻す" }));
    await waitFor(() => expect(rowOf(target.label)).toBeDefined());
    expect((await chipsNow(api)).map((c) => c.id)).toEqual(
      chips.map((c) => c.id),
    );
  });
});

describe("S2 条件ボタン：プリセットと上限", () => {
  it("［プリセットを追加］：すべてあるときは「すべて登録済み」、消したものは足し直す", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    fireEvent.click(screen.getByRole("button", { name: "プリセットを追加" }));
    expect(
      await screen.findByText("プリセットのボタンはすべて登録済みです"),
    ).toBeInTheDocument();
    cleanup();

    await api.data.chips.remove(chips[0].id);
    await mountPage(api);
    expect(screen.queryByText(chips[0].label, { exact: true })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "プリセットを追加" }));
    expect(
      await screen.findByText("プリセットのボタンを1件追加しました"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText(chips[0].label, { exact: true })).toHaveLength(
        1,
      ),
    );
  });

  it("0件のときは空状態に［プリセット（ホロライブ）を追加］を出す", async () => {
    const { api, chips } = await setup();
    for (const c of chips) await api.data.chips.remove(c.id);
    await mountPage(api);
    expect(screen.getByText("条件ボタンがありません")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "プリセット（ホロライブ）を追加" }),
    );
    await waitFor(() => expect(rows()).toHaveLength(chips.length));
  });

  it("上限に達すると［＋ 追加］とサジェストの追加が押せず、理由を出す。既存は消えない", async () => {
    const { api, chips } = await setup();
    for (let i = chips.length; i < LIMITS.chips; i++)
      await api.data.chips.save({
        interestId: "hololive",
        label: `c${i}`,
        query: `zz${i}`,
      });
    await recordOneHistory(api, "#候補タグ");
    await mountPage(api);
    expect(screen.getByRole("button", { name: "＋ 追加" })).toBeDisabled();
    expect(
      screen.getByText(
        `⚠ 上限（${LIMITS.chips}件）です。不要なボタンを削除してください。`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "#候補タグを条件ボタンに追加" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        `⚠ 条件ボタンが上限（${LIMITS.chips}件）のため追加できません`,
      ),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(LIMITS.chips);
  });
});

describe("S2 サジェストと「新」の印", () => {
  it("候補が無いときは案内を出す", async () => {
    const { api } = await setup();
    await recordOneHistory(api); // 履歴が1件（候補は条件ボタンにあるものだけ）
    await mountPage(api);
    expect(
      screen.getByText("検索するとここに候補が出ます"),
    ).toBeInTheDocument();
  });

  it("［＋ 条件ボタンに追加］で末尾に増え「新」が付く。ホームの並びにも出て、押すと消える", async () => {
    const { api, chips } = await setup();
    await recordOneHistory(api, "#候補タグ");
    await mount(
      api,
      <>
        <ChipsPage />
        <ChipRow />
      </>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "#候補タグを条件ボタンに追加" }),
    );
    await waitFor(() => expect(rows()).toHaveLength(chips.length + 1));
    const row = rows()[chips.length];
    // ラベルは検索文字列から作る（ラベルと中身の2か所に出る）
    expect(within(row).getAllByText("#候補タグ")).toHaveLength(2);
    expect(within(row).getByText("新")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "#候補タグを条件ボタンに追加" }),
    ).toBeNull();

    // ホームの並び（先頭8個の外なら［もっと開く］で開く）
    const group = screen.getByRole("group", { name: "条件ボタン" });
    const more = within(group).queryByRole("button", { name: /もっと開く/ });
    if (more) fireEvent.click(more);
    const homeChip = await within(group).findByRole("button", {
      // 「新」の印も名前に入る（ラベルで終わらない）
      name: /#候補タグ/,
    });
    expect(within(homeChip).getByText("新")).toBeInTheDocument();
    fireEvent.click(homeChip);
    await waitFor(() =>
      expect(within(rows()[chips.length]).queryByText("新")).toBeNull(),
    );
    expect(within(homeChip).queryByText("新")).toBeNull();
  });
});

describe("S2 条件ボタン：絞り込み", () => {
  const box = () => screen.getByLabelText("ラベルや検索文字列で絞り込み");

  it("ラベルでも検索文字列でも絞れる", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    fireEvent.change(box(), { target: { value: chips[0].label } });
    expect(
      within(rowOf(chips[0].label)).getByText(chips[0].query),
    ).toBeInTheDocument();
    expect(rows().length).toBeLessThan(chips.length);
    fireEvent.change(box(), { target: { value: chips[0].query } });
    expect(
      within(rowOf(chips[0].label)).getByText(chips[0].query),
    ).toBeInTheDocument();
    expect(rows().length).toBeLessThan(chips.length);
  });

  it("該当が無いと「該当なし」と並べ替えの注記を出し、消すと全件に戻る", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    fireEvent.change(box(), { target: { value: "存在しない語zzz" } });
    expect(screen.getByText("該当なし")).toBeInTheDocument();
    expect(
      screen.getByText("絞り込み中は並べ替えを反映しません"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "条件ボタンの一覧" })?.children
        .length ?? 0,
    ).toBe(0);
    fireEvent.change(box(), { target: { value: "" } });
    expect(rows()).toHaveLength(chips.length);
  });
});
