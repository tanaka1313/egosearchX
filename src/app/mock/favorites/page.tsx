"use client";
// MOCK: 破棄予定（#61）
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Favorite } from "../_parts/data";
import { FavoriteRow } from "../_parts/rows";
import { useStore } from "../_parts/store";
import { EmptyState, PageHead } from "../_parts/ui";

function SortableFav({
  fav,
  index,
  onEdit,
}: {
  fav: Favorite;
  index: number;
  onEdit: () => void;
}) {
  const { deleteFav } = useStore();
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
        <FavoriteRow
          fav={fav}
          onEdit={onEdit}
          onDelete={() => deleteFav(fav.id)}
        />
      </ul>
    </div>
  );
}

export default function FavoritesPage() {
  const s = useStore();
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const hits = s.favs.filter((f) => f.name.includes(filter));

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead title="お気に入り" />
      <p className="text-sm text-muted-foreground">
        保存した検索です。検索文字列そのものを持つので、条件ボタンを直しても変わりません。［編集］では文字列を条件ボタンと詳細条件に展開して直せます。編集すると、同じ検索文字列を持ついつものエゴサの項目も一緒に更新されます。削除しても、いつものエゴサには影響しません（削除済みから戻せます）。
      </p>
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
                onEdit={() => router.push(`/mock/favorites/edit?id=${f.id}`)}
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
    </main>
  );
}
