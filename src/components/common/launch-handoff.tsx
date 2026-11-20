"use client";

import { createContext, useContext } from "react";
import type { OpenTarget } from "@/api";

/**
 * 一括実行（帯・S4）のあと、ランチャー（S9）へ引き継ぐ結果（画面仕様書 6章）。保存はしない（画面の中だけの一時状態。
 * 再読み込みで消える）。`id` が変わるたびに、ランチャーは表示を作り直す。
 */
export type LaunchHandoff = {
  id: number;
  /** ランチャーの URL のハッシュ（`launcher.encode` の結果）。表示中のハッシュと一致したときだけ使う */
  hash: string;
  /** 開こうとした数 */
  total: number;
  /** ブロックされて開けなかった検索 */
  blocked: OpenTarget[];
};

export type LaunchHandoffStore = {
  current: LaunchHandoff | null;
  put(h: Omit<LaunchHandoff, "id">): void;
};

/** Provider が無いとき（部品の単体テスト）は、引き継がない */
export const LaunchHandoffContext = createContext<LaunchHandoffStore>({
  current: null,
  put: () => {},
});

export const useLaunchHandoff = (): LaunchHandoffStore =>
  useContext(LaunchHandoffContext);
