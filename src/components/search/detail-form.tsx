"use client";

import { Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/store/i18n-context";

/** 値を足し引きする入力（語・除外など）。Enter か［追加］で足し、付けた語は［×］で外す */
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
  const { t } = useI18n();
  const d = t.search.detail;
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (!v) return;
    onChange([...values, v]);
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
              type="button"
              aria-label={d.tagRemove(v)}
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          onKeyDown={(ev) => {
            // 日本語入力の確定の Enter では足さない
            if (ev.key === "Enter" && !ev.nativeEvent.isComposing) {
              ev.preventDefault();
              add();
            }
          }}
          aria-label={d.tagAdd(label)}
          placeholder={placeholder ?? d.tagPlaceholder}
          className="min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="size-3" aria-hidden />
          {d.add}
        </Button>
      </div>
    </div>
  );
}

/** 開閉できる節（`details`）。キーボードでもそのまま操作できる */
export function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
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

/** ラベル付きの1行入力 */
export function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(ev) => onChange(ev.target.value)}
        className="w-full rounded-lg border px-2 py-1.5 font-mono"
      />
    </label>
  );
}
