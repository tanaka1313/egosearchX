"use client";

import { Clock, Plus, Star } from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { DEFAULT_PREFS, type GroupItem, type HistoryItem } from "@/api";
import { engineBadge } from "@/components/common/engine-badge";
import { useToast } from "@/components/common/toast";
import { TONE, type ToneKind } from "@/components/common/tone";
import { Button } from "@/components/ui/button";
import { formatRunAt } from "@/lib/format-date";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

type Source = "favorites" | "history" | "make";
const SOURCES: { id: Source; tone: ToneKind; icon: typeof Star }[] = [
  { id: "favorites", tone: "fav", icon: Star },
  { id: "history", tone: "history", icon: Clock },
  { id: "make", tone: "cond", icon: Plus },
];

/**
 * S4-E の「追加する」（画面仕様書 5.5）。［お気に入り］［履歴］［新しく作る］の切替。
 * お気に入り・履歴は、高さ固定でスクロールする一覧（切り替えても下の部品は動かない）。
 * ［新しく作る］は中身（検索語・条件の枠・詳細条件）が多いので、そのタブだけ高さを自由にして `maker` を出す。押した行は、追加のあとも同じ位置に残る。
 * 履歴から足すときは、同じ検索文字列のお気に入りが無ければ新しく作ってから足す（あれば作らない）。
 * 履歴の文字列は日付に展開済みなので、足した項目の期間は固定になる（#91）。
 */
export function AddSources({
  groupName,
  items,
  onAdd,
  onRemove,
  maker,
}: {
  groupName: string;
  /** 今このいつものエゴサに入っている項目（追加済みの判定に使う） */
  items: readonly GroupItem[];
  onAdd: (item: GroupItem) => void;
  /** 追加済みの行の［削除］ */
  onRemove: (item: GroupItem) => void;
  /** ［新しく作る］のタブの中身（検索の組み立て） */
  maker: ReactNode;
}) {
  const api = useApi();
  const { t } = useI18n();
  // 正規化した検索文字列が同じなら追加済み（要件定義書 11.4。検索先は見ない）。
  // 項目の検索先を変えても、元のお気に入りの行が［＋ 追加］に戻らないようにする
  const added = useMemo(
    () => new Set(items.map((it) => api.query.normalize(it.query))),
    [api, items],
  );
  const isAdded = (it: GroupItem) => added.has(api.query.normalize(it.query));
  const ed = t.groupEdit;
  const [active, setActive] = useState<Source>("favorites");
  const refs = useRef<Record<Source, HTMLButtonElement | null>>({
    favorites: null,
    history: null,
    make: null,
  });

  const go = (to: Source) => {
    setActive(to);
    refs.current[to]?.focus();
  };
  const onKey = (ev: KeyboardEvent) => {
    const i = SOURCES.findIndex((s) => s.id === active);
    const n = SOURCES.length;
    const to =
      ev.key === "ArrowRight"
        ? SOURCES[(i + 1) % n]
        : ev.key === "ArrowLeft"
          ? SOURCES[(i + n - 1) % n]
          : ev.key === "Home"
            ? SOURCES[0]
            : ev.key === "End"
              ? SOURCES[n - 1]
              : null;
    if (!to) return;
    ev.preventDefault();
    go(to.id);
  };

  return (
    <section aria-label={ed.addSource} className="space-y-2 text-sm">
      <h2 className="font-medium">{ed.addSource}</h2>
      <div
        role="tablist"
        aria-label={ed.sourceTabs}
        onKeyDown={onKey}
        className="flex gap-1 border-b"
      >
        {SOURCES.map(({ id, tone, icon: Icon }) => {
          const on = id === active;
          return (
            <button
              key={id}
              ref={(el) => {
                refs.current[id] = el;
              }}
              id={`add-source-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="add-source-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-1.5 focus-visible:ring-2 focus-visible:ring-ring ${
                on
                  ? `${TONE[tone].tabOn} font-bold`
                  : "border-b-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className={`size-4 ${TONE[tone].icon}`} aria-hidden />
              {id === "favorites"
                ? ed.tabFavorites
                : id === "history"
                  ? ed.tabHistory
                  : ed.tabMake}
            </button>
          );
        })}
      </div>
      {/* お気に入り・履歴は高さ固定：切り替えても、件数が増えても、下の部品が動かない。作るタブだけ高さ自由 */}
      <div
        role="tabpanel"
        id="add-source-panel"
        aria-labelledby={`add-source-tab-${active}`}
        tabIndex={0}
        className={
          active === "make"
            ? "rounded-lg border p-3 focus-visible:ring-2 focus-visible:ring-ring"
            : "h-64 overflow-y-auto rounded-lg border focus-visible:ring-2 focus-visible:ring-ring"
        }
      >
        {active === "favorites" ? (
          <FavoriteList isAdded={isAdded} onAdd={onAdd} onRemove={onRemove} />
        ) : active === "history" ? (
          <HistoryList
            groupName={groupName}
            isAdded={isAdded}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ) : (
          maker
        )}
      </div>
    </section>
  );
}

function Row({
  tone,
  name,
  engine,
  sub,
  note,
  addLabel,
  added,
  onAdd,
  onRemove,
}: {
  tone: ToneKind;
  name: string;
  engine: GroupItem["engine"];
  sub: string;
  note?: string | null;
  addLabel: string;
  /** 追加済み（［削除］にする） */
  added: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const b = engineBadge(engine);
  const Icon = tone === "fav" ? Star : Clock;
  return (
    <li className="flex items-center gap-2 px-2 py-1.5">
      <Icon className={`size-4 shrink-0 ${TONE[tone].icon}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 truncate" title={name}>
            {name}
          </span>
          <span
            title={t.groupEdit.engineBadge(b.full)}
            aria-label={t.groupEdit.engineBadge(b.full)}
            className="shrink-0 rounded border px-1 text-xs whitespace-nowrap"
          >
            {b.short}
          </span>
          {note && (
            <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
              {note}
            </span>
          )}
        </span>
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {sub || t.home.noCondition}
        </span>
      </span>
      {/* 幅は固定（［＋ 追加］と［削除］で切り替わっても、行の中身がずれない） */}
      <Button
        type="button"
        size="xs"
        variant="outline"
        className="w-16 shrink-0"
        aria-label={added ? t.groupEdit.removeLabel(name) : addLabel}
        onClick={added ? onRemove : onAdd}
      >
        {added ? t.groupEdit.remove : t.groupEdit.add}
      </Button>
    </li>
  );
}

function FavoriteList({
  isAdded,
  onAdd,
  onRemove,
}: {
  isAdded: (item: GroupItem) => boolean;
  onAdd: (item: GroupItem) => void;
  onRemove: (item: GroupItem) => void;
}) {
  const { t } = useI18n();
  const ed = t.groupEdit;
  const favorites = useAppStore((s) => s.favorites);
  if (favorites.length === 0)
    return <p className="p-3 text-muted-foreground">{ed.noFavorites}</p>;
  return (
    <ul aria-label={ed.tabFavorites} className="divide-y">
      {favorites.map((f) => (
        <Row
          key={f.id}
          tone="fav"
          name={f.name}
          engine={f.engine}
          sub={f.query}
          addLabel={ed.addLabel(f.name)}
          added={isAdded(f)}
          onAdd={() => onAdd({ query: f.query, engine: f.engine })}
          onRemove={() => onRemove({ query: f.query, engine: f.engine })}
        />
      ))}
    </ul>
  );
}

function HistoryList({
  groupName,
  isAdded,
  onAdd,
  onRemove,
}: {
  groupName: string;
  isAdded: (item: GroupItem) => boolean;
  onAdd: (item: GroupItem) => void;
  onRemove: (item: GroupItem) => void;
}) {
  const api = useApi();
  const { t } = useI18n();
  const ed = t.groupEdit;
  const toast = useToast();
  const history = useAppStore((s) => s.history);
  const favorites = useAppStore((s) => s.favorites);
  const allChips = useAppStore((s) => s.chips);
  const interest = useAppStore(
    (s) => s.prefs?.interest ?? DEFAULT_PREFS.interest,
  );
  const saveFavorite = useAppStore((s) => s.favorites_save);

  // 同じ検索文字列（正規化）と検索先は1件にまとめる。履歴は新しい順なので、先に出たものを残す
  const rows = useMemo(() => {
    const chips = allChips.get(interest) ?? [];
    const seen = new Set<string>();
    const out: {
      h: HistoryItem;
      key: string;
      label: string;
      base: string;
      isFav: boolean;
    }[] = [];
    for (const h of history) {
      const key = `${api.query.normalize(h.query)}\u0000${h.engine}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const parsed = api.query.parse(h.query, chips);
      const on = new Set(parsed.onChipIds);
      const base =
        parsed.word.trim() || (chips.find((c) => on.has(c.id))?.label ?? "");
      const favName = api.query.favName(h.query, favorites);
      out.push({
        h,
        key,
        label: favName ?? (base || h.query),
        base,
        isFav: favName !== null,
      });
    }
    return out;
  }, [api, history, favorites, allChips, interest]);

  const add = async (r: (typeof rows)[number]) => {
    try {
      // 同じ検索文字列のお気に入りが既にあれば、作らずに項目だけ足す
      if (!r.isFav)
        await saveFavorite({
          name: ed.autoName(groupName.trim(), r.base) || ed.defaultFavoriteName,
          query: r.h.query,
          engine: r.h.engine,
        });
      onAdd({ query: r.h.query, engine: r.h.engine });
    } catch (e) {
      console.error(e);
      toast.show(ed.failed);
    }
  };

  if (rows.length === 0)
    return <p className="p-3 text-muted-foreground">{t.historyPage.empty}</p>;
  return (
    <ul aria-label={ed.tabHistory} className="divide-y">
      {rows.map((r) => (
        <Row
          key={r.key}
          tone="history"
          name={r.label}
          engine={r.h.engine}
          sub={r.h.query}
          note={formatRunAt(r.h.at)}
          addLabel={ed.addLabel(r.label)}
          added={isAdded(r.h)}
          onAdd={() => void add(r)}
          onRemove={() => onRemove({ query: r.h.query, engine: r.h.engine })}
        />
      ))}
    </ul>
  );
}
