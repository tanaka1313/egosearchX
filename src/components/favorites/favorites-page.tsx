"use client";

import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useState } from "react";
import { ApiError, type Favorite } from "@/api";
import { EmptyState } from "@/components/common/empty-state";
import { PageHead } from "@/components/common/page-head";
import { useToast } from "@/components/common/toast";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { FavoriteRow } from "./favorite-row";

/**
 * S3：お気に入り（画面仕様書 5.2）。名前で絞り込み、並べ替え（取っ手。絞り込み中は反映しない）、
 * 実行・編集（S3-E）・削除（削除済みへ。トーストの［元に戻す］）ができる。削除してもいつものエゴサは変わらない。
 */
export function FavoritesPage() {
  const { t } = useI18n();
  const p = t.favoritesPage;
  const toast = useToast();
  const favorites = useAppStore((s) => s.favorites);
  const reorder = useAppStore((s) => s.favorites_reorder);
  const restore = useAppStore((s) => s.trash_restore);
  const [filter, setFilter] = useState("");

  // 並べ替えの直後は、保存と読み直しが済むまで、落とした並びをこの画面で持つ（行が元に戻って見えないように）。
  // お気に入りが読み直されると（`favorites` の参照が変わると）捨てる
  const [local, setLocal] = useState<{
    base: Favorite[];
    ids: string[];
  } | null>(null);
  const ordered =
    local && local.base === favorites
      ? local.ids
          .map((id) => favorites.find((f) => f.id === id))
          .filter((f): f is Favorite => f !== undefined)
      : favorites;
  const needle = filter.trim();
  const shown = needle
    ? ordered.filter((f) => f.name.includes(needle))
    : ordered;

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.code === "CORRUPT") return;
    console.error(e);
    toast.show(p.failed);
  };

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead title={p.title} />
      <p className="text-sm text-muted-foreground">{p.description}</p>
      <input
        value={filter}
        onChange={(ev) => setFilter(ev.target.value)}
        aria-label={p.filter}
        placeholder={p.filter}
        className="w-full rounded-lg border bg-field px-3 py-2 text-sm"
      />

      {favorites.length === 0 ? (
        <EmptyState text={p.empty} />
      ) : (
        <DragDropProvider
          onDragEnd={(ev) => {
            // 絞り込み中は、見えている一部だけの並びなので反映しない
            if (ev.canceled || needle) return;
            const ids = move(ordered, ev).map((f) => f.id);
            setLocal({ base: favorites, ids });
            reorder(ids).catch((e: unknown) => {
              setLocal(null);
              fail(e);
            });
          }}
        >
          <ul aria-label={p.list} className="space-y-2">
            {shown.map((fav, i) => (
              <FavoriteRow
                key={fav.id}
                fav={fav}
                index={i}
                onRemoved={(f) =>
                  toast.show(p.removed(f.name), () =>
                    restore("favorite", f.id).catch(fail),
                  )
                }
              />
            ))}
          </ul>
        </DragDropProvider>
      )}
      {needle && (
        <p className="text-xs text-muted-foreground">{p.filterNote}</p>
      )}
    </main>
  );
}
