"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ApiError, type Favorite } from "@/api";
import { useReportBlocked } from "@/components/common/blocked-context";
import { useToast } from "@/components/common/toast";
import { useRunner } from "@/components/common/use-runner";
import { Button } from "@/components/ui/button";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

/**
 * お気に入り（画面仕様書 4.2）：区切り線の下に、閉じた1行「☆ お気に入り（件数）」を置く。
 * 開くと全件を並べる。各行は押して実行するだけの形（名前・開くときの検索文字列・［▶ 実行］。検索先バッジと⚠は S3 の行で出す）。
 * 開閉は `prefs.favOpen` に保存する（初回は閉じる）。localStorage は直接触らない。
 */
export function FavoritesFold() {
  const api = useApi();
  const { t } = useI18n();
  const toast = useToast();
  const runner = useRunner();
  const reportBlocked = useReportBlocked();
  const ready = useAppStore((s) => s.status === "ready");
  const open = useAppStore((s) => s.prefs?.favOpen ?? false);
  const favorites = useAppStore((s) => s.favorites);
  const prefsSet = useAppStore((s) => s.prefs_set);

  const toggle = () => {
    if (!ready) return;
    prefsSet({ favOpen: !open }).catch((e: unknown) => {
      if (e instanceof ApiError && e.code === "CORRUPT") return;
      console.error(e);
      toast.show(t.toast.saveFailed);
    });
  };
  const run = (f: Favorite) => {
    const { total, blocked } = runner([{ query: f.query, engine: f.engine }], {
      kind: "favorite",
      label: f.name,
    });
    if (blocked.length > 0) reportBlocked(total, blocked);
  };

  return (
    <section aria-label={t.home.favorites} className="border-t pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? (
          <ChevronDown className="size-4" aria-hidden />
        ) : (
          <ChevronRight className="size-4" aria-hidden />
        )}
        <span>{t.home.favoritesHead(favorites.length)}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {favorites.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t.home.favoritesEmpty}
            </div>
          )}
          <ul className="space-y-2">
            {favorites.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-2 rounded-lg border p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{f.name}</div>
                  <div
                    title={api.query.expand(f.query)}
                    className="truncate font-mono text-xs text-muted-foreground"
                  >
                    {api.query.expand(f.query) || t.home.noCondition}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  aria-label={t.home.runLabel(f.name)}
                  onClick={() => run(f)}
                >
                  {t.home.run}
                </Button>
              </li>
            ))}
          </ul>
          <Link
            href="/favorites"
            className="block text-right text-sm text-muted-foreground underline underline-offset-4"
          >
            {t.home.editFavorites}
          </Link>
        </div>
      )}
    </section>
  );
}
