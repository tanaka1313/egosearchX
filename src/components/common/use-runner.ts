"use client";

import { useCallback } from "react";
import {
  ApiError,
  type OpenTarget,
  type PlanItem,
  type RunSource,
} from "@/api";
import { useI18n } from "@/store/i18n-context";
import { useApi } from "@/store/api-context";
import { useAppStore } from "@/store/store-context";
import { useToast } from "./toast";

/**
 * 検索を開く共通の処理（docs/api-spec.md 4.6）。クリックの中で呼ぶこと：
 * `url.plan` → 同じクリックの中で `window.open` → `history.record`（待たない）。
 * 戻り値は、開こうとした数（`total`）と、ブロックされて開けなかった検索（`blocked`。画面が個別リンクとして出す）。
 */
export function useRunner() {
  const api = useApi();
  const record = useAppStore((s) => s.history_record);
  const { t } = useI18n();
  const toast = useToast();

  return useCallback(
    (
      items: PlanItem[],
      source: RunSource,
    ): { total: number; blocked: OpenTarget[] } => {
      const plan = api.url.plan(items);
      const blocked: OpenTarget[] = [];
      for (const target of plan.targets) {
        // `noopener` を features に渡すと、開けても戻り値が常に null になりブロックを検出できない。
        // 代わりに開いた後で opener を切る
        const w = window.open(target.url, "_blank");
        if (w) w.opener = null;
        else blocked.push(target);
      }
      // 履歴には、開けなかったものも含め、実行したすべてを残す（F8）
      record(plan, source).catch((e: unknown) => {
        // 壊れたデータ（CORRUPT）は書かないのが正しい動作。それ以外は知らせる
        if (e instanceof ApiError && e.code === "CORRUPT") return;
        console.error(e);
        toast.show(t.toast.recordFailed);
      });
      return { total: plan.targets.length, blocked };
    },
    [api, record, t, toast],
  );
}
