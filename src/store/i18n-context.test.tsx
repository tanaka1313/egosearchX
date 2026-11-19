import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { afterEach, describe, expect, it, vi } from "vitest";
import { createBackend } from "@/backend";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { ApiProvider } from "./api-context";
import { I18nProvider, useI18n } from "./i18n-context";
import { StoreProvider } from "./store-context";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};
const PREFS_KEY = "egosearch:v1:prefs";

const Probe = () => {
  const { lang, t, setLang } = useI18n();
  return (
    <div>
      <p>
        lang={lang}:{t.footer.unofficial}
      </p>
      <button onClick={() => setLang("en")}>to-en</button>
      <button onClick={() => setLang("ja")}>to-ja</button>
    </div>
  );
};

const mount = (kv: MemoryAdapter) =>
  render(
    <ApiProvider api={createBackend({ kv, clock })}>
      <StoreProvider>
        <I18nProvider>
          <Probe />
        </I18nProvider>
      </StoreProvider>
    </ApiProvider>,
  );

const browserLang = (tags: string[]) =>
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(tags);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.lang = "";
});

describe("I18nProvider", () => {
  it("保存が無ければブラウザの言語（日本語以外は英語）を使う", async () => {
    browserLang(["en-US"]);
    mount(new MemoryAdapter());
    await waitFor(() =>
      expect(screen.getByText(/^lang=en:/)).toBeInTheDocument(),
    );
    expect(document.documentElement.lang).toBe("en");
  });
  it("ブラウザが日本語なら日本語", async () => {
    browserLang(["ja-JP"]);
    mount(new MemoryAdapter());
    await waitFor(() =>
      expect(screen.getByText(/^lang=ja:ファンが作った/)).toBeInTheDocument(),
    );
    expect(document.documentElement.lang).toBe("ja");
  });
  it("保存した言語がブラウザの言語より優先される", async () => {
    browserLang(["ja-JP"]);
    const kv = new MemoryAdapter();
    await kv.set("egosearch:meta", JSON.stringify({ version: 1 }));
    await kv.set(
      PREFS_KEY,
      JSON.stringify({ interest: "hololive", lang: "en", favOpen: false }),
    );
    mount(kv);
    await waitFor(() =>
      expect(screen.getByText(/^lang=en:/)).toBeInTheDocument(),
    );
  });
  it("切り替えると表示が変わり、再読み込み後も残る", async () => {
    browserLang(["ja-JP"]);
    const kv = new MemoryAdapter();
    mount(kv);
    await waitFor(() => expect(screen.getByText(/^lang=ja:/)).toBeVisible());
    fireEvent.click(screen.getByText("to-en"));
    await waitFor(() => expect(screen.getByText(/^lang=en:/)).toBeVisible());
    expect(document.documentElement.lang).toBe("en");
    cleanup();
    mount(kv);
    await waitFor(() => expect(screen.getByText(/^lang=en:/)).toBeVisible());
  });
  it("保存データが壊れていても、ブラウザの言語で出し、切替は画面だけに効く（何も書かない）", async () => {
    browserLang(["en-US"]);
    const kv = new MemoryAdapter();
    await kv.set("egosearch:meta", JSON.stringify({ version: 1 }));
    await kv.set("egosearch:v1:favorites", "{壊れた");
    mount(kv);
    await waitFor(() => expect(screen.getByText(/^lang=en:/)).toBeVisible());
    fireEvent.click(screen.getByText("to-ja"));
    await waitFor(() => expect(screen.getByText(/^lang=ja:/)).toBeVisible());
    expect(await kv.get(PREFS_KEY)).toBeNull();
    expect(await kv.get("egosearch:v1:favorites")).toBe("{壊れた");
  });
});
