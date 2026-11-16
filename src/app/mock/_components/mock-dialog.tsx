"use client";
// MOCK: 破棄予定（#61）
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function MockDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg border-2 border-dashed border-amber-600 bg-background p-4 shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            閉じる（Esc）
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="block rounded bg-muted p-2 font-mono text-xs break-all">
      {children}
    </code>
  );
}
