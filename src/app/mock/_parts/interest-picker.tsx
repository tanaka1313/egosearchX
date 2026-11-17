"use client";
// MOCK: 破棄予定（#61）
import { Check, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { DEFAULT_LISTS } from "./data";
import { useStore } from "./store";

/**
 * 興味の対象の切替（ヘッダーのサイト名の一部：［ホロライブ▾］EgoSearch）。
 * 既定はホロライブ。にじさんじに切り替えられる。選んだ内容は端末内（localStorage）にだけ保存する。
 * 常に同じ場所に出し、モーダルにしない。幅は一番長い名前に固定して、切り替えてもガタつかない。
 */
export function InterestPicker() {
  const { interest, setInterest } = useStore();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = DEFAULT_LISTS.find((l) => l.id === interest);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div
      className="relative shrink-0"
      onKeyDown={(ev) => {
        if (ev.key === "Escape" && open) {
          ev.stopPropagation();
          close();
        }
      }}
    >
      <button
        ref={buttonRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`興味の対象：${current?.interest ?? ""}（押して切り替え）`}
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-[6.75rem] items-center justify-between gap-1 rounded-full border-2 border-primary/60 bg-primary/10 px-2.5 py-0.5 text-sm font-bold focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{current?.interest}</span>
        <ChevronDown className="size-4 shrink-0" aria-hidden />
      </button>

      {open && (
        <>
          {/* 外側を押すと閉じる（キーボードでは Esc） */}
          <button
            aria-label="切り替えを閉じる"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            aria-label="興味の対象"
            className="absolute top-full left-0 z-40 mt-1 w-48 rounded-lg border bg-background p-1 shadow-lg"
          >
            {DEFAULT_LISTS.map((l) => {
              const on = l.id === interest;
              return (
                <button
                  key={l.id}
                  role="menuitemradio"
                  aria-checked={on}
                  autoFocus={on}
                  onClick={() => {
                    setInterest(l.id);
                    close();
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {on && <Check className="size-4" aria-hidden />}
                  </span>
                  <span className={on ? "font-bold" : ""}>{l.interest}</span>
                </button>
              );
            })}
            <p className="px-2 pt-1 pb-1 text-xs text-muted-foreground">
              選んだ対象の条件ボタンだけをホームに出します。この端末にだけ保存します。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
