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
import { MyStreamersDialog } from "./my-streamers-dialog";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};
const api = () => createBackend({ kv: new MemoryAdapter(), clock });

const setLang = (lang: string) =>
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue([lang]);

beforeEach(() => setLang("ja-JP"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const dialog = () => screen.queryByRole("dialog", { name: "マイ配信者を選ぶ" });
const show = (a: EgoSearchApi) =>
  mount(a, <MyStreamersDialog />, { scope: false });
const labelsOf = async (a: EgoSearchApi) =>
  (await a.data.init()).chips.get("hololive")!.map((c) => c.label);

describe("MyStreamersDialog（D5 初回の案内）", () => {
  it("初回は自動で開き、配信者が期ごとの見出しで並ぶ（画像は出さない）", async () => {
    await show(api());
    const dlg = await screen.findByRole("dialog", { name: "マイ配信者を選ぶ" });
    const gen0 = within(dlg).getByRole("region", { name: "0期生" });
    expect(
      within(gen0)
        .getAllByRole("checkbox")
        .map((c) => c.closest("label")?.textContent),
    ).toEqual([
      "ときのそら",
      "星街すいせい",
      "さくらみこ",
      "AZKi",
      "ロボ子さん",
    ]);
    expect(dlg.querySelector("img")).toBeNull();
    expect(within(dlg).getByText("0/10人を選択中")).toBeVisible();
  });

  it("選んで［決定］すると、その配信者の語が表示名の条件ボタンになって先頭に並び、プリセットが続く", async () => {
    const a = api();
    const before = await labelsOf(a);
    await show(a);
    const dlg = await screen.findByRole("dialog", { name: "マイ配信者を選ぶ" });
    fireEvent.click(within(dlg).getByRole("checkbox", { name: "ときのそら" }));
    expect(within(dlg).getByText("1/10人を選択中")).toBeVisible();
    fireEvent.click(within(dlg).getByRole("button", { name: "決定（1人）" }));
    await waitFor(() => expect(dialog()).toBeNull());
    const after = await labelsOf(a);
    // 検索文字列（("ときのそら" OR …)）ではなく、ラベルが入る
    expect(after.slice(0, 3)).toEqual([
      "エゴサワード(ときのそら)",
      "エゴサ英語(ときのそら)",
      "🐻💿(推しマ)",
    ]);
    expect(after.slice(-before.length)).toEqual(before);
    const { prefs } = await a.data.init();
    expect(prefs?.stars).toEqual({ hololive: ["ときのそら"] });
    expect(prefs?.setup).toBe("done");
  });

  it("［スキップ］・［×］なしの Esc は、何も足さずに閉じ、二度と出ない", async () => {
    const a = api();
    const before = await labelsOf(a);
    await show(a);
    const dlg = await screen.findByRole("dialog", { name: "マイ配信者を選ぶ" });
    fireEvent.keyDown(dlg, { key: "Escape" });
    await waitFor(() => expect(dialog()).toBeNull());
    expect(await labelsOf(a)).toEqual(before);
    expect((await a.data.init()).prefs?.setup).toBe("done");
    cleanup();
    await show(a);
    expect(dialog()).toBeNull();
  });

  it("［スキップ］で、マイ配信者は空のまま済みになる", async () => {
    const a = api();
    await show(a);
    fireEvent.click(await screen.findByRole("button", { name: "スキップ" }));
    await waitFor(() => expect(dialog()).toBeNull());
    expect((await a.data.init()).prefs?.stars).toEqual({ hololive: [] });
  });

  it("上限（LIMITS.myStreamers）まで選ぶと、未選択のチェックは押せなくなる", async () => {
    await show(api());
    const dlg = await screen.findByRole("dialog", { name: "マイ配信者を選ぶ" });
    const boxes = within(dlg).getAllByRole("checkbox");
    boxes.slice(0, LIMITS.myStreamers).forEach((b) => fireEvent.click(b));
    expect(boxes[LIMITS.myStreamers]).toBeDisabled();
    expect(boxes[0]).toBeEnabled();
    fireEvent.click(boxes[0]);
    expect(boxes[LIMITS.myStreamers]).toBeEnabled();
  });

  it("キーボードだけで選べる（チェックボックスにフォーカスが当たる）", async () => {
    await show(api());
    const dlg = await screen.findByRole("dialog", { name: "マイ配信者を選ぶ" });
    const box = within(dlg).getByRole("checkbox", { name: "ときのそら" });
    box.focus();
    expect(box).toHaveFocus();
    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(box).toBeChecked();
  });

  it("英語の画面では、期の名前・配信者名・ボタンが英語になる", async () => {
    setLang("en-US");
    await show(api());
    const dlg = await screen.findByRole("dialog", {
      name: "Choose My streamers",
    });
    expect(within(dlg).getByRole("region", { name: "Gen 0" })).toBeVisible();
    expect(
      within(dlg).getByRole("checkbox", { name: "Tokino Sora" }),
    ).toBeVisible();
    expect(within(dlg).getByRole("button", { name: "Skip" })).toBeVisible();
  });
});
