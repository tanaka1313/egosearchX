"use client";
// MOCK: 破棄予定（#61）
import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** 下から出るシート（PC は右側）。バナーより前面（z-[60]） */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 md:items-stretch md:justify-end">
      <button
        aria-label="シートの外を押して閉じる"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 -z-0 cursor-default"
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 max-h-[90vh] w-full space-y-3 overflow-auto rounded-t-2xl border bg-background p-4 shadow-xl outline-none md:max-h-none md:w-[28rem] md:rounded-none"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{title}</h2>
          <button
            aria-label="閉じる"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** 元に戻せない操作の確認（M3） */
export function Confirm({
  title,
  body,
  action,
  onYes,
  onClose,
}: {
  title: string;
  body: React.ReactNode;
  action: string;
  onYes: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm space-y-3 rounded-lg border bg-background p-4 shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 className="font-bold">{title}</h2>
        <div className="space-y-2 text-sm">{body}</div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} autoFocus>
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onYes();
              onClose();
            }}
          >
            {action}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 値を足し引きする入力（語・除外など） */
export function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim();
    if (!t) return;
    onChange([...values, t]);
    setText("");
  };
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-wrap gap-1">
        {values.map((v, i) => (
          <span
            key={`${v}${i}`}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs"
          >
            {v}
            <button
              aria-label={`${v}を削除`}
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              add();
            }
          }}
          aria-label={`${label}を追加`}
          placeholder={placeholder ?? "入力して Enter"}
          className="min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm"
        />
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="size-3" />
          追加
        </Button>
      </div>
    </div>
  );
}

export function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="rounded-lg border">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">
        {title}
      </summary>
      <div className="space-y-3 border-t p-3">{children}</div>
    </details>
  );
}

export function EmptyState({
  text,
  children,
}: {
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      <p>{text}</p>
      {children}
    </div>
  );
}

export function PageHead({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>
    </div>
  );
}

/**
 * ON/OFF で押す部品（条件ボタン、期間、3択、タブ）の見た目を、ここ1か所に集める。
 * 枠線の太さと文字の太さは ON/OFF で同じにする（押しても大きさが変わらない）。
 * ON は有彩色の枠＋薄い塗り＋✓（アイコン側）。主ボタン（塗りつぶしの青）とは別の見た目にする。
 */
export const toggleClass = (on: boolean) =>
  `border focus-visible:ring-2 focus-visible:ring-ring ${
    on
      ? "border-primary bg-primary/20 text-foreground"
      : "border-border bg-background text-muted-foreground"
  }`;
