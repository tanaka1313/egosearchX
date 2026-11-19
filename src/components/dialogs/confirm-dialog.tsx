"use client";
import { AlertDialog } from "radix-ui";
import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { focusMain, isFocusable } from "@/lib/focus";
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
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: ReactNode;
  /** 赤の実行ボタンの文言 */
  action: string;
  onConfirm: () => void;
  /** 閉じたあとのフォーカスの戻し先を呼び出し側が決めるとき（押した行が消える場合など）。既定は開いた要素へ、戻せなければ本文（main）へ */
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const { t } = useI18n();
  // 開く直前にフォーカスのあった要素。Radix の AlertDialog はトリガーを持たないので、戻し先は自分で覚える
  const opener = useRef<Element | null>(null);
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[65] bg-black/50" />
        <AlertDialog.Content
          // 初期フォーカス（［キャンセル］）へ移る前に呼ばれるので、まだ押した要素にフォーカスがある
          onOpenAutoFocus={() => {
            opener.current = document.activeElement;
          }}
          onCloseAutoFocus={(ev) => {
            if (onCloseAutoFocus) return onCloseAutoFocus(ev);
            ev.preventDefault();
            // 押した要素が消えた・無効になった・フォーカスが body のままだったとき（Safari のマウス操作）は本文へ
            if (isFocusable(opener.current)) opener.current.focus();
            else focusMain();
          }}
          className="fixed top-1/2 left-1/2 z-[65] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-4 shadow-xl"
        >
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
