import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import type { EgoSearchApi } from "@/api";
import { createBackend } from "@/backend";
import { mount } from "@/components/search/harness";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { HomePage } from "./home-page";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

/** allOff：プリセットの ON を全部 OFF にして、検索語だけの状態にする */
async function setup(allOff = true, kv = new MemoryAdapter()) {
  const api = createBackend({ kv, clock });
  const data = await api.data.init();
  if (allOff)
    for (const list of data.chips.values())
      for (const c of list) await api.data.chips.setOn(c.id, false);
  return api;
}
const mountHome = (api: EgoSearchApi) =>
  mount(api, <HomePage />, { scope: false });

let open: Mock<
  (url?: string | URL, target?: string, features?: string) => Window | null
>;
let lang = "ja-JP";
beforeEach(() => {
  lang = "ja-JP";
  vi.spyOn(window.navigator, "languages", "get").mockImplementation(() => [
    lang,
  ]);
  open = vi.fn(() => ({ opener: "x" }) as unknown as Window);
  vi.spyOn(window, "open").mockImplementation(open);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(() => Promise.resolve()) },
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const word = () => screen.getByLabelText("検索する語");
const preview = () =>
  screen.getAllByLabelText(
    "組み立てた検索クエリ（長いときは横にスクロール）",
  )[0];

describe("ホーム：構成", () => {
  it("作った理由と［詳しく →］、検索語の入力、条件の枠、お気に入りの行が並ぶ", async () => {
    await mountHome(await setup());
    expect(
      screen.getByText(/検索コマンドを覚えておく場所がない/),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "詳しく →" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(word()).toHaveAttribute(
      "placeholder",
      "名前や #タグ を入力（Enter で X で開く）",
    );
    expect(screen.getByRole("region", { name: "条件" })).toBeVisible();
    expect(screen.getByRole("region", { name: "お気に入り" })).toBeVisible();
  });

  it("開くボタン群は、入力欄の下と詳細条件の末尾の2か所にあり、どちらも同じ検索を開く", async () => {
    await mountHome(await setup());
    fireEvent.change(word(), { target: { value: "ぺこら" } });
    const buttons = screen.getAllByRole("button", { name: "X で開く" });
    expect(buttons).toHaveLength(2);
    expect(
      within(screen.getByRole("region", { name: "条件" })).getAllByRole(
        "button",
        { name: "X で開く" },
      ),
    ).toHaveLength(1);
    fireEvent.click(buttons[1]);
    // 完全一致が初期で ON なので、検索語は引用符で囲まれる（%22 = "）
    expect(String(open.mock.calls[0][0])).toContain(
      "q=%22%E3%81%BA%E3%81%93%E3%82%89%22",
    );
    expect(preview()).toHaveTextContent('"ぺこら"');
  });

  it("開いたときは、完全一致が ON で、条件ボタンはすべて OFF", async () => {
    await mountHome(await setup());
    expect(screen.getByRole("checkbox", { name: "完全一致" })).toBeChecked();
    const group = screen.getByRole("group", { name: "条件ボタン" });
    expect(group.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(
      0,
    );
  });

  it("英語の画面では、文言が英語になる", async () => {
    lang = "en-US";
    await mountHome(await setup());
    expect(screen.getByLabelText("Search words")).toHaveAttribute(
      "placeholder",
      "Enter a name or #tag (Enter opens it on X)",
    );
    expect(screen.getByRole("region", { name: "Conditions" })).toBeVisible();
  });
});

describe("ホーム：検索語と Enter", () => {
  it("入力するとクエリ表示がすぐ変わる", async () => {
    await mountHome(await setup());
    fireEvent.change(word(), { target: { value: "ぺこら" } });
    expect(preview()).toHaveTextContent("ぺこら");
  });

  it("Enter で X で開く。日本語入力の確定の Enter では開かない", async () => {
    await mountHome(await setup());
    fireEvent.change(word(), { target: { value: "ぺこら" } });
    fireEvent.keyDown(word(), {
      key: "Enter",
      isComposing: true,
      keyCode: 229,
    });
    expect(open).not.toHaveBeenCalled();
    fireEvent.keyDown(word(), { key: "Enter" });
    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toContain("https://x.com/search?q=");
  });

  it("検索語も条件も無いとき（blockers）は、Enter でも開かない", async () => {
    await mountHome(await setup());
    fireEvent.keyDown(word(), { key: "Enter" });
    expect(open).not.toHaveBeenCalled();
  });

  it("ページを開いただけでは、タブを開かない", async () => {
    await mountHome(await setup(false));
    await screen.findByRole("region", { name: "条件" });
    expect(open).not.toHaveBeenCalled();
  });

  it("ホームを離れてホーム以外へ移ると組み立てが空に戻る。ホームの中の再描画では残る（保存はしない）", async () => {
    const kv = new MemoryAdapter();
    const api = await setup(true, kv);
    const before = await kv.get("egosearch:v2:prefs");
    function Switch() {
      const [show, setShow] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setShow((v) => !v)}>
            切替
          </button>
          {show && <HomePage />}
        </>
      );
    }
    await mount(api, <Switch />, { scope: false });
    fireEvent.change(word(), { target: { value: "ぺこら" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "完全一致" }));
    fireEvent.click(screen.getAllByRole("button", { name: "昨日から" })[0]);
    fireEvent.click(screen.getByRole("button", { name: /画像つき/ }));
    // ホーム自体が外れただけ（AppShell が「/」を離れたと見ない）では、状態は残る
    fireEvent.click(screen.getByRole("button", { name: "切替" }));
    expect(screen.queryByLabelText("検索する語")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "切替" }));
    expect(word()).toHaveValue("ぺこら");
    expect(preview()).toHaveTextContent(
      "ぺこら filter:images since:2026-11-18",
    );
    // 検索の組み立て（条件ボタンの ON を含む）は保存しない
    expect(await kv.get("egosearch:v2:prefs")).toEqual(before);
    expect(
      (await api.data.init()).chips.get("hololive")!.some((c) => c.on),
    ).toBe(false);
  });
});

describe("ホーム：条件ボタンの ON と警告欄", () => {
  it("ON の条件ボタンが検索に入る。再読み込みすると OFF に戻る（前回の ON を覚えない）", async () => {
    const kv = new MemoryAdapter();
    const api = await setup(true, kv);
    await mountHome(api);
    fireEvent.click(screen.getByRole("button", { name: /画像つき/ }));
    await waitFor(() => expect(preview()).toHaveTextContent("filter:images"));
    cleanup();
    await mountHome(await setup(false, kv));
    expect(screen.getByRole("button", { name: /画像つき/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(preview()).not.toHaveTextContent("filter:images");
  });

  it("Yahoo!リアルタイム検索で使えない条件の警告は、「条件」の枠の一番下に出る（枠の外・クエリの横には出ない）", async () => {
    await mountHome(await setup());
    fireEvent.change(word(), { target: { value: "ぺこら" } });
    fireEvent.click(screen.getByRole("button", { name: /画像つき/ }));
    const frame = await screen.findByRole("region", { name: "条件" });
    const note = await within(frame).findByRole("note");
    expect(note).toHaveTextContent("filter: は");
    expect(frame.lastElementChild).toBe(note);
    expect(screen.getAllByRole("note")).toHaveLength(1);
    // モーダル・アラートにはしない
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("条件ボタンを押す前後で、押したボタンの外形（クラス）と並びの位置が変わらない", async () => {
    await mountHome(await setup());
    const group = screen.getByRole("group", { name: "条件ボタン" });
    const names = () =>
      within(group)
        .getAllByRole("button", { pressed: false })
        .concat(within(group).queryAllByRole("button", { pressed: true }))
        .map((b) => b.textContent);
    const order = names();
    const target = screen.getByRole("button", { name: /返信のみ/ });
    const sizeClass = (el: Element) =>
      el.className
        .split(" ")
        .filter((c) =>
          /^(px|py|gap|rounded|size-|text-(xs|sm|base|lg))/.test(c),
        )
        .join(" ");
    const before = sizeClass(target);
    fireEvent.click(target);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /返信のみ/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(sizeClass(screen.getByRole("button", { name: /返信のみ/ }))).toBe(
      before,
    );
    expect(names().sort()).toEqual(order.sort());
  });
});

describe("ホーム：お気に入り", () => {
  it("初回は閉じた1行で、押すと開いて空の案内が出る。開閉は保存され、再読み込みしても同じ", async () => {
    const kv = new MemoryAdapter();
    const api = await setup(true, kv);
    await mountHome(api);
    const head = screen.getByRole("button", { name: "☆ お気に入り（0）" });
    expect(head).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(head);
    expect(
      await screen.findByText(
        "条件を触って気に入ったら ☆ 保存 でここに入ります",
      ),
    ).toBeVisible();
    await waitFor(async () =>
      expect((await api.data.init()).prefs.favOpen).toBe(true),
    );
    cleanup();
    await mountHome(await setup(false, kv));
    expect(
      screen.getByRole("button", { name: "☆ お気に入り（0）" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("開くと全件を並べ（件数で絞らない）、［▶ 実行］で保存した検索先で開き、前回を更新する", async () => {
    const api = await setup();
    for (let i = 1; i <= 6; i++)
      await api.data.favorites.save({
        name: `お気に入り${i}`,
        query: i === 1 ? "ぺこら since:yesterday" : `語${i}`,
        engine: i === 2 ? "both" : "x",
      });
    await api.data.prefs.set({ favOpen: true });
    await mountHome(api);
    const section = screen.getByRole("region", { name: "お気に入り" });
    expect(await within(section).findAllByRole("listitem")).toHaveLength(6);
    // 開くときの文字列（相対期間は展開済み）を出す
    expect(within(section).getByText("ぺこら since:2026-11-18")).toBeVisible();

    fireEvent.click(
      within(section).getByRole("button", { name: "お気に入り1を実行" }),
    );
    expect(String(open.mock.calls[0][0])).toContain("https://x.com/search?q=");
    await waitFor(async () => {
      const { favorites, history } = await api.data.init();
      expect(favorites.find((f) => f.name === "お気に入り1")?.lastRunAt).toBe(
        "2026-11-19T03:00:00.000Z",
      );
      expect(history[0]).toMatchObject({
        query: "ぺこら since:2026-11-18",
        source: { kind: "favorite", label: "お気に入り1" },
      });
    });
    // 両方は2タブ
    open.mockClear();
    fireEvent.click(
      within(section).getByRole("button", { name: "お気に入り2を実行" }),
    );
    expect(open).toHaveBeenCalledTimes(2);
    expect(
      within(section).getByRole("link", { name: "お気に入りを編集 →" }),
    ).toHaveAttribute("href", "/favorites");
  });
});
