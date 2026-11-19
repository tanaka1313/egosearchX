"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/store/i18n-context";

/** 表示時間。元に戻せる操作の［元に戻す］を押す余裕のため、長めにする */
const TOAST_MS = 7000;

type Toast = { msg: string; undo?: () => void };
export type ToastApi = {
  /** 文言は呼び出し側が辞書から作って渡す。`undo` があれば［元に戻す］を付ける */
  show(msg: string, undo?: () => void): void;
};

/** Provider が無いときは何も出さない（部品の単体テスト用） */
const ToastContext = createContext<ToastApi>({ show: () => {} });

export const useToast = (): ToastApi => useContext(ToastContext);

/**
 * トースト（画面仕様書 2.5）。保存・コピー・エラー・削除を知らせる。警告には使わない（3.8）。
 * フッターの上に出し（`bottom` は呼び出し側が渡す。ランチャーはフッターが無いので下端）、フォーカスは奪わない。
 */
export function ToastProvider({
  bottomClass = "bottom-20",
  children,
}: {
  bottomClass?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, undo?: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, undo });
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <div
          role="status"
          className={`fixed inset-x-3 ${bottomClass} z-[70] mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-foreground px-4 py-3 text-sm text-background shadow-xl`}
        >
          <span className="flex-1">{toast.msg}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
              className="rounded border border-background/50 px-2 py-1 font-bold underline"
            >
              {t.toast.undo}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}
