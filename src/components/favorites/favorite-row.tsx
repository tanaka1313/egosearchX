"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { ApiError, type Engine, type Favorite } from "@/api";
import { useReportBlocked } from "@/components/common/blocked-context";
import { useToast } from "@/components/common/toast";
import { useRunner } from "@/components/common/use-runner";
import { Button } from "@/components/ui/button";
import { formatRunAt } from "@/lib/format-date";
import { ENGINE_LABEL, ENGINE_SHORT } from "@/messages";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

/** 検索先バッジ。短縮名（識別子だけ。正式名は title と読み上げ。画面仕様書 3.11） */
const badge = (engine: Engine) =>
  engine === "both"
    ? {
        short: `${ENGINE_SHORT.x}＋${ENGINE_SHORT.yahoo}`,
        full: `${ENGINE_LABEL.x}＋${ENGINE_LABEL.yahoo}`,
      }
    : { short: ENGINE_SHORT[engine], full: ENGINE_LABEL[engine] };

/**
 * S3 の行（FavoriteRow。画面仕様書 3.11）：取っ手・名前・検索先バッジ・⚠・保存している検索文字列・前回、
 * 右に［▶ 実行］［編集］［×］。名前と文字列は「…」で省略し、バッジ・⚠・ボタンは縮めない。
 * 3行目は「前回 …」か「未実行」のどちらも1行で、行の高さを変えない。
 */
export function FavoriteRow({
  fav,
  index,
  onRemoved,
}: {
  fav: Favorite;
  index: number;
  /** 削除済みへ移したあとに呼ぶ（トーストの［元に戻す］は親が出す） */
  onRemoved: (fav: Favorite) => void;
}) {
  const api = useApi();
  const { t } = useI18n();
  const p = t.favoritesPage;
  const toast = useToast();
  const runner = useRunner();
  const reportBlocked = useReportBlocked();
  const remove = useAppStore((s) => s.favorites_remove);
  const { ref, handleRef } = useSortable({ id: fav.id, index });

  const b = badge(fav.engine);
  // 開くときに出る警告（Yahoo!リアルタイム検索で使えない演算子など）。保存している検索先で開いたときのもの
  const warnings = useMemo(
    () =>
      api.url
        .plan([{ query: fav.query, engine: fav.engine }])
        .warnings.map((w) => t.issues[w.code](w.params ?? {})),
    [api, fav.query, fav.engine, t],
  );
  const last = fav.lastRunAt ? formatRunAt(fav.lastRunAt) : null;

  const run = useCallback(() => {
    const { total, blocked } = runner(
      [{ query: fav.query, engine: fav.engine }],
      {
        kind: "favorite",
        label: fav.name,
      },
    );
    if (blocked.length > 0) reportBlocked(total, blocked);
  }, [runner, reportBlocked, fav]);

  const del = () =>
    remove(fav.id).then(
      () => onRemoved(fav),
      (e: unknown) => {
        if (e instanceof ApiError && e.code === "CORRUPT") return;
        console.error(e);
        toast.show(p.failed);
      },
    );

  return (
    <li
      ref={ref}
      className="flex items-center gap-1 rounded-lg border p-2 text-sm"
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={p.reorder(fav.name)}
        className="shrink-0 cursor-grab touch-none p-1 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1 font-medium">
          <span className="min-w-0 truncate" title={fav.name}>
            {fav.name}
          </span>
          <span
            title={p.engineBadge(b.full)}
            aria-label={p.engineBadge(b.full)}
            className="shrink-0 rounded border px-1 text-xs whitespace-nowrap"
          >
            {b.short}
          </span>
          {warnings.length > 0 && (
            <span
              title={warnings.join(" / ")}
              aria-label={p.warned}
              className="shrink-0"
            >
              ⚠
            </span>
          )}
        </div>
        <div
          title={api.query.expand(fav.query)}
          className="truncate font-mono text-xs text-muted-foreground"
        >
          {fav.query || t.home.noCondition}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {last ? p.lastRun(last) : p.neverRun}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-label={t.home.runLabel(fav.name)}
          onClick={run}
        >
          {t.home.run}
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link
            href={`/favorites/edit?id=${encodeURIComponent(fav.id)}`}
            aria-label={p.editLabel(fav.name)}
          >
            {p.edit}
          </Link>
        </Button>
        <button
          type="button"
          aria-label={p.remove(fav.name)}
          onClick={del}
          className="rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          ×
        </button>
      </div>
    </li>
  );
}
