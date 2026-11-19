// 部品のテスト用の組み立て（本物のバックエンドは呼び出し側が作って渡す）。アプリ本体からは import しない。
import { render, waitFor } from "@testing-library/react";
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
