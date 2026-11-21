"use client";

import { Star, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { DEFAULT_PREFS, LIMITS, type WordGroup } from "@/api";
import {
  DIALOG_OVERLAY,
  DIALOG_PANEL,
} from "@/components/common/dialog-styles";
import {
  COMMON_TONE,
  toneOfGens,
  type GenTone,
} from "@/components/common/gen-tone";
import { useToast } from "@/components/common/toast";
import { WordChip } from "@/components/search/chip-button";
import { QueryPreview } from "@/components/search/query-preview";
import { useSearchScope } from "@/components/search/search-scope";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

/** 「その他」タブ（すべてのグループ）。マイ配信者のタブの ID はグループ名（日本語）なので、ぶつからない記号にする */
const OTHER = "\u0000other";
const NO_STARS: string[] = [];

/**
 * 検索ワード集（D4。画面仕様書 3.12）。選ぶためのダイアログ（確認ではない）。
 * 起点のボタン［検索ワード集］を含む（`Dialog.Trigger` なので、閉じると起点へフォーカスが戻る）。
 * - 開いたとき［×］にフォーカスを置く。Esc・外側・［×］・［閉じる］で閉じる。ON にしても閉じない。
 * - タブ：マイ配信者（★）ごとに1つと、［その他］（すべてのグループ）。★のタブはその配信者のグループだけ、
 *   ［その他］は 共通 → ★ → ★と同じ期 → 残り の順（並びは開いたとき・タブを切り替えたときに決め、★を押しても動かさない）。
 * - グループは枠で囲み、期ごとの色の太線と見出しの帯、期の名前（文字）で区別する。配信者のグループの見出しに★の切替を置く。
 * - 本文だけがスクロールし、下端（スクロールの外）にクエリ表示と［閉じる］を置く。
 * - ボタンは `suggestionTokens`（この検索にだけ ON/OFF）を切り替える。ON の状態は画面ごとに持つ。
 */
export function WordSetDialog() {
  const { t, lang } = useI18n();
  const api = useApi();
  const { wordSet } = useSearchScope();
  const toast = useToast();
  const interest = useAppStore(
    (s) => s.prefs?.interest ?? DEFAULT_PREFS.interest,
  );
  const allStars = useAppStore((s) => s.prefs?.stars ?? DEFAULT_PREFS.stars);
  const setPrefs = useAppStore((s) => s.prefs_set);
  const stars = allStars[interest] ?? NO_STARS;

  const streamers = useMemo(
    () => api.master.streamers(interest),
    [api, interest],
  );
  const genNames = useMemo(
    () => api.master.generations().map((g) => g.name.ja),
    [api],
  );
  const genLabel = (ja: string) =>
    api.master.generations().find((g) => g.name.ja === ja)?.name[lang] ?? ja;
  const streamerNames = useMemo(
    () => new Set(streamers.map((g) => g.name.ja)),
    [streamers],
  );
  const common = wordSet.filter((g) => !streamerNames.has(g.name.ja));

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>(OTHER);
  /** 「その他」の並びを決めるときの★（開いたとき・タブを切り替えたときの値） */
  const [snap, setSnap] = useState<string[]>(NO_STARS);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const active = tab === OTHER || stars.includes(tab) ? tab : OTHER;
  const tabIds = [...stars, OTHER];

  const selectTab = (id: string) => {
    setTab(id);
    setSnap(stars);
  };
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setTab(stars[0] ?? OTHER);
      setSnap(stars);
    } else setQ("");
  };

  const toggleStar = (name: string) => {
    const next = stars.includes(name)
      ? stars.filter((n) => n !== name)
      : [...stars, name];
    setPrefs({ stars: { ...allStars, [interest]: next } }).catch(
      (e: unknown) => {
        console.error(e);
        toast.show(t.toast.saveFailed);
      },
    );
  };

  const cards: WordGroup[] = useMemo(() => {
    if (active !== OTHER) return streamers.filter((g) => g.name.ja === active);
    const snapGens = new Set(
      snap.flatMap((n) => streamers.find((g) => g.name.ja === n)?.gens ?? []),
    );
    const rank = (g: WordGroup) =>
      snap.includes(g.name.ja)
        ? 0
        : g.gens.some((x) => snapGens.has(x))
          ? 1
          : 2;
    const sorted = streamers
      .map((g, i) => ({ g, i }))
      .sort(
        (a, b) =>
          rank(a.g) - rank(b.g) ||
          (rank(a.g) === 0
            ? snap.indexOf(a.g.name.ja) - snap.indexOf(b.g.name.ja)
            : a.i - b.i),
      )
      .map((x) => x.g);
    return [...common, ...sorted];
    // common は wordSet から毎回作る配列なので、中身が変わる元（wordSet・streamers）で見る
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, snap, streamers, wordSet]);

  const shown = cards
    .map((g) => {
      const byName = g.name[lang].includes(q) || g.name.ja.includes(q);
      return {
        g,
        words: byName
          ? g.words
          : g.words.filter(
              (w) => w.label[lang].includes(q) || w.query.includes(q),
            ),
      };
    })
    .filter((x) => x.words.length > 0);

  const onTabKey = (ev: KeyboardEvent) => {
    const i = tabIds.indexOf(active);
    const to =
      ev.key === "ArrowRight"
        ? tabIds[(i + 1) % tabIds.length]
        : ev.key === "ArrowLeft"
          ? tabIds[(i - 1 + tabIds.length) % tabIds.length]
          : ev.key === "Home"
            ? tabIds[0]
            : ev.key === "End"
              ? tabIds[tabIds.length - 1]
              : null;
    if (to === null) return;
    ev.preventDefault();
    selectTab(to);
    tabRefs.current[to]?.focus();
  };

  const atLimit = stars.length >= LIMITS.myStreamers;
  /** DOM の id（グループ名には空白が入るので、番号で作る） */
  const domId = (id: string) =>
    id === OTHER ? "other" : `star-${stars.indexOf(id)}`;
  const tabName = (id: string) =>
    id === OTHER
      ? t.search.wordSet.tabOther
      : (streamers.find((g) => g.name.ja === id)?.name[lang] ?? id);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
        <Dialog.Overlay className={DIALOG_OVERLAY} />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(ev) => {
            ev.preventDefault();
            closeRef.current?.focus();
          }}
          className={`fixed top-1/2 left-1/2 z-[60] flex max-h-[85vh] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl p-3 ${DIALOG_PANEL}`}
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
          <div
            role="tablist"
            aria-label={t.search.wordSet.tabs}
            onKeyDown={onTabKey}
            className="flex flex-wrap gap-1.5"
          >
            {tabIds.map((id) => {
              const on = id === active;
              const g = streamers.find((x) => x.name.ja === id);
              const tone = g ? toneOfGens(g.gens, genNames) : COMMON_TONE;
              return (
                <button
                  key={id}
                  ref={(el) => {
                    tabRefs.current[id] = el;
                  }}
                  id={`word-set-tab-${domId(id)}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="word-set-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => selectTab(id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring ${
                    on
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {g ? (
                    <Star
                      className="size-3.5 fill-current text-amber-400"
                      aria-hidden
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className={`size-2 rounded-full ${tone.dot}`}
                  />
                  {tabName(id)}
                </button>
              );
            })}
          </div>
          <input
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            aria-label={t.search.wordSet.filterLabel}
            placeholder={t.search.wordSet.filterPlaceholder}
            className="w-full rounded-lg border bg-field px-3 py-2"
          />
          <div
            role="tabpanel"
            id="word-set-panel"
            aria-labelledby={`word-set-tab-${domId(active)}`}
            className="min-h-0 flex-1 space-y-3 overflow-auto"
          >
            {active === OTHER && streamers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t.search.wordSet.starCount(stars.length, LIMITS.myStreamers)}
              </p>
            )}
            {shown.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t.search.wordSet.none}
              </p>
            )}
            {shown.map(({ g, words }) => {
              const isStreamer = streamerNames.has(g.name.ja);
              return (
                <GroupCard
                  key={g.name.ja}
                  name={g.name[lang]}
                  gens={g.gens.map(genLabel).join(" / ")}
                  tone={isStreamer ? toneOfGens(g.gens, genNames) : COMMON_TONE}
                  words={words}
                  star={
                    isStreamer
                      ? {
                          on: stars.includes(g.name.ja),
                          disabled: atLimit && !stars.includes(g.name.ja),
                          toggle: () => toggleStar(g.name.ja),
                        }
                      : null
                  }
                />
              );
            })}
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

/**
 * グループのカード：期の色の太線＋見出しの帯（グループ名・期の名前）。配信者のグループは★の切替を右に置く
 * （押すとマイ配信者に入る／外れる。上限のときは、未選択のものだけ押せない）。ボタンの並びはカードの中。
 */
function GroupCard({
  name,
  gens,
  tone,
  words,
  star,
}: {
  name: string;
  gens: string;
  tone: GenTone;
  words: WordGroup["words"];
  star: { on: boolean; disabled: boolean; toggle: () => void } | null;
}) {
  const { t, lang } = useI18n();
  return (
    <section
      aria-label={name}
      className={`overflow-hidden rounded-lg border border-l-[6px] border-border ${tone.bar} bg-background/60`}
    >
      <div className={`flex items-center gap-2 px-3 py-1.5 ${tone.head}`}>
        <h3 className="min-w-0 flex-1 truncate text-sm font-bold">
          {name}
          {gens && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {gens}
            </span>
          )}
        </h3>
        {star && (
          <button
            type="button"
            aria-pressed={star.on}
            aria-label={
              star.on
                ? t.search.wordSet.starRemove(name)
                : t.search.wordSet.starAdd(name)
            }
            title={
              star.disabled
                ? t.search.wordSet.starLimit(LIMITS.myStreamers)
                : undefined
            }
            disabled={star.disabled}
            onClick={star.toggle}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Star
              className={`size-3.5 ${star.on ? "fill-amber-400 text-amber-400" : ""}`}
              aria-hidden
            />
            {t.search.wordSet.myStreamer}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 p-2">
        {words.map((w) => (
          <WordChip key={w.query} label={w.label[lang]} query={w.query} />
        ))}
      </div>
    </section>
  );
}
