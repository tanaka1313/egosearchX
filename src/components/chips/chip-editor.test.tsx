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
import { mount } from "@/components/search/harness";
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

const dialog = () => screen.getByRole("dialog");
const field = (name: string) => within(dialog()).getByLabelText(name);
const save = () =>
  fireEvent.click(within(dialog()).getByRole("button", { name: "保存" }));
const alertText = () => within(dialog()).getByRole("alert").textContent;
const openAdd = () =>
  fireEvent.click(screen.getByRole("button", { name: "＋ 追加" }));
const openEdit = (label: string) =>
  fireEvent.click(screen.getByRole("button", { name: `${label}を編集` }));

beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
    "ja-JP",
  ]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("D1 条件ボタンの追加", () => {
  it("語を入れて保存すると末尾に増える。ラベルが空なら検索文字列がラベルになる", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    openAdd();
    expect(within(dialog()).getByText("条件ボタンを追加")).toBeInTheDocument();
    // 追加のときは、保存済みへ反映されない旨の注記を出さない
    expect(within(dialog()).queryByText(/反映されません/)).toBeNull();
    fireEvent.change(field("条件の値"), { target: { value: "テスト語" } });
    expect(within(dialog()).getByLabelText("プレビュー").textContent).toBe(
      "テスト語",
    );
    save();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const after = await chipsNow(api);
    expect(after).toHaveLength(chips.length + 1);
    expect(after.at(-1)).toMatchObject({
      label: "テスト語",
      query: "テスト語",
      isPreset: false,
      visible: true,
    });
  });

  it("種類を数値にすると演算子を選べて、値は「初期値」。プレビューに出る", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    openAdd();
    fireEvent.change(field("条件の種類"), { target: { value: "number" } });
    fireEvent.change(field("演算子"), { target: { value: "min_retweets" } });
    fireEvent.change(field("初期値（ホームで変えられます）"), {
      target: { value: "30" },
    });
    expect(within(dialog()).getByLabelText("プレビュー").textContent).toBe(
      "min_retweets:30",
    );
    fireEvent.change(field("ラベル（ボタンの表示名）"), {
      target: { value: "RT30" },
    });
    save();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await chipsNow(api)).at(-1)).toMatchObject({
      label: "RT30",
      query: "min_retweets:30",
    });
    expect(await chipsNow(api)).toHaveLength(chips.length + 1);
  });

  it("［＋ 条件を追加］で行が増え、［×］で減る。複数の条件は1つの文字列になる", async () => {
    const { api } = await setup();
    await mountPage(api);
    openAdd();
    fireEvent.change(field("条件の値"), { target: { value: "あ" } });
    fireEvent.click(
      within(dialog()).getByRole("button", { name: "＋ 条件を追加" }),
    );
    const values = within(dialog()).getAllByLabelText("条件の値");
    expect(values).toHaveLength(2);
    fireEvent.change(values[1], { target: { value: "い" } });
    expect(within(dialog()).getByLabelText("プレビュー").textContent).toBe(
      "あ い",
    );
    fireEvent.click(within(dialog()).getAllByLabelText("条件を削除")[0]);
    expect(within(dialog()).getAllByLabelText("条件の値")).toHaveLength(1);
    expect(within(dialog()).getByLabelText("プレビュー").textContent).toBe(
      "い",
    );
  });
});

describe("D1 保存できない理由（シートの中に出す）", () => {
  it("条件が1つも無い", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    openAdd();
    save();
    expect(alertText()).toContain("条件を1つ以上入力してください");
    expect(await chipsNow(api)).toHaveLength(chips.length);
  });

  it("ラベルが20文字を超える（20文字ちょうどは保存できる）", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    openAdd();
    fireEvent.change(field("条件の値"), { target: { value: "あ" } });
    fireEvent.change(field("ラベル（ボタンの表示名）"), {
      target: { value: "a".repeat(LIMITS.chipLabel + 1) },
    });
    save();
    expect(alertText()).toContain(`ラベルは${LIMITS.chipLabel}文字までです`);
    expect(await chipsNow(api)).toHaveLength(chips.length);
    fireEvent.change(field("ラベル（ボタンの表示名）"), {
      target: { value: "a".repeat(LIMITS.chipLabel) },
    });
    save();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await chipsNow(api)).toHaveLength(chips.length + 1);
  });

  it("数値が1以上の整数でない（0）。日付の形式違いは日付入力欄が受け付けない（chip.test.ts が検証）", async () => {
    const { api } = await setup();
    await mountPage(api);
    openAdd();
    fireEvent.change(field("条件の種類"), { target: { value: "number" } });
    fireEvent.change(field("初期値（ホームで変えられます）"), {
      target: { value: "0" },
    });
    save();
    expect(alertText()).toContain("1行目：数値は1以上の整数で入力してください");
  });

  it("開いている間に上限へ達したら、保存は LIMIT の理由をシートに出す", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    openAdd();
    fireEvent.change(field("条件の値"), { target: { value: "あ" } });
    for (let i = chips.length; i < LIMITS.chips; i++)
      await api.data.chips.save({
        interestId: "hololive",
        label: `c${i}`,
        query: `zz${i}`,
      });
    save();
    await waitFor(() =>
      expect(alertText()).toContain(
        `上限（${LIMITS.chips}件）です。不要なボタンを削除してください。`,
      ),
    );
    expect(await chipsNow(api)).toHaveLength(LIMITS.chips);
  });
});

describe("D1 リストの登録と Yahoo の注意", () => {
  it("リストの URL から ID を取り出して条件に足し、ラベルが空なら仮の名前を入れる", async () => {
    const { api } = await setup();
    await mountPage(api);
    openAdd();
    fireEvent.change(field("リストの URL または ID"), {
      target: { value: "https://x.com/i/lists/1234567890123" },
    });
    fireEvent.click(within(dialog()).getByRole("button", { name: "取り出す" }));
    expect(within(dialog()).getByLabelText("プレビュー").textContent).toBe(
      "list:1234567890123",
    );
    expect(field("ラベル（ボタンの表示名）")).toHaveValue("リスト 123456…");
    expect(within(dialog()).queryByRole("alert")).toBeNull();
  });

  it("取り出せないときは、入力の形を伝える。条件は増えない", async () => {
    const { api } = await setup();
    await mountPage(api);
    openAdd();
    fireEvent.change(field("リストの URL または ID"), {
      target: { value: "これはリストではない" },
    });
    fireEvent.click(within(dialog()).getByRole("button", { name: "取り出す" }));
    expect(alertText()).toContain(
      "リストの URL（https://x.com/i/lists/…）または数字の ID を入力してください",
    );
    expect(within(dialog()).getByLabelText("プレビュー").textContent).toBe(
      "（中身が空です）",
    );
  });

  it("list: を含むと、Yahoo!リアルタイム検索では使えない注意をプレビューの下に出す（モーダルにしない）", async () => {
    const { api } = await setup();
    await mountPage(api);
    openAdd();
    expect(within(dialog()).queryByRole("note")).toBeNull();
    fireEvent.change(field("条件の種類"), { target: { value: "list" } });
    fireEvent.change(field("条件の値"), { target: { value: "123456" } });
    expect(within(dialog()).getByRole("note").textContent).toContain(
      "list: はYahoo!リアルタイム検索では使えません",
    );
  });
});

describe("D1 条件ボタンの編集", () => {
  it("中身を条件の行に分けて見せ、保存で文字列に戻す。表示・ON・並びは変わらない。注記を出す", async () => {
    const { api, chips } = await setup();
    await api.data.chips.setVisible(chips[0].id, false);
    await mountPage(api);
    openEdit(chips[0].label);
    expect(within(dialog()).getByText("条件ボタンを編集")).toBeInTheDocument();
    expect(
      within(dialog()).getByText(
        /保存済みのお気に入り・いつものエゴサには反映されません/,
      ),
    ).toBeInTheDocument();
    expect(field("ラベル（ボタンの表示名）")).toHaveValue(chips[0].label);
    expect(within(dialog()).getByLabelText("プレビュー").textContent).toBe(
      api.query.condsToQuery(api.query.chipConds(chips[0])),
    );
    fireEvent.change(field("ラベル（ボタンの表示名）"), {
      target: { value: "改名" },
    });
    save();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const after = await chipsNow(api);
    expect(after.map((c) => c.id)).toEqual(chips.map((c) => c.id));
    expect(after[0]).toMatchObject({
      label: "改名",
      visible: false,
      on: chips[0].on,
      isPreset: true,
      order: chips[0].order,
    });
    expect(await screen.findByText("改名")).toBeInTheDocument();
  });

  it("値付きの条件（ファボ数など）は種類と演算子と値に分かれる", async () => {
    const { api } = await setup();
    const chip = await api.data.chips.save({
      interestId: "hololive",
      label: "ファボ50件",
      query: "min_faves:50",
    });
    await mountPage(api);
    openEdit(chip.label);
    expect(field("条件の種類")).toHaveValue("number");
    expect(field("演算子")).toHaveValue("min_faves");
    expect(field("初期値（ホームで変えられます）")).toHaveValue(50);
  });

  it("［キャンセル］・［×］・Esc で閉じ、フォーカスは押した［編集］へ戻る。保存はされない", async () => {
    const { api, chips } = await setup();
    await mountPage(api);
    for (const close of [
      () =>
        fireEvent.click(
          within(dialog()).getByRole("button", { name: "キャンセル" }),
        ),
      () =>
        fireEvent.click(
          within(dialog()).getByRole("button", { name: "閉じる" }),
        ),
      () => fireEvent.keyDown(dialog(), { key: "Escape" }),
    ]) {
      openEdit(chips[0].label);
      fireEvent.change(field("ラベル（ボタンの表示名）"), {
        target: { value: "捨てる" },
      });
      close();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: `${chips[0].label}を編集` }),
        ).toHaveFocus(),
      );
    }
    expect((await chipsNow(api))[0].label).toBe(chips[0].label);
  });
});
