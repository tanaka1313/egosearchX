"use client";
// MOCK: 破棄予定（#61）
import { Check, Circle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WORD_SET, WORD_SET_GROUPS } from "./data";
import { QueryPreview } from "./open-bar";
import { useSearchScope } from "./search-scope";
import { useStore } from "./store";
import { toggleClass } from "./ui";

/** 検索ワード集のボタン。サジェストと同じ「この検索にだけ」ON/OFF（条件ボタンと同じ見た目・大きさ） */
export function WordButton({ label, query }: { label: string; query: string }) {
  const { sugOn, toggleSuggestion } = useSearchScope();
  const on = sugOn.includes(query);
  return (
    <button
      aria-pressed={on}
      title={query}
      onClick={() => toggleSuggestion(query)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${toggleClass(on)}`}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {on ? (
          <Check className="size-4" aria-label="ON" />
        ) : (
          <Circle className="size-3.5" aria-label="OFF" />
        )}
      </span>
      {label}
    </button>
  );
}

/**
 * 検索ワード集のダイアログ。チャンネルごとの見出しの下に検索ボタンを並べる。
 * 押した結果は下端のクエリ表示（ホームと同じ部品）に出る。Esc／［閉じる］で閉じ、起点のボタンへフォーカスを戻す。
 * 押したときだけ開く（勝手に開かない）。モックは日本語のみ（グループ名の英語は WORD_SET_GROUPS の en）。
 */
export function WordSetDialog({ onClose }: { onClose: () => void }) {
  const { interest } = useStore();
  const [q, setQ] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const items = WORD_SET[interest] ?? [];
  const groups = (WORD_SET_GROUPS[interest] ?? [])
    .map((g) => ({
      ...g,
      items: items.filter(
        (i) =>
          i.groupId === g.id && (i.label.includes(q) || i.query.includes(q)),
      ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="検索ワード集"
        onClick={(ev) => ev.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-3 rounded-xl border bg-background p-3 shadow-xl"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">検索ワード集</h2>
          <button
            ref={closeRef}
            aria-label="閉じる"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" />
          </button>
        </div>
        <input
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          aria-label="検索ワード集を絞り込み"
          placeholder="名前やタグで絞り込み"
          className="w-full rounded-lg border px-3 py-2"
        />
        <div className="min-h-0 flex-1 space-y-3 overflow-auto">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">該当なし</p>
          )}
          {groups.map((g) => (
            <section key={g.id} aria-label={g.ja} className="space-y-2">
              <h3 className="text-xs text-muted-foreground">{g.ja}</h3>
              <div className="flex flex-wrap gap-2">
                {g.items.map((i) => (
                  <WordButton key={i.query} label={i.label} query={i.query} />
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="space-y-2 border-t pt-3">
          <QueryPreview />
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg border px-4 py-1.5 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
