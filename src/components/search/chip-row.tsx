"use client";

import Link from "next/link";
import { useState } from "react";
import { LIMITS } from "@/api";
import { WordSetDialog } from "@/components/dialogs/word-set-dialog";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { ChipButton, SuggestChip, WordChip } from "./chip-button";
import { useSearchScope } from "./search-scope";

/**
 * 条件ボタンの並び（画面仕様書 3.3）。「表示」にしたボタンの続きに、履歴0件のときだけ検索ワード集（starter）を
 * 区別なくつなげ、その先頭 `LIMITS.foldChips` 個を並べる。残りは［もっと開く（+N）］で隠す
 * （隠したボタンは描画しないのでフォーカスも当たらない）。N は開くと出てくるもの全部（隠れたボタン＋隠れた検索ワード集＋サジェスト）。
 * ボタンが少なくても、サジェストがあれば［もっと開く］を出す（サジェストに届く道を無くさない）。
 * 開いた後は［閉じる］を置かず、サジェストの欄を下に出す。［検索ワード集］（D4）は常に置き、
 * 「ボタンを編集 →」は並びの最後の行の右端に置く。
 */
export function ChipRow() {
  const { visibleChips, starters, suggestions, wordSet } = useSearchScope();
  const { t, lang } = useI18n();
  // サジェストが検索ワード集のワードなら、そのボタン（表示名）で出す。それ以外（履歴の語）は検索文字列のまま
  const wordOf = (query: string) =>
    wordSet.flatMap((g) => g.words).find((w) => w.query === query);
  const newChipIds = useAppStore((s) => s.newChipIds);
  const [expanded, setExpanded] = useState(false);

  const items = [
    ...visibleChips.map((chip) => ({ key: chip.id, chip, word: null })),
    ...starters.map((word) => ({ key: `w:${word}`, chip: null, word })),
  ];
  const shown = expanded ? items : items.slice(0, LIMITS.foldChips);
  const hidden = expanded
    ? 0
    : items.length - shown.length + suggestions.length;

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label={t.search.chips}
        className="relative flex flex-wrap items-center gap-2 pt-2"
      >
        {shown.map((x) =>
          x.chip ? (
            <ChipButton
              key={x.key}
              chip={x.chip}
              isNew={newChipIds.includes(x.chip.id)}
            />
          ) : (
            <WordChip key={x.key} label={x.word} query={x.word} />
          ),
        )}
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
        <WordSetDialog />
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
              {suggestions.map((token) => {
                const word = wordOf(token);
                return word ? (
                  <WordChip
                    key={token}
                    label={word.label[lang]}
                    query={token}
                  />
                ) : (
                  <SuggestChip key={token} token={token} />
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
