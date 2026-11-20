"use client";

import { Check, Play, Plus } from "lucide-react";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { LIMITS, type OpenTarget } from "@/api";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { useRunGroup } from "./use-run-group";

/**
 * 「いつものエゴサ」の帯（画面仕様書 2.2）。ヘッダーの下、全ページ（ランチャー含む）に出す。
 * 先頭 `LIMITS.headerGroups` 件だけ並べ、名前は省略する。高さは固定（0件のときも同じ）。
 * ✓（今日は済）は履歴ではなく `Group.lastRunAt` が端末の現地の今日かで決める。✓の枠は常に確保し、幅を変えない。
 */
export function GroupStrip({
  onBlocked,
}: {
  /** ブロックされて開けなかった検索があるとき（開こうとした数と、開けなかったもの） */
  onBlocked: (total: number, blocked: OpenTarget[]) => void;
}) {
  const api = useApi();
  const { t } = useI18n();
  const runGroup = useRunGroup(onBlocked);
  const ready = useAppStore((s) => s.status === "ready");
  const shown = useAppStore(
    useShallow((s) => s.groups.slice(0, LIMITS.headerGroups)),
  );
  // 読み込み前（ちらつく）と壊れているとき（データが無い）は 0件の案内を出さない
  const empty = ready && shown.length === 0;

  return (
    <div className="border-b">
      <div className="mx-auto flex h-12 max-w-2xl items-center gap-2 px-3 md:px-4">
        <span className="shrink-0 text-xs text-muted-foreground">
          {t.strip.label}
        </span>
        {/* 追加は専用ページ（詳細条件まで使うので、シートにしない） */}
        <Link
          href="/groups/edit"
          aria-label={t.strip.add}
          title={t.strip.add}
          className="flex size-7 shrink-0 items-center justify-center rounded-full border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" aria-hidden />
        </Link>
        {empty && (
          <span
            title={t.strip.emptyTitle}
            className="min-w-0 truncate text-sm text-muted-foreground"
          >
            {t.strip.empty}
          </span>
        )}
        {shown.length > 0 && (
          <div
            role="group"
            aria-label={t.strip.label}
            className="flex min-w-0 flex-1 items-center gap-1.5"
          >
            {shown.map((g) => {
              const done = api.clock.isToday(g.lastRunAt);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => runGroup(g)}
                  title={t.strip.title(g.name, g.items.length, done)}
                  aria-label={t.strip.run(g.name, g.items.length, done)}
                  className="flex min-w-0 items-center gap-1 rounded-full border-2 px-2.5 py-1 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Play className="size-3.5 shrink-0" aria-hidden />
                  <span className="max-w-[4rem] truncate sm:max-w-[9rem]">
                    {g.name}
                  </span>
                  <span className="shrink-0">({g.items.length})</span>
                  <span className="flex size-3.5 shrink-0 items-center justify-center">
                    {done && <Check className="size-3.5" aria-hidden />}
                  </span>
                </button>
              );
            })}
            <Link
              href="/groups"
              className="ml-auto hidden shrink-0 text-sm text-muted-foreground underline underline-offset-4 sm:inline"
            >
              {t.strip.list}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
