"use client";
// MOCK: 破棄予定（#61）
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChipEditor } from "../_parts/chip-editor";
import { INTERESTS, LIMITS, type Chip } from "../_parts/data";
import { chipTokens } from "../_parts/query";
import { chipConds } from "../_parts/query-model";
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
  const { deleteChip, toggleVisible, say } = useStore();
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
          {chip.isPreset && (
            <span className="rounded border px-1 text-xs">プリセット</span>
          )}
          {chip.isNew && (
            <span className="rounded bg-amber-300 px-1 text-xs font-bold text-amber-950">
              新
            </span>
          )}
          {!chip.visible && (
            <span className="rounded border px-1 text-xs">非表示</span>
          )}
          <span className="text-xs text-muted-foreground">
            {chipConds(chip).length}条件
          </span>
        </div>
        <div className="truncate font-mono text-xs text-muted-foreground">
          {chipTokens(chip).join(" ")}
        </div>
      </div>
      <label
        className="flex items-center gap-1 text-xs"
        title="ホームに出す。外すとホームの並び・クエリから外れます"
      >
        <input
          type="checkbox"
          checked={chip.visible}
          onChange={() => toggleVisible(chip.id)}
        />
        表示
      </label>
      <Button size="sm" variant="outline" onClick={onEdit}>
        編集
      </Button>
      <Button
        size="sm"
        variant="outline"
        title="条件の文字列をクリップボードにコピーします"
        onClick={() => {
          void navigator.clipboard?.writeText(chipTokens(chip).join(" "));
          say(`「${chip.label}」の条件をコピーしました`);
        }}
      >
        コピー
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const n = s.addPresets();
                s.say(
                  n
                    ? `プリセットのボタンを${n}件追加しました`
                    : "プリセットのボタンはすべて登録済みです",
                );
              }}
            >
              プリセットを追加
            </Button>
            <Button size="sm" disabled={full} onClick={() => setEditing("new")}>
              ＋ 追加
            </Button>
          </>
        }
      />
      <p className="text-sm text-muted-foreground">
        ホームに並ぶボタンです（いま選んでいる「
        {INTERESTS[s.interest]?.label}
        」の並び。ヘッダーで切り替えると別の並びになります）。ドラッグ（キーボードは
        Space＋矢印）で並べ替え、
        ラベルと中身（複数の条件）を編集できます。［コピー］で条件の文字列をクリップボードにコピーできます。「表示」を外すと、ホームには出ません（削除はされません）。削除すると「削除済み」に移り、復元できます。
      </p>
      {full && (
        <p className="text-sm">
          ⚠ 上限（{LIMITS.chips}
          件）です。不要なボタンを削除してください。
        </p>
      )}
      {s.chips.length === 0 ? (
        <EmptyState text="条件ボタンがありません">
          <Button
            size="sm"
            onClick={() => {
              const n = s.addPresets();
              s.say(`プリセットのボタンを${n}件追加しました`);
            }}
          >
            プリセット（{INTERESTS[s.interest]?.label}）を追加
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
      <section aria-label="サジェスト検索条件" className="space-y-2 pt-2">
        <h2 className="font-bold">サジェスト（直近の検索などから）</h2>
        <p className="text-sm text-muted-foreground">
          最近の検索などから作った候補です（最大{LIMITS.suggest}
          件）。気に入ったものを条件ボタンに追加できます。候補の表示順は変えられません。
        </p>
        {s.suggestions.length === 0 ? (
          <EmptyState text="検索するとここに候補が出ます" />
        ) : (
          <ul className="space-y-1">
            {s.suggestions.map((t) => (
              <li
                key={t}
                className="flex items-center gap-2 rounded-lg border border-dashed p-2 text-sm"
              >
                <code className="min-w-0 flex-1 truncate font-mono text-xs">
                  {t}
                </code>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={full}
                  onClick={() => {
                    const e = s.adoptSuggestion(t);
                    if (e) s.say(e);
                  }}
                >
                  ＋ 条件ボタンに追加
                </Button>
              </li>
            ))}
          </ul>
        )}
        {full && (
          <p className="text-xs">
            ⚠ 条件ボタンが上限（{LIMITS.chips}件）のため追加できません
          </p>
        )}
      </section>
      {editing && (
        <ChipEditor
          chip={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </main>
  );
}
