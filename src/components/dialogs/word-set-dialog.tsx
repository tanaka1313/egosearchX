"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useRef, useState } from "react";
import { WordChip } from "@/components/search/chip-button";
import { QueryPreview } from "@/components/search/query-preview";
import { useSearchScope } from "@/components/search/search-scope";
import { useI18n } from "@/store/i18n-context";

/**
 * 検索ワード集（D4。画面仕様書 3.12）。選ぶためのダイアログ（確認ではない）。
 * 起点のボタン［検索ワード集］を含む（`Dialog.Trigger` なので、閉じると起点へフォーカスが戻る）。
 * - 開いたとき［×］にフォーカスを置く。Esc・外側・［×］・［閉じる］で閉じる。ON にしても閉じない。
 * - 本文は、今の興味の対象のグループ（チャンネル単位）ごとに見出し（画面の言語のグループ名）とボタンを並べる。
 *   本文だけがスクロールし、下端（スクロールの外）にクエリ表示と［閉じる］を置く。
 * - ボタンは `suggestionTokens`（この検索にだけ ON/OFF）を切り替える。ON の状態は画面ごとに持つ。
 */
export function WordSetDialog() {
  const { t, lang } = useI18n();
  const { wordSet } = useSearchScope();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  const groups = wordSet
    .map((g) => ({
      name: g.name[lang],
      words: g.words.filter((w) => w.label.includes(q) || w.query.includes(q)),
    }))
    .filter((g) => g.words.length > 0);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQ("");
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          className="rounded-full border px-3 py-1 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.search.wordSet.open}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(ev) => {
            ev.preventDefault();
            closeRef.current?.focus();
          }}
          className="fixed top-1/2 left-1/2 z-[60] flex max-h-[85vh] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl border bg-background p-3 shadow-xl outline-none"
        >
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="font-bold">
              {t.search.wordSet.title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                ref={closeRef}
                type="button"
                aria-label={t.search.wordSet.close}
                className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <input
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            aria-label={t.search.wordSet.filterLabel}
            placeholder={t.search.wordSet.filterPlaceholder}
            className="w-full rounded-lg border px-3 py-2"
          />
          <div className="min-h-0 flex-1 space-y-3 overflow-auto">
            {groups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t.search.wordSet.none}
              </p>
            )}
            {groups.map((g) => (
              <section key={g.name} aria-label={g.name} className="space-y-2">
                <h3 className="text-xs text-muted-foreground">{g.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {g.words.map((w) => (
                    <WordChip key={w.query} label={w.label} query={w.query} />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="space-y-2 border-t pt-3">
            <QueryPreview />
            <div className="flex justify-end">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg border px-4 py-1.5 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t.search.wordSet.close}
                </button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
