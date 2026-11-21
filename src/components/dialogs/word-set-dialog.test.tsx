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
import { labeled, mount } from "@/components/search/harness";
import { QueryPreview } from "@/components/search/query-preview";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { WordSetDialog } from "./word-set-dialog";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};
const api = () => createBackend({ kv: new MemoryAdapter(), clock });

const setLang = (lang: string) =>
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue([lang]);

// マスタの検索ワード集は全件で約600個のボタンになり、jsdom の role 検索が重い（並列実行で5秒を超える）
vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => setLang("ja-JP"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const opener = () => screen.getByRole("button", { name: "検索ワード集" });
const dialog = () => screen.getByRole("dialog", { name: "検索ワード集" });
const open = async (a: EgoSearchApi, extra?: React.ReactNode) => {
  await mount(
    a,
    <>
      {extra}
      <WordSetDialog />
    </>,
  );
  fireEvent.click(opener());
};

/** 対象 hololive の最初のグループ（共通のグループの次。マスタ JSON の並び） */
const firstGroup = (a: EgoSearchApi) =>
  a.master.wordSet("hololive").find((g) => g.name.ja !== "共通")!;

describe("WordSetDialog（D4）", () => {
  it("起点のボタンは aria-haspopup=dialog で、押すまで開かない", async () => {
    await mount(api(), <WordSetDialog />);
    expect(opener()).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("開くと［×］にフォーカスが当たり、グループの見出しの下に表示名のボタンが並ぶ（title は検索文字列）", async () => {
    const a = api();
    const g = firstGroup(a);
    await open(a);
    await waitFor(() =>
      expect(
        within(dialog()).getAllByRole("button", { name: "閉じる" })[0],
      ).toHaveFocus(),
    );
    const section = within(dialog()).getByRole("region", { name: g.name.ja });
    // 見出しには、グループ名に続けて期の名前（文字）も出る
    expect(
      within(section).getByRole("heading", {
        name: new RegExp(`^${g.name.ja}`),
      }),
    ).toBeVisible();
    expect(within(section).getByRole("heading")).toHaveTextContent(g.gens[0]);
    const w = g.words[0];
    const button = within(section).getByRole("button", {
      name: labeled(w.label.ja),
    });
    expect(button).toHaveAttribute("title", w.query);
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("押すと、この検索にだけ ON/OFF し、下端のクエリ表示に出る。押しても閉じない", async () => {
    const a = api();
    const w = firstGroup(a).words[0];
    await open(a);
    const button = () =>
      within(dialog()).getByRole("button", { name: labeled(w.label.ja) });
    fireEvent.click(button());
    expect(button()).toHaveAttribute("aria-pressed", "true");
    expect(
      within(dialog()).getByLabelText(
        "組み立てた検索クエリ（長いときは横にスクロール）",
      ),
    ).toHaveTextContent(w.query);
    expect(dialog()).toBeVisible();
    fireEvent.click(button());
    expect(button()).toHaveAttribute("aria-pressed", "false");
  });

  it("ON にした語は、閉じたあとの画面のクエリ表示にも残る", async () => {
    const a = api();
    const w = firstGroup(a).words[0];
    await open(a, <QueryPreview />);
    fireEvent.click(
      within(dialog()).getByRole("button", { name: labeled(w.label.ja) }),
    );
    fireEvent.click(
      within(dialog()).getAllByRole("button", { name: "閉じる" }).at(-1)!,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      screen.getByLabelText("組み立てた検索クエリ（長いときは横にスクロール）"),
    ).toHaveTextContent(w.query);
  });

  it("絞り込みは表示名か検索文字列に含むものだけを出し、該当が無ければ「該当なし」", async () => {
    const a = api();
    const [g0, g1] = a.master.wordSet("hololive"); // 共通・最初のメンバーのグループ
    const target = g1.words[0];
    await open(a);
    const filter = within(dialog()).getByRole("textbox", {
      name: "検索ワード集を絞り込み",
    });
    // 表示名
    fireEvent.change(filter, { target: { value: target.label.ja } });
    expect(
      within(dialog()).getByRole("button", { name: labeled(target.label.ja) }),
    ).toBeVisible();
    expect(
      within(dialog()).queryByRole("region", { name: g0.name.ja }),
    ).toBeNull();
    // 検索文字列
    fireEvent.change(filter, { target: { value: target.query } });
    expect(
      within(dialog()).getByRole("button", { name: labeled(target.label.ja) }),
    ).toBeVisible();
    fireEvent.change(filter, { target: { value: "存在しない語zzz" } });
    expect(within(dialog()).getByText("該当なし")).toBeVisible();
  });

  it("［閉じる］・［×］・Esc のどれでも閉じ、起点のボタンへフォーカスが戻る", async () => {
    await open(api());
    for (const how of ["close-text", "close-x", "esc"] as const) {
      expect(dialog()).toBeVisible();
      const closes = within(dialog()).getAllByRole("button", {
        name: "閉じる",
      });
      if (how === "close-text") fireEvent.click(closes.at(-1)!);
      else if (how === "close-x") fireEvent.click(closes[0]);
      else fireEvent.keyDown(document.activeElement!, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      await waitFor(() => expect(opener()).toHaveFocus());
      fireEvent.click(opener());
    }
  });

  it("英語の画面では、グループ名が英語になる", async () => {
    setLang("en-US");
    const a = api();
    const g = firstGroup(a);
    await mount(a, <WordSetDialog />);
    fireEvent.click(screen.getByRole("button", { name: /word/i }));
    const dlg = screen.getByRole("dialog");
    expect(
      within(dlg).getByRole("heading", { name: new RegExp(`^${g.name.en}`) }),
    ).toBeVisible();
    expect(within(dlg).queryByText(g.name.ja)).toBeNull();
  });
});

describe("WordSetDialog：マイ配信者のタブとグループの色", () => {
  const streamers = (a: EgoSearchApi) => a.master.streamers("hololive");
  const names = (a: EgoSearchApi) => streamers(a).map((g) => g.name.ja);
  const tabs = () =>
    within(dialog())
      .getAllByRole("tab")
      .map((t) => t.textContent);
  const cards = () =>
    within(screen.getByRole("tabpanel"))
      .getAllByRole("region")
      .map((r) => r.getAttribute("aria-label"));
  const withStars = async (a: EgoSearchApi, stars: string[]) => {
    await a.data.prefs.set({ stars: { hololive: stars } });
  };

  it("★が無いときは［その他］だけで、全グループを 共通 → 配信者（JSON の順）に並べる", async () => {
    const a = api();
    await open(a);
    expect(tabs()).toEqual(["その他"]);
    expect(
      within(dialog()).getByRole("tab", { name: "その他" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(cards()).toEqual(["共通", ...names(a)]);
  });

  it("★の配信者ごとにタブができ、先頭の★のタブから開く（そのタブはその配信者のグループだけ）", async () => {
    const a = api();
    await withStars(a, ["星街すいせい", "ときのそら"]);
    await open(a);
    expect(tabs()).toEqual(["星街すいせい", "ときのそら", "その他"]);
    expect(
      within(dialog()).getByRole("tab", { name: "星街すいせい" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(cards()).toEqual(["星街すいせい"]);
    fireEvent.click(within(dialog()).getByRole("tab", { name: "ときのそら" }));
    expect(cards()).toEqual(["ときのそら"]);
  });

  it("［その他］は 共通 → ★（選んだ順）→ ★と同じ期 → 残り の順に並ぶ", async () => {
    const a = api();
    // 星街すいせい（0期生）を★にすると、同じ0期生のグループが ★ の次に来る
    await withStars(a, ["星街すいせい"]);
    await open(a);
    fireEvent.click(within(dialog()).getByRole("tab", { name: "その他" }));
    const rest = names(a).filter((n) => n !== "星街すいせい");
    const sameGen = streamers(a)
      .filter((g) => g.gens.includes("0期生") && g.name.ja !== "星街すいせい")
      .map((g) => g.name.ja);
    const others = rest.filter((n) => !sameGen.includes(n));
    expect(sameGen.length).toBeGreaterThan(0);
    expect(cards()).toEqual(["共通", "星街すいせい", ...sameGen, ...others]);
  });

  it("［その他］で☆を押すと★になりタブが増えるが、並びは動かない。もう一度押すと外れる", async () => {
    const a = api();
    await open(a);
    const before = cards();
    const add = () =>
      within(dialog()).getByRole("button", {
        name: "ロボ子さんをマイ配信者に追加",
      });
    fireEvent.click(add());
    await waitFor(() => expect(tabs()).toEqual(["ロボ子さん", "その他"]));
    expect(cards()).toEqual(before);
    expect(
      within(dialog()).getByRole("button", {
        name: "ロボ子さんをマイ配信者から外す",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect((await a.data.init()).prefs?.stars).toEqual({
      hololive: ["ロボ子さん"],
    });
    fireEvent.click(
      within(dialog()).getByRole("button", {
        name: "ロボ子さんをマイ配信者から外す",
      }),
    );
    await waitFor(() => expect(tabs()).toEqual(["その他"]));
  });

  it("上限（LIMITS.myStreamers）に達すると、未選択の☆は押せない。外すと押せる", async () => {
    const a = api();
    const all = names(a);
    await withStars(a, all.slice(0, LIMITS.myStreamers));
    await open(a);
    fireEvent.click(within(dialog()).getByRole("tab", { name: "その他" }));
    const eleventh = within(dialog()).getByRole("button", {
      name: `${all[LIMITS.myStreamers]}をマイ配信者に追加`,
    });
    expect(eleventh).toBeDisabled();
    fireEvent.click(
      within(dialog()).getByRole("button", {
        name: `${all[0]}をマイ配信者から外す`,
      }),
    );
    await waitFor(() => expect(eleventh).toBeEnabled());
  });

  it("グループは期ごとの色の枠（共通は灰）で囲み、見出しに期の名前も文字で出す", async () => {
    const a = api();
    await open(a);
    const sora = within(dialog()).getByRole("region", { name: "ときのそら" });
    const common = within(dialog()).getByRole("region", { name: "共通" });
    const gen1 = within(dialog()).getByRole("region", { name: "夏色まつり" });
    expect(sora.className).toContain("border-l-sky-400");
    expect(gen1.className).toContain("border-l-emerald-400");
    expect(common.className).toContain("border-l-slate-400");
    expect(sora).toHaveTextContent("0期生");
    expect(gen1).toHaveTextContent("1期生");
  });

  it("背景と見分けられるよう、幕は濃く、本体は面と枠で区別する", async () => {
    await open(api());
    expect(dialog().className).toMatch(/\bbg-card\b/);
    expect(dialog().className).toContain("border-2");
    const overlay = document.querySelector("[data-state=open].fixed.inset-0");
    expect(overlay?.className).toContain("bg-black/75");
  });
});
