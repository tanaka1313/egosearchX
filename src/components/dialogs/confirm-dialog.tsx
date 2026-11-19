"use client";
import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/store/i18n-context";

/**
 * 元に戻せない操作の確認（D3。画面仕様書 3.12）。
 * 初期フォーカスは［キャンセル］（`AlertDialog.Cancel`）。Esc か外側で閉じる。
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  action,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: ReactNode;
  /** 赤の実行ボタンの文言 */
  action: string;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[65] bg-black/50" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-[65] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-4 shadow-xl">
          <AlertDialog.Title className="font-bold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm">
            {body}
          </AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="outline">{t.confirm.cancel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="destructive" onClick={onConfirm}>
                {action}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
