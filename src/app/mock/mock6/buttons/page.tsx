"use client";
// MOCK: 破棄予定（#61）
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChipEditor } from "../_parts/chip-editor";
import { LIMITS, type Chip } from "../_parts/data";
import { chipTokens } from "../_parts/query";
import { useStore } from "../_parts/store";
import { EmptyState, PageHead } from "../_parts/ui";

function Row({
  chip,
  index,
  onEdit,
}: {
  chip: Chip;
  index: number;
  onEdit: () => void;
}) {
  const { deleteChip, toggleChip } = useStore();
  const { ref, handleRef } = useSortable({ id: chip.id, index });
  return (
    <li
      ref={ref}
      className="flex items-center gap-2 rounded-lg border p-2 text-sm"
    >
      <button
        ref={handleRef}
        aria-label={`${chip.label}を並べ替え（Space で持ち上げ、矢印で移動）`}
        className="cursor-grab touch-none p-1 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1 font-medium">
          {chip.label}
          {chip.isDefault && (
            <span className="rounded border px-1 text-xs">既定</span>
          )}
          {chip.isNew && (
            <span className="rounded bg-amber-300 px-1 text-xs font-bold text-amber-950">
              新
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {chip.conds.length}条件
          </span>
        </div>
        <div className="truncate font-mono text-xs text-muted-foreground">
          {chipTokens(chip).join(" ")}
        </div>
      </div>
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={chip.on}
          onChange={() => toggleChip(chip.id)}
        />
        ON
      </label>
      <Button size="sm" variant="outline" onClick={onEdit}>
        編集
      </Button>
      <button
        aria-label={`${chip.label}を削除`}
        onClick={() => deleteChip(chip.id)}
        className="rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        ×
      </button>
    </li>
  );
}

export default function ButtonsPage() {
  const s = useStore();
  const [editing, setEditing] = useState<Chip | "new" | null>(null);
  const full = s.chips.length >= LIMITS.chips;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead
        title="条件ボタン"
        right={
          <>
            <span className="text-sm">
              {s.chips.length}/{LIMITS.chips}
            </span>
            <Button size="sm" disabled={full} onClick={() => setEditing("new")}>
              ＋ 追加
            </Button>
          </>
        }
      />
      <p className="text-sm text-muted-foreground">
        ホームに並ぶボタンです。ドラッグ（キーボードは Space＋矢印）で並べ替え、
        ラベルと中身（複数の条件）を編集できます。削除すると「削除済み」に移り、復元できます。
      </p>
      {full && (
        <p className="text-sm">
          ⚠ 上限（{LIMITS.chips}
          件）です。不要なボタンを削除してください。履歴からの自動追加も止まっています。
        </p>
      )}
      {s.chips.length === 0 ? (
        <EmptyState text="条件ボタンがありません">
          <Button
            size="sm"
            onClick={() => {
              const n = s.addDefaultChips();
              s.say(`既定のボタンを${n}件追加しました`);
            }}
          >
            既定のボタン（ホロライブ・にじさんじ）を追加
          </Button>
        </EmptyState>
      ) : (
        <DragDropProvider
          onDragEnd={(ev) => {
            if (ev.canceled) return;
            s.setChips(move(s.chips, ev));
          }}
        >
          <ul className="space-y-2">
            {s.chips.map((c, i) => (
              <Row key={c.id} chip={c} index={i} onEdit={() => setEditing(c)} />
            ))}
          </ul>
        </DragDropProvider>
      )}
      {editing && (
        <ChipEditor
          chip={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}
