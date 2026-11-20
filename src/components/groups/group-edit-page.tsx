"use client";

import { ChevronDown, ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  LIMITS,
  EMPTY_DETAIL,
  EMPTY_PERIOD,
  type Engine,
  type Group,
  type GroupItem,
  type ParsedScope,
} from "@/api";
import { truncateName } from "@/components/common/auto-name";
import { EmptyState } from "@/components/common/empty-state";
import { EnginePicker } from "@/components/common/engine-picker";
import { engineBadge } from "@/components/common/engine-badge";
import { PageHead } from "@/components/common/page-head";
import { previousPath } from "@/components/common/previous-path";
import { useToast } from "@/components/common/toast";
import { TONE } from "@/components/common/tone";
import { ConditionFrame } from "@/components/search/condition-frame";
import { OpenButtons } from "@/components/search/open-bar";
import { QueryPreview } from "@/components/search/query-preview";
import {
  LocalScopeProvider,
  useSearchScope,
} from "@/components/search/search-scope";
import { Button } from "@/components/ui/button";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { AddSources } from "./add-sources";
import { useItemLabel } from "./item-label";

/** 一覧（S4）。保存したあと・直接開いてキャンセルしたときの戻り先 */
const LIST_PATH = "/groups";

/**
 * 並べ替え・削除のあともフォーカスが残るよう、行には内容に依らない安定したキーを持たせる
 * （文字列と位置をキーにすると、入れ替えた行が作り直されて、押したボタンが消える）。保存するときは外す
 */
type KeyedItem = GroupItem & { key: number };
let nextKey = 0;
const keyed = (it: GroupItem): KeyedItem => ({
  query: it.query,
  engine: it.engine,
  key: nextKey++,
});

/** ②の組み立ての初期値（空）。追加するたびに作り直して空に戻す */
const EMPTY_SCOPE: ParsedScope = {
  word: "",
  exact: false,
  onChipIds: [],
  detail: EMPTY_DETAIL,
  period: EMPTY_PERIOD,
};

/**
 * S4-E：いつものエゴサの追加・編集（画面仕様書 5.5）。名前と、中身の検索（順に開く）を持つ。
 * 入れ方は2つ：①お気に入りから追加（文字列と検索先をコピー）②条件を指定して新しく作る（お気に入りにも保存して追加）。
 * 名前・項目は、保存するまでこのページの中だけで持つ。
 */
export function GroupEditPage() {
  return (
    // `useSearchParams` を使う画面は、静的書き出しのために Suspense で包む
    <Suspense fallback={<Loading />}>
      <GroupEditRoute />
    </Suspense>
  );
}

function Loading() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-2xl p-3 text-sm md:p-4">
      {t.groupEdit.loading}
    </main>
  );
}

function GroupEditRoute() {
  const { t } = useI18n();
  const id = useSearchParams().get("id");
  const ready = useAppStore((s) => s.status === "ready");
  const groups = useAppStore((s) => s.groups);

  // 読み込みが済む前は、「見つからない」とも判定しない。
  // 壊れたデータ（CORRUPT）は、帯の下の共通の表示（画面仕様書 2.7）に任せる
  if (!ready) return <Loading />;
  if (!id) return <GroupEditor key="new" group={null} />;
  const group = groups.find((g) => g.id === id);
  if (!group)
    return (
      <main className="mx-auto max-w-2xl p-3 md:p-4">
        <EmptyState text={t.groupEdit.notFound}>
          <Link href={LIST_PATH} className="text-sm underline">
            {t.groupEdit.backToList}
          </Link>
        </EmptyState>
      </main>
    );
  return <GroupEditor key={group.id} group={group} />;
}

function GroupEditor({ group }: { group: Group | null }) {
  const { t } = useI18n();
  const ed = t.groupEdit;
  const router = useRouter();
  const toast = useToast();
  const label = useItemLabel();
  const api = useApi();
  const save = useAppStore((s) => s.groups_save);
  const groupCount = useAppStore((s) => s.groups.length);

  const [name, setName] = useState(group?.name ?? "");
  const [makerOpen, setMakerOpen] = useState(false);
  const [items, setItems] = useState<KeyedItem[]>(() =>
    (group?.items ?? []).map(keyed),
  );
  const [error, setError] = useState("");
  // ②で1件作るたびに、組み立てを空に戻す（LocalScopeProvider を作り直す）
  const [makerKey, setMakerKey] = useState(0);

  // 新規で名前が空のときに付く名前（名前欄のプレースホルダー）。1件目の名前＋ほかN件、中身が無ければ連番
  const autoName = group
    ? ""
    : items.length > 0
      ? ed.autoGroupName(
          truncateName(label(items[0]), LIMITS.autoName),
          items.length - 1,
        )
      : ed.autoGroupNameEmpty(groupCount + 1);

  /** 追加済みの項目を外す（同じ検索文字列・検索先をすべて。お気に入り自体は消さない） */
  const removeItem = (item: GroupItem) => {
    const key = api.query.normalize(item.query);
    setItems((v) =>
      v.filter(
        (it) =>
          !(api.query.normalize(it.query) === key && it.engine === item.engine),
      ),
    );
  };

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  const submit = async () => {
    const finalName = name.trim() || autoName;
    if (!finalName) return setError(ed.nameRequired);
    if (items.length === 0) return setError(ed.itemsRequired);
    setError("");
    try {
      await save({
        id: group?.id,
        name: finalName,
        items: items.map(({ query, engine }) => ({ query, engine })),
      });
      toast.show(ed.saved);
      router.push(LIST_PATH);
    } catch (e) {
      console.error(e);
      setError(ed.failed);
    }
  };

  // ページが長いので、見出しの右と末尾に同じ操作を置く。青の塗りつぶしは保存だけ
  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {error}
        </p>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => router.push(previousPath(LIST_PATH))}
      >
        {ed.cancel}
      </Button>
      <Button size="sm" onClick={() => void submit()}>
        {ed.save}
      </Button>
    </div>
  );

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-3 md:p-4">
      <PageHead title={group ? ed.titleEdit : ed.titleNew} right={actions} />

      <label className="block space-y-1 text-sm">
        <span className="font-medium">{ed.name}</span>
        <input
          value={name}
          onChange={(ev) => {
            setName(ev.target.value);
            setError("");
          }}
          placeholder={autoName}
          className="w-full rounded-lg border bg-field px-3 py-2"
        />
      </label>

      <section
        aria-label={ed.itemsLabel}
        className={`space-y-2 rounded-lg border p-3 text-sm ${TONE.group.card}`}
      >
        <h2 className="flex items-center gap-1.5 font-medium">
          <Play className={`size-4 ${TONE.group.icon}`} aria-hidden />
          {ed.items(items.length)}
        </h2>
        {items.length === 0 && (
          <p className="text-muted-foreground">{ed.itemsEmpty}</p>
        )}
        <ol aria-label={ed.itemsLabel} className="space-y-1">
          {items.map((it, i) => {
            const itemName = label(it);
            const b = engineBadge(it.engine);
            return (
              <li
                key={it.key}
                className="flex items-center gap-1 rounded border bg-background px-2 py-1"
              >
                <span
                  aria-hidden
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${TONE.group.dot}`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1">
                    <span className="min-w-0 truncate" title={itemName}>
                      {itemName}
                    </span>
                    <span
                      title={ed.engineBadge(b.full)}
                      aria-label={ed.engineBadge(b.full)}
                      className="shrink-0 rounded border px-1 text-xs whitespace-nowrap"
                    >
                      {b.short}
                    </span>
                  </span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {it.query || t.home.noCondition}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={ed.up(itemName)}
                  onClick={() => move(i, -1)}
                  className="shrink-0 px-1 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={ed.down(itemName)}
                  onClick={() => move(i, 1)}
                  className="shrink-0 px-1 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={ed.removeItem(itemName)}
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                  className="shrink-0 px-1 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <AddSources
        groupName={name}
        items={items}
        onAdd={(item) => setItems((v) => [...v, keyed(item)])}
        onRemove={removeItem}
      />

      {/* 標準の使い方はお気に入り・履歴から足すこと。条件を指定して作るのは初期は閉じる（開閉は保存しない） */}
      <section aria-label={ed.make} className="space-y-2">
        <button
          type="button"
          aria-expanded={makerOpen}
          aria-controls="group-maker"
          onClick={() => setMakerOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
        >
          {makerOpen ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
          {ed.make}
        </button>
        {makerOpen && (
          <div id="group-maker">
            <LocalScopeProvider key={makerKey} initial={EMPTY_SCOPE}>
              <NewSearchMaker
                groupName={name}
                onMade={(item) => {
                  setItems((v) => [...v, keyed(item)]);
                  setMakerKey((k) => k + 1);
                }}
              />
            </LocalScopeProvider>
          </div>
        )}
      </section>

      <div className="border-t pt-3">{actions}</div>
    </main>
  );
}

/**
 * ②の検索の組み立て。ホームと同じ並び（入力 → クエリ表示 → 操作）と同じ「条件」の枠を使う。
 * 操作は［X で開く］［Yahoo で開く］（保存せずに試す）と、検索先、［お気に入りに保存して追加］。
 * 詳細条件の末尾にも同じ操作を置き、検索先の状態は2か所で共有する。
 */
function NewSearchMaker({
  groupName,
  onMade,
}: {
  groupName: string;
  onMade: (item: GroupItem) => void;
}) {
  const { t } = useI18n();
  const ed = t.groupEdit;
  const scope = useSearchScope();
  const saveFavorite = useAppStore((s) => s.favorites_save);
  const [error, setError] = useState("");
  const [engine, setEngine] = useState<Engine>("x");

  // 名前は「<いつものエゴサ名>：<検索語、無ければ1つ目の ON のボタン名>」（入力済みの値から導く）
  const base = truncateName(
    scope.word.trim() || (scope.usedChips[0]?.label ?? ""),
    LIMITS.autoName,
  );
  const autoName = ed.autoName(groupName.trim(), base);

  const make = async () => {
    // 検索語も条件も無い・期間が逆のときは、追加しない
    const blocker = scope.built.blockers[0];
    if (blocker) return setError(t.issues[blocker.code](blocker.params ?? {}));
    try {
      // 保存するのは検索文字列（相対期間は since:yesterday などの記号のまま）
      const fav = await saveFavorite({
        name: autoName || ed.defaultFavoriteName,
        query: scope.built.stored,
        engine,
      });
      onMade({ query: fav.query, engine: fav.engine });
    } catch (e) {
      console.error(e);
      setError(ed.failed);
    }
  };

  // この画面の主な操作は追加なので、青の塗りつぶしは追加だけ（開くボタンは外枠）
  const action = (
    <div className="space-y-2">
      <div className="flex gap-2">
        <OpenButtons primary={false} />
      </div>
      <EnginePicker value={engine} onChange={setEngine} />
      <Button className="w-full" onClick={() => void make()}>
        {ed.makeAndAdd}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {error}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <input
          value={scope.word}
          onChange={(ev) => {
            scope.setWord(ev.target.value);
            setError("");
          }}
          aria-label={t.home.wordLabel}
          placeholder={ed.wordPlaceholder}
          className="w-full rounded-full border-2 bg-field px-4 py-2"
        />
        <QueryPreview />
        <p className="text-xs text-muted-foreground">
          {ed.autoNameNote}
          <span className="font-medium">{autoName || ed.autoNamePending}</span>
        </p>
        {action}
      </div>
      <ConditionFrame footer={action} />
    </div>
  );
}
