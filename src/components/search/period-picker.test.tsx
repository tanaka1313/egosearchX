import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBackend } from "@/backend";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { mount } from "./harness";
import { PeriodPicker } from "./period-picker";
import { QueryPreview } from "./query-preview";
import { useSearchScope } from "./search-scope";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

/** 期間だけを見たいので、プリセットの ON（RT除外など）は全部 OFF にする */
async function setup() {
  const api = createBackend({ kv: new MemoryAdapter(), clock });
  const data = await api.data.init();
  for (const list of data.chips.values())
    for (const c of list) await api.data.chips.setOn(c.id, false);
  return api;
}

function Scoped({ showOutput = false }: { showOutput?: boolean }) {
  const { period, setPeriod } = useSearchScope();
  return (
    <>
      <PeriodPicker
        value={period}
        onChange={setPeriod}
        showOutput={showOutput}
      />
      <QueryPreview />
    </>
  );
}
const query = () =>
  screen.getByLabelText("組み立てた検索クエリ（長いときは横にスクロール）");

beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["ja-JP"]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PeriodPicker（期間）", () => {
  it("4つの選択肢が並び、押すと期間がクエリに入る（昨日から → 開くときの日付に展開）", async () => {
    await mount(await setup(), <Scoped />);
    const group = screen.getByRole("group", { name: "期間" });
    for (const name of ["昨日から", "3日前から", "1週間前から", "日付"])
      expect(group).toHaveTextContent(name);
    fireEvent.click(screen.getByRole("button", { name: "昨日から" }));
    expect(query()).toHaveTextContent("since:2026-11-18");
    fireEvent.click(screen.getByRole("button", { name: "3日前から" }));
    expect(query()).toHaveTextContent("since:2026-11-16");
    expect(screen.getByRole("button", { name: "昨日から" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("押した状態をもう一度押すと解除になる", async () => {
    await mount(await setup(), <Scoped />);
    const d7 = () => screen.getByRole("button", { name: "1週間前から" });
    fireEvent.click(d7());
    expect(d7()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(d7());
    expect(d7()).toHaveAttribute("aria-pressed", "false");
    expect(query()).not.toHaveTextContent("since:");
  });

  it("［日付］で入力行が開き、開始日だけなら以降、終了日だけなら以前、両方なら範囲（終了日はそのまま出す）", async () => {
    await mount(await setup(), <Scoped />);
    expect(screen.queryByLabelText("開始日（この日以降）")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "日付" }));
    const from = screen.getByLabelText("開始日（この日以降）");
    const to = screen.getByLabelText("終了日（この日を含む）");

    fireEvent.change(from, { target: { value: "2026-11-01" } });
    expect(screen.getByText("2026-11-01 以降")).toBeVisible();
    expect(query()).toHaveTextContent("since:2026-11-01");

    fireEvent.change(from, { target: { value: "" } });
    fireEvent.change(to, { target: { value: "2026-11-11" } });
    expect(screen.getByText("2026-11-11 以前")).toBeVisible();
    expect(query()).toHaveTextContent("until:2026-11-11");

    fireEvent.change(from, { target: { value: "2026-11-01" } });
    expect(
      screen.getByText("2026-11-01 〜 2026-11-11（終了日を含む）"),
    ).toBeVisible();
    // until: は指定日を含むので、翌日に変換しない
    expect(query()).toHaveTextContent("since:2026-11-01 until:2026-11-11");
  });

  it("開始日が終了日より後なら警告を出す。［×］で日付の指定を解除する", async () => {
    await mount(await setup(), <Scoped />);
    fireEvent.click(screen.getByRole("button", { name: "日付" }));
    fireEvent.change(screen.getByLabelText("開始日（この日以降）"), {
      target: { value: "2026-11-10" },
    });
    fireEvent.change(screen.getByLabelText("終了日（この日を含む）"), {
      target: { value: "2026-11-01" },
    });
    expect(screen.getByText("⚠ 開始日が終了日より後です")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "日付の指定を解除" }));
    expect(screen.queryByLabelText("開始日（この日以降）")).toBeNull();
    expect(query()).not.toHaveTextContent("until:");
  });

  it("注記の行は、期間が無いときも空の要素として残る（押しても下が動かない）", async () => {
    const { container } = await mount(await setup(), <Scoped />);
    const note = container.querySelector("p.min-h-4");
    expect(note).not.toBeNull();
    expect(note).toHaveTextContent("");
    fireEvent.click(screen.getByRole("button", { name: "昨日から" }));
    expect(container.querySelector("p.min-h-4")).toBe(note);
  });

  it("showOutput のとき、保存する形（記号）と開くときの形を注記に出す", async () => {
    await mount(await setup(), <Scoped showOutput />);
    fireEvent.click(screen.getByRole("button", { name: "昨日から" }));
    expect(
      screen.getByText("出力：since:yesterday（開くときは since:2026-11-18）"),
    ).toBeVisible();
  });
});
