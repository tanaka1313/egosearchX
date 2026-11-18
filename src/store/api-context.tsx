"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { EgoSearchApi } from "@/api";

const ApiContext = createContext<EgoSearchApi | null>(null);

/** 契約の実装を画面に渡す。実装を作るのは組み立ての1か所（app/providers.tsx）だけ */
export function ApiProvider({
  api,
  children,
}: {
  api: EgoSearchApi;
  children: ReactNode;
}) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): EgoSearchApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error("useApi は ApiProvider の中で使う");
  return api;
}
