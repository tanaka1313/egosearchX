"use client";
// MOCK: 破棄予定（#61）
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Engine, Favorite } from "../_parts/data";
import { PERIOD_LABEL } from "../_parts/query";
import { FavoriteRow } from "../_parts/rows";
import { useStore } from "../_parts/store";
import { EmptyState, PageHead, Sheet } from "../_parts/ui";

function SortableFav({
  fav,
  index,
  onEdit,
}: {
  fav: Favorite;
  index: number;
  onEdit: () => void;
}) {
  const { ref, handleRef } = useSortable({ id: fav.id, index });
  return (
    <div ref={ref} className="flex items-start gap-1">
      <button
        ref={handleRef}
        aria-label={`${fav.name}を並べ替え`}
        className="mt-3 cursor-grab touch-none p-1 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GripVertical className="size-4" />
      </button>
      <ul className="min-w-0 flex-1">
        <FavoriteRow fav={fav} onEdit={onEdit} />
      </ul>
    </div>
  );
}

export default function FavoritesPage() {
  const s = useStore();
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Favorite | null>(null);
  const hits = s.favs.filter((f) => f.name.includes(filter));

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead title="お気に入り" />
      <input
        value={filter}
        onChange={(ev) => setFilter(ev.target.value)}
        aria-label="名前で絞り込み"
        placeholder="名前で絞り込み"
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />
      {s.favs.length === 0 ? (
        <EmptyState text="ホームで条件を触って ☆ 保存 するとここに入ります" />
      ) : (
        <DragDropProvider
          onDragEnd={(ev) => {
            if (ev.canceled || filter) return;
            // 並べ替えは絞り込みなしのときだけ
            const moved = move(s.favs, ev);
            moved.forEach((f, i) => {
              if (s.favs[i]?.id !== f.id) s.saveFav(f);
            });
          }}
        >
          <div className="space-y-2">
            {hits.map((f, i) => (
              <SortableFav
                key={f.id}
                fav={f}
                index={i}
                onEdit={() => setEditing(f)}
              />
            ))}
          </div>
        </DragDropProvider>
      )}
      {filter && (
        <p className="text-xs text-muted-foreground">
          絞り込み中は並べ替えを反映しません
        </p>
      )}
      {editing && <FavEditor fav={editing} onClose={() => setEditing(null)} />}
    </main>
  );
}

function FavEditor({ fav, onClose }: { fav: Favorite; onClose: () => void }) {
  const s = useStore();
  const [f, setF] = useState<Favorite>(fav);
  const [err, setErr] = useState("");
  return (
    <Sheet title="お気に入りを編集" onClose={onClose}>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">名前</span>
        <input
          value={f.name}
          onChange={(ev) => setF({ ...f, name: ev.target.value })}
          className="w-full rounded-lg border px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">検索語</span>
        <input
          value={f.word}
          onChange={(ev) => setF({ ...f, word: ev.target.value })}
          className="w-full rounded-lg border px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={f.exact}
          onChange={(ev) => setF({ ...f, exact: ev.target.checked })}
        />
        完全一致
      </label>
      <fieldset className="space-y-1 text-sm">
        <legend className="font-medium">使う条件ボタン（参照）</legend>
        {s.chips.map((c) => (
          <label key={c.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={f.chipIds.includes(c.id)}
              onChange={() =>
                setF({
                  ...f,
                  chipIds: f.chipIds.includes(c.id)
                    ? f.chipIds.filter((x) => x !== c.id)
                    : [...f.chipIds, c.id],
                })
              }
            />
            {c.label}
          </label>
        ))}
      </fieldset>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">個別設定（スペース区切り）</span>
        <input
          value={f.extra.join(" ")}
          onChange={(ev) =>
            setF({ ...f, extra: ev.target.value.split(/\s+/).filter(Boolean) })
          }
          className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
        />
      </label>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="space-y-1">
          <span className="font-medium">期間</span>
          <select
            value={f.period}
            onChange={(ev) =>
              setF({ ...f, period: ev.target.value as Favorite["period"] })
            }
            className="w-full rounded-lg border px-2 py-2"
          >
            {(["none", "today", "yday", "last"] as const).map((k) => (
              <option key={k} value={k}>
                {PERIOD_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="font-medium">エンジン</span>
          <select
            value={f.engine}
            onChange={(ev) => setF({ ...f, engine: ev.target.value as Engine })}
            className="w-full rounded-lg border px-2 py-2"
          >
            <option value="x">X</option>
            <option value="yahoo">Yahoo</option>
            <option value="both">両方</option>
          </select>
        </label>
      </div>
      {err && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {err}
        </p>
      )}
      <div className="flex justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => {
            s.saveFav({
              ...f,
              id: `f${Date.now()}`,
              name: `${f.name}（複製）`,
            });
            onClose();
          }}
        >
          複製
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            onClick={() => {
              if (!f.name.trim()) return setErr("名前を入力してください");
              s.saveFav({ ...f, name: f.name.trim() });
              onClose();
            }}
          >
            保存
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
