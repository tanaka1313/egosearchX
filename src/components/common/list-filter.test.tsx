import { cleanup, fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBackend } from "@/backend";
import { mount } from "@/components/search/harness";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { ListFilter, matchesFilter } from "./list-filter";

describe("matchesFilter", () => {
  it("空（空白だけも）はすべてに一致する", () => {
    expect(matchesFilter("", ["ぺこら"])).toBe(true);
    expect(matchesFilter("   ", ["ぺこら"])).toBe(true);
  });

  it("名前にも検索文字列にも、どちらかに含まれていれば一致する", () => {
    const fields = ["歌枠チェック", "歌枠 filter:images"];
    expect(matchesFilter("チェック", fields)).toBe(true);
    expect(matchesFilter("filter:images", fields)).toBe(true);
    expect(matchesFilter("存在しない語", fields)).toBe(false);
  });

  it("前後の空白を除き、英字の大文字小文字を区別しない", () => {
    expect(matchesFilter("  FILTER:Images ", ["x filter:images"])).toBe(true);
  });
});

function Harness({ sortable }: { sortable?: boolean }) {
  const [v, setV] = useState("");
  return (
    <ListFilter
      value={v}
      onChange={setV}
      label="絞り込み"
      noMatch={v === "zzz"}
      sortable={sortable}
    />
  );
}

async function mountHarness(sortable?: boolean) {
  const api = createBackend({
    kv: new MemoryAdapter(),
    clock: {
      today: () => "2026-11-19",
      now: () => "2026-11-19T03:00:00.000Z",
    },
  });
  await api.data.init();
  await mount(api, <Harness sortable={sortable} />, { scope: false });
}

const type = (v: string) =>
  fireEvent.change(screen.getByRole("textbox", { name: "絞り込み" }), {
    target: { value: v },
  });

beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
    "ja-JP",
  ]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ListFilter", () => {
  it("入力できて、該当が無いときだけ「該当なし」を出す", async () => {
    await mountHarness();
    expect(screen.queryByText("該当なし")).toBeNull();
    type("zzz");
    expect(screen.getByText("該当なし")).toBeInTheDocument();
  });

  it("並べ替えのある一覧では、絞り込み中（入力があるとき）だけ注記が出る", async () => {
    await mountHarness(true);
    expect(screen.queryByText(/並べ替えを反映しません/)).toBeNull();
    type("a");
    expect(screen.getByText(/並べ替えを反映しません/)).toBeInTheDocument();
  });

  it("並べ替えの無い一覧では、絞り込み中も注記を出さない", async () => {
    await mountHarness();
    type("a");
    expect(screen.queryByText(/並べ替えを反映しません/)).toBeNull();
  });
});
