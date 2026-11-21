"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { DIALOG_OVERLAY } from "@/components/common/dialog-styles";

/**
 * シート（画面仕様書 3.12）。スマホでは下から、768px 以上では右側から出す。
 * 外側を押す・［×］・Esc で閉じ、閉じるとフォーカスは押した `trigger` に戻る（radix の Dialog）。
 * 入力の誤りは、モーダルにせずシートの中に出す（元に戻せない操作の確認は D3＝`ConfirmDialog`）。
 */
export function Sheet({
  open,
  onOpenChange,
  trigger,
  title,
  closeLabel,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 開くボタン（押すとシートが開き、閉じるとフォーカスが戻る） */
  trigger: ReactNode;
  title: string;
  /** ［×］の読み上げ */
  closeLabel: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={DIALOG_OVERLAY} />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-[60] max-h-[90vh] w-full space-y-3 overflow-auto rounded-t-2xl border bg-background p-4 shadow-xl outline-none md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[28rem] md:rounded-none"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-bold">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={closeLabel}
                className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
