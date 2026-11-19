import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_DETAIL, type EgoSearchApi } from "@/api";
import { createBackend } from "@/backend";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { mount, Seed } from "./harness";
import { QueryPreview } from "./query-preview";
import { WarningNote } from "./warning-note";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};
const api = () => createBackend({ kv: new MemoryAdapter(), clock });
/** プリセットには ON のものがあるので、検索語だけの状態にするため全部 OFF にする */
async function allOff(a: EgoSearchApi) {
  const data = await a.data.init();
  for (const list of data.chips.values())
    for (const c of list) await a.data.chips.setOn(c.id, false);
  return a;
}

let writeText: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["ja-JP"]);
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

describe("QueryPreview（クエリ表示）", () => {
  it("空のときは案内を出し、［コピー］は押せない（場所は残る）", async () => {
    await mount(await allOff(api()), <QueryPreview />);
    expect(
      screen.getByText("（検索語か条件ボタンを選んでください）"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "クエリをコピー" }),
    ).toBeDisabled();
  });

  it("検索語を入れるとその文字列が出て、［コピー］で開く時点の文字列をコピーする", async () => {
    await mount(
      await allOff(api()),
      <>
        <Seed
          home={{ word: "ぺこら", period: { kind: "d1", from: "", to: "" } }}
        />
        <QueryPreview />
      </>,
    );
    const code = await screen.findByText(/ぺこら/);
    // 相対期間は開く時点の日付に展開される
    expect(code).toHaveTextContent("ぺこら since:2026-11-18");
    expect(code).toHaveAttribute("tabindex", "0");
    fireEvent.click(screen.getByRole("button", { name: "クエリをコピー" }));
    expect(writeText).toHaveBeenCalledWith("ぺこら since:2026-11-18");
    expect(await screen.findByText("クエリをコピーしました")).toBeVisible();
  });

  it("開始日が終了日より後（blockers）のときは、クエリがあってもコピーできない", async () => {
    await mount(
      await allOff(api()),
      <>
        <Seed
          home={{
            word: "ぺこら",
            period: { kind: "date", from: "2026-11-10", to: "2026-11-01" },
          }}
        />
        <QueryPreview />
      </>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "クエリをコピー" }),
      ).toBeDisabled(),
    );
  });

  it("実験的な演算子を含むと「実験的」バッジが出る（含まないと出ない）", async () => {
    const real = await allOff(api());
    const experimental: EgoSearchApi = {
      ...real,
      query: {
        ...real.query,
        build: (state, chips) => ({
          ...real.query.build(state, chips),
          experimental: true,
        }),
      },
    };
    await mount(
      experimental,
      <>
        <Seed home={{ word: "ぺこら" }} />
        <QueryPreview />
      </>,
    );
    expect(await screen.findByText("実験的")).toBeVisible();
    cleanup();
    await mount(
      real,
      <>
        <Seed home={{ word: "ぺこら" }} />
        <QueryPreview />
      </>,
    );
    await screen.findByText(/ぺこら/);
    expect(screen.queryByText("実験的")).toBeNull();
  });
});

describe("WarningNote（警告欄）", () => {
  it("警告が無いときは何も出さない", async () => {
    await mount(
      await allOff(api()),
      <>
        <Seed home={{ word: "ぺこら" }} />
        <WarningNote />
      </>,
    );
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("Yahoo!リアルタイム検索で使えない演算子は、role=note に辞書の文言で出る。フォーカスは動かない", async () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    await mount(
      await allOff(api()),
      <>
        <Seed
          home={{
            word: "ぺこら",
            detail: {
              ...EMPTY_DETAIL,
              raw: "filter:links",
            },
          }}
        />
        <WarningNote />
      </>,
    );
    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent(
      "filter: はYahoo!リアルタイム検索では使えません",
    );
    expect(document.activeElement).toBe(input);
    input.remove();
  });

  it("クエリが警告水準を超えると文字数つきの警告が出る", async () => {
    await mount(
      await allOff(api()),
      <>
        <Seed home={{ word: "あ".repeat(501) }} />
        <WarningNote />
      </>,
    );
    expect(await screen.findByRole("note")).toHaveTextContent(
      "クエリが500文字を超えています（501文字",
    );
  });
});
