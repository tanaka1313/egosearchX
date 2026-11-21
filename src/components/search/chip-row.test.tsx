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
import { labeled, mount, openMore, recordOneHistory, Seed } from "./harness";
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

/** ホーム（ホロライブ）の検索語から出るサジェストの候補（ChipRow が使うのと同じ入力） */
async function suggestionsFor(a: EgoSearchApi, text: string) {
  const data = await a.data.init();
  return a.query.suggest({
    interest: "hololive",
    text,
    chips: data.chips.get("hololive") ?? [],
    history: data.history,
  });
}

/** 検索ワード集のグループ（名前の日本語）から、そのグループの語を返す */
function wordsOfGroup(a: EgoSearchApi, name: string) {
  const group = a.master.wordSet("hololive").find((g) => g.name.ja === name);
  if (!group) throw new Error(`グループが無い: ${name}`);
  return group.words;
}

/** 「そらちゃん」で出る、ときのそら（検索ワード集）のエゴサの検索文字列 */
const SORA_EGOSEARCH = `("ときのそら" OR "そらちゃん" OR "そらさん" OR "そら先輩")`;

const queryText = () =>
  screen.getByLabelText("組み立てた検索クエリ（長いときは横にスクロール）");

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
    const shown = group.querySelectorAll("button[aria-pressed]").length;
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

  it("押すと aria-pressed が変わる。ON の状態は保存しない（ボタンの ON は画面の状態）", async () => {
    const a = api();
    await chipsOf(a);
    await mount(a, <ChipRow />);
    openMore(); // 画像つきは先頭 foldChips 個より後ろ
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
    expect(saved?.on).toBe(false);
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
    openMore();
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

  it("既定リストのボタン（ホロメンから）は値を変えないので、入力欄を持たない", async () => {
    const a = api();
    const listId = a.master.interests().get("hololive")!.list!.listId;
    const chip = (await chipsOf(a)).find((c) => c.query === `list:${listId}`)!;
    await mount(a, <ChipRow />);
    const button = screen.getByRole("button", { name: labeled(chip.label) });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAttribute("title", chip.query);
    // 値付きのボタンは group（入力欄を含む）で描くので、既定リストはそれにならない。
    // 並びの直下の button だけで、入力欄を内側にも隣にも持たない
    expect(screen.queryByRole("group", { name: chip.label })).toBeNull();
    expect(button.parentElement).toBe(
      screen.getByRole("group", { name: "条件ボタン" }),
    );
    expect(button.querySelector("input")).toBeNull();
    expect(button.nextElementSibling?.tagName).not.toBe("INPUT");
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
    const suggestions = await suggestionsFor(a, "そらちゃん");
    expect(suggestions.length).toBeGreaterThan(0); // 前提：ときのそらの規則が効く
    await mount(
      a,
      <>
        <Seed home={{ word: "そらちゃん" }} />
        <ChipRow />
      </>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: `もっと開く（+${hiddenChips + suggestions.length}）`,
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
    const suggestions = await suggestionsFor(a, "そらちゃん");
    await mount(
      a,
      <>
        <Seed home={{ word: "そらちゃん" }} />
        <ChipRow />
      </>,
    );
    expect(
      await screen.findByRole("button", {
        name: `もっと開く（+${suggestions.length}）`,
      }),
    ).toBeVisible();
  });

  it("サジェストを押すと、この検索にだけ ON になり、クエリに入る。ボタンの ON は変わらない", async () => {
    const a = api();
    const onBefore = (await chipsOf(a)).filter((c) => c.on).map((c) => c.label);
    // 履歴0件だと、このワードは starter として並びに出てしまうので、サジェストに出すため履歴を1件にする
    await recordOneHistory(a);
    await mount(
      a,
      <>
        <Seed home={{ word: "そらちゃん" }} />
        <ChipRow />
        <QueryPreview />
      </>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /もっと開く/ }));
    const suggestion = await screen.findByRole("button", {
      name: labeled("エゴサワード(ときのそら)"),
      pressed: false,
    });
    fireEvent.click(suggestion);
    expect(
      screen.getByRole("button", {
        name: labeled("エゴサワード(ときのそら)"),
        pressed: true,
      }),
    ).toBeVisible();
    expect(queryText()).toHaveTextContent(SORA_EGOSEARCH);
    // 条件ボタン（保存するもの）には何も書かない
    const chips = await chipsOf(a);
    expect(chips.filter((c) => c.on).map((c) => c.label)).toEqual(onBefore);
  });

  it("検索ワード集の語のサジェストは、表示名のボタンで出る（生の検索文字列ではない）。押すと、そのワードの検索文字列が入る", async () => {
    const a = api();
    await recordOneHistory(a);
    await mount(
      a,
      <>
        <Seed home={{ word: "そらちゃん" }} />
        <ChipRow />
        <QueryPreview />
      </>,
    );
    openMore();
    const word = await screen.findByRole("button", {
      name: labeled("エゴサワード(ときのそら)"),
    });
    expect(word).toHaveAttribute("aria-pressed", "false");
    expect(word).toHaveAttribute("title", SORA_EGOSEARCH);
    // 生の検索文字列のボタン（SuggestChip）としては出ない
    expect(screen.queryByRole("button", { name: SORA_EGOSEARCH })).toBeNull();
    fireEvent.click(word);
    expect(word).toHaveAttribute("aria-pressed", "true");
    expect(queryText()).toHaveTextContent(SORA_EGOSEARCH);
  });

  it("「Suisei」では、規則のない水宮枢のグループの語は出ず、星街すいせいのグループの語が出る", async () => {
    const a = api();
    await recordOneHistory(a); // 履歴0件だと検索ワード集（starter）が並びに出るので、サジェストだけを見る
    await mount(
      a,
      <>
        <Seed home={{ word: "Suisei" }} />
        <ChipRow />
      </>,
    );
    openMore();
    // 星街すいせいの語（規則の when に Suisei がある）は出る
    const suisei = wordsOfGroup(a, "星街すいせい")[0];
    expect(
      await screen.findByRole("button", { name: labeled(suisei.label.ja) }),
    ).toHaveAttribute("title", suisei.query);
    // 水宮枢の語は1つも出ない
    for (const w of wordsOfGroup(a, "水宮枢"))
      expect(screen.queryByTitle(w.query)).toBeNull();
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
    expect(queryText()).toHaveTextContent(first);
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
  /** ファボは先頭 foldChips 個より後ろにあるので、開いてから探す */
  const faves = () => screen.getByRole("group", { name: "ファボ" });
  const favesInput = () =>
    within(faves()).getByLabelText("ファボのファボ数") as HTMLInputElement;

  it("数値の入力欄と接尾語を持ち、値を変えると保存して ON にする", async () => {
    const a = api();
    await chipsOf(a);
    await mount(a, <ChipRow />);
    openMore();
    expect(favesInput().value).toBe("50");
    expect(within(faves()).getByText("件以上")).toBeVisible();
    fireEvent.change(favesInput(), { target: { value: "120" } });
    await waitFor(async () => {
      const saved = (await chipsOf(a)).find((c) => c.label === "ファボ");
      expect(saved?.query).toBe("min_faves:120");
    });
    // 値だけをボタンに保存する。ON は画面の状態（保存しない）
    expect((await chipsOf(a)).find((c) => c.label === "ファボ")?.on).toBe(
      false,
    );
    expect(
      within(faves()).getByRole("button", { pressed: true }),
    ).toBeVisible();
  });

  it("入力の途中の不正な値（空・0・小数）は保存しない。フォーカスを外すと保存済みの値に戻る", async () => {
    const a = api();
    await chipsOf(a);
    await mount(a, <ChipRow />);
    openMore();
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
    openMore();
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

  /** 「日付」は since／until の2つあるので、検索文字列（title。期間の無効中は理由の文言）で選ぶ */
  const dateGroup = (part: string) => {
    const group = screen
      .getAllByRole("group", { name: "日付" })
      .find((g) => g.getAttribute("title")?.includes(part));
    if (!group) throw new Error(`日付のボタンが無い: ${part}`);
    return group;
  };

  it("［日付］を押しただけで日付が空のときは、期間が出力されないので日付ボタンは使える", async () => {
    const a = api();
    const since = (await chipsOf(a)).find(
      (c) => c.query === "since:2026-11-07",
    );
    await mount(
      a,
      <>
        <Seed
          home={{
            onChipIds: [since!.id],
            period: { kind: "date", from: "", to: "" },
          }}
        />
        <ChipRow />
        <QueryPreview />
      </>,
    );
    openMore(); // 日付のボタンは先頭 foldChips 個より後ろ
    // 期間が空なので無効にならない（同名の since／until は検索文字列で選ぶ）
    const date = await waitFor(() => dateGroup("since:2026-11-07"));
    expect(date).not.toHaveAttribute("title", expect.stringContaining("無効"));
    expect(within(date).getByLabelText("日付の開始日")).toBeEnabled();
    expect(queryText()).toHaveTextContent("since:2026-11-07");
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
    openMore();
    const date = await waitFor(() => dateGroup("since:2026-11-07"));
    expect(date).toHaveAttribute(
      "title",
      "期間を指定中のため無効（since:2026-11-07）",
    );
    const input = within(date).getByLabelText("日付の開始日");
    expect(input).toBeDisabled();
    expect(
      within(date).getByText("期間を指定中のため無効です（期間を優先します）"),
    ).toBeInTheDocument();
    // 数値（ファボ）は使える
    expect(favesInput()).toBeEnabled();
  });
});

describe("アカウントの条件（from:）の入力欄", () => {
  /** from: は先頭 foldChips 個の中（開かなくてよい）。ラベルは「from:」 */
  const fromChip = async (a: EgoSearchApi) =>
    (await chipsOf(a)).find((c) => c.label === "from:")!;
  const fromGroup = () => screen.getByRole("group", { name: "from:" });
  const fromInput = () =>
    within(fromGroup()).getByLabelText(
      "from:の投稿者のユーザー名",
    ) as HTMLInputElement;

  it("正しいユーザー名を入れると保存して ON になり、組み立てたクエリに入る", async () => {
    const a = api();
    const chip = await fromChip(a);
    await mount(
      a,
      <>
        <ChipRow />
        <QueryPreview />
      </>,
    );
    fireEvent.change(fromInput(), { target: { value: "sample_user" } });
    await waitFor(async () => {
      const saved = (await chipsOf(a)).find((c) => c.id === chip.id);
      expect(saved?.query).toBe("from:sample_user");
    });
    expect(
      within(fromGroup()).getByRole("button", { pressed: true }),
    ).toBeVisible();
    expect(queryText()).toHaveTextContent("from:sample_user");
  });

  it("不正なユーザー名（- を含む・16字・@ 付き）は保存せず、クエリにも入らない", async () => {
    const a = api();
    const chip = await fromChip(a);
    await mount(
      a,
      <>
        <ChipRow />
        <QueryPreview />
      </>,
    );
    for (const bad of ["a-b", "abcdefghijklmnop", "@x"]) {
      fireEvent.change(fromInput(), { target: { value: bad } });
      expect(fromInput().value).toBe(bad); // 入力中の値はそのまま見える
    }
    const saved = (await chipsOf(a)).find((c) => c.id === chip.id);
    expect(saved?.query).toBe("from:");
    expect(saved?.on).toBe(false);
    expect(queryText()).not.toHaveTextContent("from:");
  });

  it("空の from: は、ON にしても組み立てたクエリに何も足さない", async () => {
    const a = api();
    const chip = await fromChip(a);
    await mount(
      a,
      <>
        <Seed home={{ onChipIds: [chip.id] }} />
        <ChipRow />
        <QueryPreview />
      </>,
    );
    expect(
      within(fromGroup()).getByRole("button", { pressed: true }),
    ).toBeVisible();
    expect(fromInput().value).toBe("");
    expect(queryText()).not.toHaveTextContent("from:");
  });
});
