import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type EgoSearchApi } from "@/api";
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

/** 対象 hololive の最初のグループとその最初の語（マスタ JSON の並び） */
const firstGroup = (a: EgoSearchApi) => a.master.wordSet("hololive")[0];

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
    expect(
      within(section).getByRole("heading", { name: g.name.ja }),
    ).toBeVisible();
    const w = g.words[0];
    const button = within(section).getByRole("button", {
      name: labeled(w.label),
    });
    expect(button).toHaveAttribute("title", w.query);
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("押すと、この検索にだけ ON/OFF し、下端のクエリ表示に出る。押しても閉じない", async () => {
    const a = api();
    const w = firstGroup(a).words[0];
    await open(a);
    const button = () =>
      within(dialog()).getByRole("button", { name: labeled(w.label) });
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
      within(dialog()).getByRole("button", { name: labeled(w.label) }),
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
    const [g0, g1] = a.master.wordSet("hololive");
    const target = g1.words[0];
    await open(a);
    const filter = within(dialog()).getByRole("textbox", {
      name: "検索ワード集を絞り込み",
    });
    // 表示名
    fireEvent.change(filter, { target: { value: target.label } });
    expect(
      within(dialog()).getByRole("button", { name: labeled(target.label) }),
    ).toBeVisible();
    expect(
      within(dialog()).queryByRole("region", { name: g0.name.ja }),
    ).toBeNull();
    // 検索文字列
    fireEvent.change(filter, { target: { value: target.query } });
    expect(
      within(dialog()).getByRole("button", { name: labeled(target.label) }),
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
    expect(within(dlg).getByRole("heading", { name: g.name.en })).toBeVisible();
    expect(within(dlg).queryByText(g.name.ja)).toBeNull();
  });
});
