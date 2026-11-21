import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBackend } from "@/backend";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { DetailPanel } from "./detail-panel";
import { chipIdsByLabel, mount, Seed } from "./harness";
import { QueryPreview } from "./query-preview";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

async function setup() {
  const api = createBackend({ kv: new MemoryAdapter(), clock });
  await api.data.init();
  return api;
}
const query = () =>
  screen.getByLabelText("組み立てた検索クエリ（長いときは横にスクロール）");
const Panel = () => (
  <>
    <QueryPreview />
    <DetailPanel footer={<p>末尾の操作</p>} />
  </>
);

beforeEach(() => {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["ja-JP"]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DetailPanel（詳細条件）", () => {
  it("初期は閉じていて、「期間」の節だけが初期で開く。末尾に画面ごとの操作を置ける", async () => {
    await mount(await setup(), <Panel />);
    expect(screen.getByText("詳細条件").closest("details")).not.toHaveAttribute(
      "open",
    );
    expect(
      screen.getByText("期間", { selector: "summary" }).closest("details"),
    ).toHaveAttribute("open");
    expect(
      screen.getByText("語", { selector: "summary" }).closest("details"),
    ).not.toHaveAttribute("open");
    expect(screen.getByText("末尾の操作")).toBeInTheDocument();
  });

  it("X の「最新」タブの設定は置かない（X は常に「最新」で開く）", async () => {
    await mount(await setup(), <Panel />);
    expect(screen.queryByText(/最新/)).toBeNull();
    expect(screen.queryByText(/f=live/)).toBeNull();
  });

  it("語を追加するとクエリに入り、［×］で外せる。個別の数がバッジに出る", async () => {
    await mount(await setup(), <Panel />);
    expect(screen.queryByText(/個別 \d/)).toBeNull();
    const input = screen.getByLabelText("通常の語を追加");
    fireEvent.change(input, { target: { value: "ぺこら" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(query()).toHaveTextContent("ぺこら");
    expect(screen.getByText("個別 1")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "ぺこらを削除" }));
    expect(query()).not.toHaveTextContent("ぺこら");
    expect(screen.queryByText(/個別 \d/)).toBeNull();
  });

  it("除外する語は - を付けて、表記ゆれは OR で結んで出る", async () => {
    await mount(await setup(), <Panel />);
    for (const [label, value] of [
      ["除外する語を追加", "ネタバレ"],
      ["表記ゆれ展開（ORで結ぶ）を追加", "A"],
      ["表記ゆれ展開（ORで結ぶ）を追加", "B"],
    ] as const) {
      const input = screen.getByLabelText(label);
      fireEvent.change(input, { target: { value } });
      fireEvent.keyDown(input, { key: "Enter" });
    }
    expect(query()).toHaveTextContent("(A OR B) -ネタバレ");
  });

  it("アカウント・除外アカウント・min_* を入れるとクエリに入る（数値欄は数字だけ）", async () => {
    await mount(await setup(), <Panel />);
    fireEvent.change(screen.getByLabelText("from:（このアカウントの投稿）"), {
      target: { value: "sample_id" },
    });
    fireEvent.change(
      screen.getByLabelText("-to:（このアカウント宛てを除く）"),
      {
        target: { value: "other" },
      },
    );
    fireEvent.change(screen.getByLabelText("min_faves（いいね数以上）"), {
      target: { value: "1a0b0" },
    });
    expect(query()).toHaveTextContent("from:sample_id");
    expect(query()).toHaveTextContent("-to:other");
    expect(query()).toHaveTextContent("min_faves:100");
    expect(
      (screen.getByLabelText("min_faves（いいね数以上）") as HTMLInputElement)
        .value,
    ).toBe("100");
  });

  it("フィルタの3択は1つだけ押された状態になり、含む／除くがクエリに入る", async () => {
    await mount(await setup(), <Panel />);
    const images = screen.getByRole("group", { name: "画像" });
    fireEvent.click(within(images).getByRole("button", { name: /含む/ }));
    expect(query()).toHaveTextContent("filter:images");
    fireEvent.click(within(images).getByRole("button", { name: /除く/ }));
    expect(query()).toHaveTextContent("-filter:images");
    expect(
      within(images).getByRole("button", { name: /含む/ }),
    ).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(within(images).getByRole("button", { name: /指定なし/ }));
    expect(query()).not.toHaveTextContent("filter:images");
  });

  it("言語を選ぶと lang: がクエリに入る", async () => {
    await mount(await setup(), <Panel />);
    fireEvent.change(screen.getByLabelText("言語"), {
      target: { value: "id" },
    });
    expect(query()).toHaveTextContent("lang:id");
  });

  it("ON の条件ボタンの項目別の無効化：外した項目はその検索でだけ使われない", async () => {
    const api = await setup();
    // 複数の条件を持つボタン（プリセットには無いので、ここで作る）
    await api.data.chips.save({
      interestId: "hololive",
      label: "ネタバレ除外",
      query: "-ネタバレ語A -ネタバレ語B",
    });
    await mount(
      api,
      <>
        <Seed
          home={{ onChipIds: await chipIdsByLabel(api, ["ネタバレ除外"]) }}
        />
        <Panel />
      </>,
    );
    expect(
      await screen.findByText(
        "共通（ONの条件ボタン）の項目別の無効化（1個のボタン）",
      ),
    ).toBeInTheDocument();
    const a = screen.getByLabelText("-ネタバレ語A");
    expect(query()).toHaveTextContent("-ネタバレ語A -ネタバレ語B");
    fireEvent.click(a);
    expect(query()).not.toHaveTextContent("ネタバレ語A");
    expect(query()).toHaveTextContent("-ネタバレ語B");
    expect(screen.getByText("この検索では無効")).toBeInTheDocument();
    fireEvent.click(a);
    expect(query()).toHaveTextContent("-ネタバレ語A");
  });

  it("ON の条件ボタンが無いときは、その案内を出す", async () => {
    await mount(await setup(), <Panel />);
    expect(screen.getByText("ONの条件ボタンがありません")).toBeInTheDocument();
  });

  it("テキストで追加した条件は、そのまま検索文字列に入る", async () => {
    await mount(await setup(), <Panel />);
    fireEvent.change(screen.getByLabelText("テキストで追加する条件"), {
      target: { value: "foo:bar" },
    });
    expect(query()).toHaveTextContent("foo:bar");
  });

  it("［この検索の個別設定をリセット］は詳細条件と期間を空に戻し、トーストの［元に戻す］で復元できる", async () => {
    await mount(await setup(), <Panel />);
    const input = screen.getByLabelText("通常の語を追加");
    fireEvent.change(input, { target: { value: "ぺこら" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "昨日から" }));
    expect(query()).toHaveTextContent("ぺこら since:2026-11-18");

    fireEvent.click(
      screen.getByRole("button", { name: "この検索の個別設定をリセット" }),
    );
    expect(query()).not.toHaveTextContent("ぺこら");
    expect(query()).not.toHaveTextContent("since:");
    expect(await screen.findByText("個別設定をリセットしました")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    await waitFor(() =>
      expect(query()).toHaveTextContent("ぺこら since:2026-11-18"),
    );
  });
});
