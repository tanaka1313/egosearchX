"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import { createAppStore, type AppState, type AppStore } from "./app-store";
import { useApi } from "./api-context";

const StoreContext = createContext<AppStore | null>(null);

/** ストアを1回だけ作り、マウント後に読み込む（`ApiProvider` の内側に置く）。壊れたデータでも子は描画する */
export function StoreProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [store] = useState(() => createAppStore(api));
  useEffect(() => {
    // 読み込みの失敗は status で表す。CORRUPT 以外（想定外）はコンソールに残す
    store.getState().init().catch(console.error);
  }, [store]);
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}

/**
 * 状態の一部を読む。配列やオブジェクトを新しく作るセレクターは、
 * zustand の `useShallow` で包むこと（毎回違う参照を返すと再描画が止まらない）。
 */
export function useAppStore<T>(selector: (s: AppState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useAppStore は StoreProvider の中で使う");
  return useStore(store, selector);
}
