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
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { ChipRow } from "./chip-row";
import { labeled, mount, recordOneHistory, Seed } from "./harness";
import { QueryPreview } from "./query-preview";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};
const api = () => createBackend({ kv: new MemoryAdapter(), clock });

/** ホロライブのプリセットの条件ボタンを返す（読み込んだ後の状態） */
async function chipsOf(a: EgoSearchApi) {
  const data = await a.data.init();
  return data.chips.get("hololive") ?? [];
}

beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["ja-JP"]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ChipRow（条件ボタンの並び）", () => {
  it("「表示」のボタンのうち先頭 foldChips 個だけを並べ、［もっと開く（+N）］で残りを出す", async () => {
    const a = api();
    const all = await chipsOf(a);
    const visible = all.filter((c) => c.visible);
    expect(visible.length).toBeGreaterThan(LIMITS.foldChips); // 前提：折りたたまれる数がある
    await recordOneHistory(a); // 履歴があれば検索ワード集は並びに出ない
    await mount(a, <ChipRow />);

    const group = screen.getByRole("group", { name: "条件ボタン" });
    const shown =
      within(group).getAllByRole("button", { pressed: false }).length +
      within(group).getAllByRole("button", { pressed: true }).length;
    // ［もっと開く］・［ボタンを編集］は aria-pressed を持たないので数えない
    expect(shown).toBe(LIMITS.foldChips);
    const hidden = visible.length - LIMITS.foldChips;
    expect(
      screen.getByRole("button", { name: `もっと開く（+${hidden}）` }),
    ).toBeVisible();
    // 隠れたものは描画しない（フォーカスも当たらない）
    expect(screen.queryByText(visible[visible.length - 1].label)).toBeNull();
    // 非表示にしたボタンは、開いても出ない
    fireEvent.click(screen.getByRole("button", { name: /もっと開く/ }));
    expect(screen.queryByText("リンクなし")).toBeNull();
    expect(screen.getByText(visible[visible.length - 1].label)).toBeVisible();
  });

  it("押すと aria-pressed が変わり、ON の状態が保存される（再読み込みしても残る）", async () => {
    const a = api();
    await chipsOf(a);
    await mount(a, <ChipRow />);
    const button = screen.getByRole("button", { name: /画像つき/ });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /画像つき/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    const saved = (await chipsOf(a)).find((c) => c.label === "画像つき");
    expect(saved?.on).toBe(true);
    // title は検索文字列
    expect(screen.getByRole("button", { name: /画像つき/ })).toHaveAttribute(
      "title",
      "filter:images",
    );
  });

  it("押す前後で、ボタンの中身の構造（アイコン枠の数）が変わらない", async () => {
    const a = api();
    await chipsOf(a);
    await mount(a, <ChipRow />);
    const button = () => screen.getByRole("button", { name: /画像つき/ });
    const before = button().querySelectorAll("span").length;
    fireEvent.click(button());
    await waitFor(() =>
      expect(button()).toHaveAttribute("aria-pressed", "true"),
    );
    expect(button().querySelectorAll("span").length).toBe(before);
  });

  it("「ボタンを編集 →」は条件ボタンのページへのリンク", async () => {
    await mount(api(), <ChipRow />);
    expect(
      screen.getByRole("link", { name: "ボタンを編集 →" }),
    ).toHaveAttribute("href", "/buttons");
  });
});

describe("サジェスト", () => {
  it("［もっと開く］を押すとサジェストの欄が出る。候補が無いときは案内を出す", async () => {
    await mount(api(), <ChipRow />);
    fireEvent.click(screen.getByRole("button", { name: /もっと開く/ }));
    const section = screen.getByRole("region", { name: "サジェスト検索条件" });
    expect(
      within(section).getByText("検索するとここに候補が出ます"),
    ).toBeVisible();
    expect(
      screen.getByText(
        "サジェスト（直近の検索などから・この検索にだけ足せます）",
      ),
    ).toBeVisible();
    // 開いた後は［もっと開く］も［閉じる］も出さない
    expect(screen.queryByRole("button", { name: /もっと開く/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "閉じる" })).toBeNull();
  });

  it("［もっと開く］の N は、隠れたボタン＋サジェストの数", async () => {
    const a = api();
    const visible = (await chipsOf(a)).filter((c) => c.visible);
    const hiddenChips = visible.length - LIMITS.foldChips;
    await recordOneHistory(a);
    await mount(
      a,
      <>
        <Seed home={{ word: "メンバーA" }} />
        <ChipRow />
      </>,
    );
    // 規則（when: メンバーA）の候補は3件だが、うち2件は条件ボタンにあるので除かれ、「愛称A」の1件
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: `もっと開く（+${hiddenChips + 1}）`,
        }),
      ).toBeVisible(),
    );
  });

  it("ボタンが折りたたみの数以下でも、サジェストがあれば［もっと開く］を出す", async () => {
    const a = api();
    // 表示のボタンを foldChips 個以下にする
    const visible = (await chipsOf(a)).filter((c) => c.visible);
    for (const c of visible.slice(LIMITS.foldChips - 1))
      await a.data.chips.setVisible(c.id, false);
    await recordOneHistory(a);
    await mount(
      a,
      <>
        <Seed home={{ word: "メンバーA" }} />
        <ChipRow />
      </>,
    );
    expect(
      await screen.findByRole("button", { name: "もっと開く（+1）" }),
    ).toBeVisible();
  });

  it("サジェストを押すと、この検索にだけ ON になり、クエリに入る。ボタンの ON は変わらない", async () => {
    const a = api();
    const onBefore = (await chipsOf(a)).filter((c) => c.on).map((c) => c.label);
    await mount(
      a,
      <>
        <Seed home={{ word: "メンバーA" }} />
        <ChipRow />
        <QueryPreview />
      </>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /もっと開く/ }));
    const suggestion = await screen.findByRole("button", {
      name: /愛称A/,
      pressed: false,
    });
    fireEvent.click(suggestion);
    expect(
      screen.getByRole("button", { name: /愛称A/, pressed: true }),
    ).toBeVisible();
    expect(
      screen.getByLabelText("組み立てた検索クエリ（長いときは横にスクロール）"),
    ).toHaveTextContent("愛称A");
    // 条件ボタン（保存するもの）には何も書かない
    const chips = await chipsOf(a);
    expect(chips.filter((c) => c.on).map((c) => c.label)).toEqual(onBefore);
  });
});

describe("履歴0件のときの検索ワード集（starter）", () => {
  const starterOf = async (a: EgoSearchApi) => {
    const data = await a.data.init();
    return a.query.starters({
      interest: "hololive",
      chips: data.chips.get("hololive") ?? [],
      history: data.history,
    });
  };

  it("条件ボタンの続きに starter が並び、先頭 foldChips 個を超える分は［もっと開く］に入る", async () => {
    const a = api();
    const visible = (await chipsOf(a)).filter((c) => c.visible);
    const starters = await starterOf(a);
    expect(starters.length).toBeGreaterThan(0);
    await mount(a, <ChipRow />);
    const group = screen.getByRole("group", { name: "条件ボタン" });
    const pressed = (pressedState: boolean) =>
      within(group).queryAllByRole("button", { pressed: pressedState });
    expect(pressed(false).length + pressed(true).length).toBe(LIMITS.foldChips);
    // N は、隠れた条件ボタン＋starter（サジェストは starter と重ならないものだけ）
    const hidden = visible.length + starters.length - LIMITS.foldChips;
    expect(
      screen.getByRole("button", {
        name: new RegExp(`もっと開く（\\+${hidden}`),
      }),
    ).toBeVisible();
  });

  it("開くと starter が並ぶ。ラベルは検索文字列で、押すと同じ位置で ON、もう一度で OFF に戻る", async () => {
    const a = api();
    const [first] = await starterOf(a);
    const onBefore = (await chipsOf(a)).filter((c) => c.on).map((c) => c.label);
    await mount(
      a,
      <>
        <ChipRow />
        <QueryPreview />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /もっと開く/ }));
    const word = () => screen.getByRole("button", { name: labeled(first) });
    expect(word()).toHaveAttribute("aria-pressed", "false");
    const before = word().getBoundingClientRect();
    fireEvent.click(word());
    expect(word()).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByLabelText("組み立てた検索クエリ（長いときは横にスクロール）"),
    ).toHaveTextContent(first);
    expect(word().getBoundingClientRect()).toEqual(before);
    // 条件ボタン（保存するもの）には何も書かない
    expect((await chipsOf(a)).filter((c) => c.on).map((c) => c.label)).toEqual(
      onBefore,
    );
    fireEvent.click(word());
    expect(word()).toHaveAttribute("aria-pressed", "false");
  });

  it("履歴が1件でもあれば、starter は並びにも［もっと開く］の中にも出ない", async () => {
    const a = api();
    const [first] = await starterOf(a);
    await recordOneHistory(a);
    await mount(a, <ChipRow />);
    fireEvent.click(screen.getByRole("button", { name: /もっと開く/ }));
    expect(screen.queryByRole("button", { name: labeled(first) })).toBeNull();
  });
});

describe("値付きの条件ボタン", () => {
  const faves = () => screen.getByRole("group", { name: "ファボ" });
  const favesInput = () =>
    within(faves()).getByLabelText("ファボのファボ数") as HTMLInputElement;

  it("数値の入力欄と接尾語を持ち、値を変えると保存して ON にする", async () => {
    const a = api();
    await chipsOf(a);
    await mount(a, <ChipRow />);
    expect(favesInput().value).toBe("50");
    expect(within(faves()).getByText("件以上")).toBeVisible();
    fireEvent.change(favesInput(), { target: { value: "120" } });
    await waitFor(async () => {
      const saved = (await chipsOf(a)).find((c) => c.label === "ファボ");
      expect(saved?.query).toBe("min_faves:120");
      expect(saved?.on).toBe(true);
    });
    expect(
      within(faves()).getByRole("button", { pressed: true }),
    ).toBeVisible();
  });

  it("入力の途中の不正な値（空・0・小数）は保存しない。フォーカスを外すと保存済みの値に戻る", async () => {
    const a = api();
    await chipsOf(a);
    await mount(a, <ChipRow />);
    for (const bad of ["", "0", "1.5", "-3"]) {
      fireEvent.change(favesInput(), { target: { value: bad } });
      expect(favesInput().value).toBe(bad); // 入力中はそのまま見える（カーソルが飛ばない）
    }
    const saved = (await chipsOf(a)).find((c) => c.label === "ファボ");
    expect(saved?.query).toBe("min_faves:50");
    expect(saved?.on).toBe(false);
    fireEvent.blur(favesInput());
    expect(favesInput().value).toBe("50");
  });

  it("切替ボタンを押すと ON/OFF が切り替わる（値は変わらない）", async () => {
    const a = api();
    await chipsOf(a);
    await mount(a, <ChipRow />);
    const toggle = within(faves()).getByRole("button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(within(faves()).getByRole("button")).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(favesInput().value).toBe("50");
  });

  it("［日付］を押しただけで日付が空のときは、期間が出力されないので日付ボタンは使える", async () => {
    const a = api();
    const date = (await chipsOf(a)).find((c) => c.label === "日付");
    await a.data.chips.setOn(date!.id, true);
    await mount(
      a,
      <>
        <Seed home={{ period: { kind: "date", from: "", to: "" } }} />
        <ChipRow />
        <QueryPreview />
      </>,
    );
    const group = await screen.findByRole("group", { name: "日付" });
    expect(within(group).getByLabelText("日付の開始日")).toBeEnabled();
    expect(
      screen.getByLabelText("組み立てた検索クエリ（長いときは横にスクロール）"),
    ).toHaveTextContent("since:2026-11-07");
  });

  it("期間を指定中は、日付の条件を持つボタンが無効（入力不可・理由を伝える）。数値のボタンは使える", async () => {
    const a = api();
    await chipsOf(a);
    await mount(
      a,
      <>
        <Seed home={{ period: { kind: "d1", from: "", to: "" } }} />
        <ChipRow />
      </>,
    );
    const date = await screen.findByRole("group", { name: "日付" });
    const input = within(date).getByLabelText("日付の開始日");
    expect(input).toBeDisabled();
    expect(date).toHaveAttribute(
      "title",
      "期間を指定中のため無効（since:2026-11-07）",
    );
    expect(
      within(date).getByText("期間を指定中のため無効です（期間を優先します）"),
    ).toBeInTheDocument();
    // 数値（ファボ）は使える
    expect(favesInput()).toBeEnabled();
  });
});
