"use client";

import { PAGE_X } from "@/components/common/layout";
import Link from "next/link";
import type { OpenTarget } from "@/api";
import { formatRunAt } from "@/lib/format-date";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { useRunner } from "./use-runner";

/**
 * フッター（画面仕様書 2.3）。画面の下に固定し、2行にする。
 * 1行目は最後の履歴1件（［再実行］と［履歴 →］つき）、2行目は非公式の表記（公式と誤認されないよう常に出す。要件定義書 7章）。
 * ［再実行］は同じ検索を開いて履歴に足す。いつものエゴサの `lastRunAt` は動かさない（`groupId` を付けない）。
 */
export function SiteFooter({
  onBlocked,
}: {
  onBlocked: (total: number, blocked: OpenTarget[]) => void;
}) {
  const { t } = useI18n();
  const run = useRunner();
  const last = useAppStore((s) => s.history[0]);

  return (
    <footer className="fixed right-0 bottom-0 left-0 z-40 border-t bg-backdrop text-xs xl:left-64">
      {/* 中身は本文の列と同じ幅・同じ面（外側は背景色の黒） */}
      <div className={`mx-auto max-w-3xl bg-background pt-2 pb-1 ${PAGE_X}`}>
        {/* 1行目の高さは［再実行］の有無で変えない（履歴が付いた瞬間にフッターが伸びて本文がずれるため） */}
        <div className="flex h-6.5 items-center gap-2">
          <span className="shrink-0 text-muted-foreground">
            {t.footer.last}
          </span>
          {last ? (
            <>
              <span className="shrink-0">{formatRunAt(last.at)}</span>
              <span className="min-w-0 flex-1 truncate font-mono">
                {last.query}
              </span>
              <button
                type="button"
                onClick={() => {
                  const { total, blocked } = run(
                    [{ query: last.query, engine: last.engine }],
                    last.source,
                  );
                  if (blocked.length > 0) onBlocked(total, blocked);
                }}
                className="shrink-0 rounded border px-2 py-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t.footer.rerun}
              </button>
            </>
          ) : (
            <span className="flex-1 text-muted-foreground">
              {t.footer.empty}
            </span>
          )}
          <Link
            href="/history"
            className="shrink-0 underline underline-offset-4"
          >
            {t.footer.history}
          </Link>
        </div>
        <p className="truncate pt-1 text-[11px] text-muted-foreground">
          {t.footer.unofficial}
        </p>
      </div>
    </footer>
  );
}
