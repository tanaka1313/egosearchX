"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { DEFAULT_PREFS, type Engine, type Favorite } from "@/api";
import { EmptyState } from "@/components/common/empty-state";
import { EnginePicker } from "@/components/common/engine-picker";
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

/** 一覧（S3）。直接開いた（遷移前の記録が無い）ときの戻り先 */
const LIST_PATH = "/favorites";

/**
 * S3-E：お気に入りの編集（画面仕様書 5.3）。保存している文字列を、今の対象の条件ボタン（「表示」のもの）に当てはめて
 * ホームと同じ部品に展開して直す。保存すると文字列に組み立て直して上書きし、編集前と同じ文字列を持つ
 * いつものエゴサの項目も更新する（要件定義書 11.4）。
 */
export function FavoriteEditPage() {
  return (
    // `useSearchParams` を使う画面は、静的書き出しのために Suspense で包む
    <Suspense fallback={<Loading />}>
      <FavoriteEditRoute />
    </Suspense>
  );
}

function Loading() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-2xl p-3 text-sm md:p-4">
      {t.favoriteEdit.loading}
    </main>
  );
}

function FavoriteEditRoute() {
  const { t } = useI18n();
  const id = useSearchParams().get("id");
  const ready = useAppStore((s) => s.status === "ready");
  const favorites = useAppStore((s) => s.favorites);
  const fav = favorites.find((f) => f.id === id);

  // 読み込みが済む前は、「見つからない」とも判定せず、展開もしない（空の条件ボタンに当てはめて固定してしまうため）。
  // 壊れたデータ（CORRUPT）は、帯の下の共通の表示（画面仕様書 2.7）に任せる
  if (!ready) return <Loading />;
  if (!fav)
    return (
      <main className="mx-auto max-w-2xl p-3 md:p-4">
        <EmptyState text={t.favoriteEdit.notFound}>
          <Link href={LIST_PATH} className="text-sm underline">
            {t.favoriteEdit.backToList}
          </Link>
        </EmptyState>
      </main>
    );
  return <FavoriteEditor key={fav.id} fav={fav} />;
}

function FavoriteEditor({ fav }: { fav: Favorite }) {
  const api = useApi();
  const interest = useAppStore(
    (s) => s.prefs?.interest ?? DEFAULT_PREFS.interest,
  );
  const allChips = useAppStore((s) => s.chips);
  // 開いたときの条件ボタンで1回だけ展開する（編集中にボタンを直しても、組み立ては変えない）
  const [initial] = useState(() =>
    api.query.parse(fav.query, allChips.get(interest) ?? []),
  );
  return (
    <LocalScopeProvider initial={initial}>
      <EditorBody fav={fav} />
    </LocalScopeProvider>
  );
}

function EditorBody({ fav }: { fav: Favorite }) {
  const api = useApi();
  const { t, lang } = useI18n();
  const ed = t.favoriteEdit;
  const router = useRouter();
  const toast = useToast();
  const scope = useSearchScope();
  const interest = useAppStore(
    (s) => s.prefs?.interest ?? DEFAULT_PREFS.interest,
  );
  const groups = useAppStore((s) => s.groups);
  const update = useAppStore((s) => s.favorites_update);
  const create = useAppStore((s) => s.favorites_save);
  const undo = useAppStore((s) => s.undo);

  const [name, setName] = useState(fav.name);
  const [engine, setEngine] = useState<Engine>(fav.engine);
  const [error, setError] = useState("");

  // このお気に入りと同じ検索文字列（正規化して比べる）を持つ、いつものエゴサの項目
  const related = useMemo(() => {
    const key = api.query.normalize(fav.query);
    return groups
      .map((g) => ({
        name: g.name,
        count: g.items.filter((it) => api.query.normalize(it.query) === key)
          .length,
      }))
      .filter((g) => g.count > 0);
  }, [api, groups, fav.query]);
  const interestLabel = api.master.interests().get(interest)?.label[lang] ?? "";

  const back = () => router.push(previousPath(LIST_PATH));

  /** 保存・複製できない理由（名前が空、検索語も条件も無い、期間が逆） */
  const invalid = (): string | null => {
    if (!name.trim()) return ed.nameRequired;
    const b = scope.built.blockers[0];
    return b ? t.issues[b.code](b.params ?? {}) : null;
  };
  const fail = (e: unknown) => {
    console.error(e);
    setError(ed.failed);
  };

  const save = async () => {
    const reason = invalid();
    if (reason) return setError(reason);
    setError("");
    try {
      const res = await update(fav.id, {
        name: name.trim(),
        query: scope.built.stored,
        engine,
      });
      if (res.count > 0)
        toast.show(ed.groupsUpdated(res.count), () => {
          undo(res.undo).catch(console.error);
        });
      else toast.show(ed.saved);
      back();
    } catch (e) {
      fail(e);
    }
  };

  const duplicate = async () => {
    const reason = invalid();
    if (reason) return setError(reason);
    setError("");
    try {
      // 名前は画面が辞書で作る（言語で変わる文言を裏側に作らせない。api-spec 4.5）。いつものエゴサは更新しない
      await create({
        name: ed.duplicateName(name.trim()),
        query: scope.built.stored,
        engine,
      });
      toast.show(ed.duplicated);
      back();
    } catch (e) {
      fail(e);
    }
  };

  // 見出しの右と末尾に、同じ操作を置く（ページが長い）。青の塗りつぶしは保存だけ
  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {error}
        </p>
      )}
      <Button size="sm" variant="outline" onClick={duplicate}>
        {ed.duplicate}
      </Button>
      <Button size="sm" variant="outline" onClick={back}>
        {ed.cancel}
      </Button>
      <Button size="sm" onClick={save}>
        {ed.save}
      </Button>
    </div>
  );

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-3 md:p-4">
      <PageHead title={ed.title} right={actions} />

      {/* 名前と検索先を1枚のカードに（お気に入りの色） */}
      <div className={`space-y-3 rounded-lg border p-3 ${TONE.fav.card}`}>
        <label className="block space-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Star className={`size-4 ${TONE.fav.icon}`} aria-hidden />
            {ed.name}
          </span>
          <input
            value={name}
            onChange={(ev) => {
              setName(ev.target.value);
              setError("");
            }}
            className="w-full rounded-lg border bg-field px-3 py-2"
          />
        </label>
        <EnginePicker value={engine} onChange={setEngine} />
      </div>

      <section
        aria-label={ed.before}
        className="space-y-1 rounded-lg border p-3 text-sm"
      >
        <h2 className="font-medium">{ed.before}</h2>
        <code className="block rounded bg-muted p-2 font-mono text-xs break-all">
          {fav.query || ed.noCondition}
        </code>
        <p className="text-xs text-muted-foreground">
          {ed.expanded(interestLabel)}
        </p>
        <p className="text-xs text-muted-foreground">
          {related.length > 0
            ? ed.related(
                related
                  .map((g) => ed.relatedItem(g.name, g.count))
                  .join(ed.relatedSeparator),
              )
            : ed.relatedNone}
        </p>
      </section>

      <section aria-label={ed.build} className="space-y-2">
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
        {/* 保存せずに開いて確かめられる。この画面の主な操作は保存なので、青は保存だけ */}
        <div className="flex gap-2">
          <OpenButtons primary={false} />
        </div>
        <ConditionFrame
          footer={
            <div className="flex gap-2">
              <OpenButtons primary={false} />
            </div>
          }
        />
      </section>

      <div className="border-t pt-3">{actions}</div>
    </main>
  );
}
