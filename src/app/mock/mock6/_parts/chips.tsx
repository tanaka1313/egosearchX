"use client";
// MOCK: 破棄予定（#61）
import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { LIMITS, type Chip } from "./data";
import { chipTokens } from "./query";
import { useStore } from "./store";

/**
 * 条件ボタン。押すと ON/OFF が切り替わるだけ（編集・削除・並べ替えは「条件ボタンの編集」ページ）。
 * ON/OFF でボタンの大きさが変わらないよう、アイコン枠・枠線の太さ・文字の太さを揃える。
 * 「新」バッジは重ねて置き、幅に含めない。
 */
export function ToggleChip({ chip }: { chip: Chip }) {
  const { toggleChip } = useStore();
  return (
    <button
      data-chip={chip.id}
      aria-pressed={chip.on}
      onClick={() => toggleChip(chip.id)}
      title={chipTokens(chip).join(" ")}
      className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring ${chip.on ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground"}`}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {chip.on ? (
          <Check className="size-4" aria-label="ON" />
        ) : (
          <Circle className="size-3.5" aria-label="OFF" />
        )}
      </span>
      {chip.label}
      {chip.isNew && (
        <span className="absolute -top-1.5 right-2 rounded bg-amber-300 px-1 text-[10px] leading-4 font-bold text-amber-950">
          新
        </span>
      )}
    </button>
  );
}

/** 条件ボタン列。3行目以降は［もっと開く］で隠し、隠れた分は inert にする */
export function ChipRow() {
  const { chips } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(0);
  const [clip, setClip] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const calc = () => {
      const kids = Array.from(el.children) as HTMLElement[];
      const tops = [...new Set(kids.map((k) => k.offsetTop))].sort(
        (a, b) => a - b,
      );
      const limit = tops[LIMITS.foldRows];
      let n = 0;
      kids.forEach((k) => {
        const h = limit !== undefined && k.offsetTop >= limit;
        if (h) n++;
        k.inert = !expanded && h;
      });
      setHidden(n);
      setClip(limit !== undefined ? limit - 4 : null);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [chips, expanded]);

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        role="group"
        aria-label="条件ボタン"
        style={!expanded && clip ? { maxHeight: clip } : undefined}
        className="relative flex flex-wrap gap-2 overflow-hidden pt-2"
      >
        {chips.map((c) => (
          <ToggleChip key={c.id} chip={c} />
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm">
        {(hidden > 0 || expanded) && (
          <button
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-dashed px-3 py-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            {expanded ? "閉じる" : `もっと開く（+${hidden}）`}
          </button>
        )}
        <Link
          href="/mock/mock6/buttons"
          className="ml-auto text-muted-foreground underline underline-offset-4"
        >
          ボタンを編集 →
        </Link>
      </div>
    </div>
  );
}
