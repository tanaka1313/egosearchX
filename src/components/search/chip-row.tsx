"use client";

import Link from "next/link";
import { useState } from "react";
import { LIMITS } from "@/api";
import { useI18n } from "@/store/i18n-context";
import { ChipButton, SuggestChip } from "./chip-button";
import { useSearchScope } from "./search-scope";

/**
 * 条件ボタンの並び（画面仕様書 3.3）。「表示」にしたボタンの先頭 `LIMITS.foldChips` 個を並べ、残りは［もっと開く（+N）］で隠す
 * （隠したボタンは描画しないのでフォーカスも当たらない）。N は開くと出てくるもの全部（隠れたボタン＋サジェスト）。
 * ボタンが少なくても、サジェストがあれば［もっと開く］を出す（サジェストに届く道を無くさない）。
 * 開いた後は［閉じる］を置かず、サジェストの欄を下に出す。「ボタンを編集 →」は並びの最後の行の右端に置く。
 * 検索ワード集（D4）と、履歴0件のときのホームの検索ワード集は #89。
 */
export function ChipRow() {
  const { visibleChips, suggestions } = useSearchScope();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const shown = expanded
    ? visibleChips
    : visibleChips.slice(0, LIMITS.foldChips);
  const hidden = expanded
    ? 0
    : visibleChips.length - shown.length + suggestions.length;

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label={t.search.chips}
        className="relative flex flex-wrap items-center gap-2 pt-2"
      >
        {shown.map((c) => (
          <ChipButton key={c.id} chip={c} />
        ))}
        {hidden > 0 && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(true)}
            className="rounded-full border border-dashed px-3 py-1 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t.search.more(hidden)}
          </button>
        )}
        <Link
          href="/buttons"
          className="ml-auto text-sm text-muted-foreground underline underline-offset-4"
        >
          {t.search.editChips}
        </Link>
      </div>
      {expanded && (
        // 条件ボタンの並びと詰まって見えないよう、上に余白を取る（枠線は足さない）
        <section aria-label={t.search.suggestLabel} className="space-y-2 pt-3">
          <p className="text-xs text-muted-foreground">
            {t.search.suggestHeading}
          </p>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.search.suggestEmpty}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((token) => (
                <SuggestChip key={token} token={token} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
