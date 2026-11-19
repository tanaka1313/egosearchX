"use client";

import { useCallback } from "react";
import { useApi } from "@/store/api-context";
import { useAppStore } from "@/store/store-context";

/**
 * いつものエゴサの項目の名前（画面仕様書 3.11）。項目は名前を持たない。
 * 正規化した文字列が一致するお気に入りがあればその名前、無ければ文字列を出す（要件定義書 11.4）。
 */
export function useItemLabel(): (item: { query: string }) => string {
  const api = useApi();
  const favorites = useAppStore((s) => s.favorites);
  return useCallback(
    (item) => api.query.favName(item.query, favorites) ?? item.query,
    [api, favorites],
  );
}
