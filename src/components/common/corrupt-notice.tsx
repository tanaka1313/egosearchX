"use client";
import { useState } from "react";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

/**
 * 保存データが壊れているとき（`CORRUPT`）の全ページ共通の表示（画面仕様書 2.7）。
 * モーダルにせず、フォーカスも奪わない。［データを初期化する］は確認ダイアログ（D3）を経て `data_reset` を呼ぶ。
 */
export function CorruptNotice() {
  const { t } = useI18n();
  const corrupt = useAppStore((s) => s.status === "corrupt");
  const reset = useAppStore((s) => s.data_reset);
  const [confirming, setConfirming] = useState(false);
  if (!corrupt) return null;
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 border-b px-4 py-2 text-sm"
    >
      <p>{t.corrupt.message}</p>
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        {t.corrupt.reset}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t.resetData.title}
        body={t.resetData.body}
        action={t.resetData.action}
        // 失敗しても表示はそのまま残す（トーストは #73 まで無い）
        onConfirm={() => reset().catch(console.error)}
      />
    </div>
  );
}
