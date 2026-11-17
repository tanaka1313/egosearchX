"use client";
// MOCK: 破棄予定（#61）
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, List, Pencil, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { LIMITS, type Chip } from "./data";
import { chipTokens } from "./query";
import { useStore } from "./store";

export function SortableChip({
  chip,
  index,
  onEdit,
  compact,
}: {
  chip: Chip;
  index: number;
  onEdit: (c: Chip) => void;
  compact?: boolean;
}) {
  const { toggleChip, deleteChip } = useStore();
  const { ref, handleRef, isDragging } = useSortable({ id: chip.id, index });
  const hasList = chip.conds.some((c) => c.kind === "list");
  return (
    <div
      ref={ref}
      data-chip={chip.id}
      className={`inline-flex items-center rounded-full border ${chip.on ? "border-foreground bg-foreground text-background" : "bg-background"} ${isDragging ? "opacity-60 shadow-lg" : ""}`}
    >
      <button
        ref={handleRef}
        aria-label={`${chip.label}を並べ替え（Space で持ち上げ、矢印で移動）`}
        className="cursor-grab touch-none rounded-l-full py-1.5 pr-0.5 pl-1.5 opacity-70 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        aria-pressed={chip.on}
        onClick={() => toggleChip(chip.id)}
        title={chipTokens(chip).join(" ")}
        className="flex items-center gap-1 px-1.5 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring"
      >
        {chip.on ? "✓" : "＋"}
        {hasList && <List className="size-3.5" aria-label="リスト" />}
        {chip.label}
        {chip.conds.length > 1 && (
          <span className="text-xs opacity-70">×{chip.conds.length}</span>
        )}
        {chip.isNew && (
          <span className="rounded bg-amber-300 px-1 text-xs font-bold text-amber-950">
            新
          </span>
        )}
      </button>
      {!compact && (
        <button
          aria-label={`${chip.label}を編集`}
          onClick={() => onEdit(chip)}
          className="p-1 opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil className="size-3" />
        </button>
      )}
      <button
        aria-label={`${chip.label}を削除`}
        onClick={() => deleteChip(chip.id)}
        className="rounded-r-full py-1.5 pr-2 pl-0.5 opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

/** 条件ボタン列。3行目以降は［もっと開く］で隠し、隠れた分は inert にする */
export function ChipRow({
  onEdit,
  fold = true,
}: {
  onEdit: (c: Chip) => void;
  fold?: boolean;
}) {
  const { chips, setChips } = useStore();
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
      const limit = fold ? tops[LIMITS.foldRows] : undefined;
      let n = 0;
      kids.forEach((k) => {
        const h = limit !== undefined && k.offsetTop >= limit;
        if (h) n++;
        k.inert = !expanded && h;
      });
      setHidden(n);
      setClip(limit !== undefined ? limit - 8 : null);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [chips, expanded, fold]);

  return (
    <div>
      <DragDropProvider
        onDragEnd={(ev) => {
          if (ev.canceled) return;
          setChips(move(chips, ev));
        }}
      >
        <div
          ref={boxRef}
          role="group"
          aria-label="条件ボタン"
          style={!expanded && clip ? { maxHeight: clip } : undefined}
          className="relative flex flex-wrap gap-2 overflow-hidden"
        >
          {chips.map((c, i) => (
            <SortableChip key={c.id} chip={c} index={i} onEdit={onEdit} />
          ))}
        </div>
      </DragDropProvider>
      {fold && (hidden > 0 || expanded) && (
        <button
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 rounded-full border border-dashed px-3 py-1 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "閉じる" : `もっと開く（+${hidden}）`}
        </button>
      )}
    </div>
  );
}
