// 部品のテスト用の組み立て（本物のバックエンドは呼び出し側が作って渡す）。アプリ本体からは import しない。
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { expect } from "vitest";
import type { EgoSearchApi, OpenTarget } from "@/api";
import { BlockedContext } from "@/components/common/blocked-context";
import { ToastProvider } from "@/components/common/toast";
import { ApiProvider } from "@/store/api-context";
import { I18nProvider } from "@/store/i18n-context";
import type { HomeState } from "@/store/app-store";
import { StoreProvider, useAppStore } from "@/store/store-context";
import { HomeScopeProvider } from "./search-scope";

function Ready({ children }: { children: ReactNode }) {
  const ready = useAppStore((s) => s.status === "ready");
  return <div data-ready={ready}>{children}</div>;
}

/** 読み込みが済むまで待ってから返す。`scope: false` は検索の組み立ての文脈（ホーム）を付けない */
export async function mount(
  api: EgoSearchApi,
  ui: ReactNode,
  opts: {
    scope?: boolean;
    onBlocked?: (total: number, blocked: OpenTarget[]) => void;
  } = {},
) {
  const body =
    opts.scope === false ? ui : <HomeScopeProvider>{ui}</HomeScopeProvider>;
  const result = render(
    <ApiProvider api={api}>
      <StoreProvider>
        <I18nProvider>
          <ToastProvider>
            <BlockedContext.Provider value={opts.onBlocked ?? (() => {})}>
              <Ready>{body}</Ready>
            </BlockedContext.Provider>
          </ToastProvider>
        </I18nProvider>
      </StoreProvider>
    </ApiProvider>,
  );
  await waitFor(() =>
    expect(result.container.querySelector("[data-ready=true]")).not.toBeNull(),
  );
  return result;
}

/** 描画時にホームの検索の状態を書き込む（テストの前提を作る） */
export function Seed({ home }: { home: Partial<HomeState> }) {
  const set = useAppStore((s) => s.home_set);
  useEffect(() => {
    set(home);
    // 前提は1回だけ書く
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** ラベルで探した条件ボタンの ID（`Seed` の `onChipIds` に渡して、ON の状態を作る。全対象から探す） */
export async function chipIdsByLabel(
  api: EgoSearchApi,
  labels: string[],
): Promise<string[]> {
  const { chips } = await api.data.init();
  return [...chips.values()]
    .flat()
    .filter((c) => labels.includes(c.label))
    .map((c) => c.id);
}

/**
 * 履歴を1件にする（履歴0件のときだけ出る検索ワード集の表示を、テストで切り分けるため）。
 * 既定の検索文字列は条件ボタン（画像つき）と同じにして、サジェストの候補を増やさない。
 */
export async function recordOneHistory(
  api: EgoSearchApi,
  query = "filter:images",
) {
  const plan = api.url.plan([{ query, engine: "x" }]);
  await api.data.history.record(plan, { kind: "home", label: query });
}

/** ［もっと開く（+N）］を押して、隠れた条件ボタンとサジェストを出す（先頭 foldChips 個より後ろのボタンを使うテスト用） */
export function openMore() {
  fireEvent.click(screen.getByRole("button", { name: /もっと開く/ }));
}

/** ラベルの条件ボタンを返す。折りたたみで隠れているときは、先に［もっと開く］を押す */
export function chipButton(label: string) {
  const name = labeled(label);
  if (!screen.queryByRole("button", { name }))
    fireEvent.click(screen.getByRole("button", { name: /もっと開く/ }));
  return screen.getByRole("button", { name });
}

/** ボタンの名前は「OFF ラベル」のように状態のアイコンの読み上げが先頭に付くので、ラベルで終わるものに一致させる */
export function labeled(label: string): RegExp {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^(ON|OFF)?\\s*${escaped}$`);
}
