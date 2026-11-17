"use client";
// MOCK: 破棄予定（#61）
// いつものエゴサの追加・編集ページ（以前は右側のシート。詳細条件まで使うため、幅のある専用ページにした）。
// 新しく作るときは /mock/groups/edit、編集は /mock/groups/edit?id=<id>。
// 中身（検索）の入れ方は2つ：①お気に入りから追加（コピー）②条件を指定して新しく作る。
// ②はホームと同じ部品（ConditionFrame・QueryPreview など）を、ページの中だけの状態（LocalScopeProvider）で使う。
// 条件ボタンの ON はホームに影響しない。作った検索はお気に入りにも保存し、名前は「<いつものエゴサ名>：<検索語または1つ目のボタン名>」。
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConditionFrame } from "../../_parts/condition-frame";
import {
  favToItem,
  type Engine,
  type Group,
  type SavedSearch,
} from "../../_parts/data";
import { EnginePicker } from "../../_parts/engine-picker";
import { OpenButtons, QueryPreview } from "../../_parts/open-bar";
import {
  periodInverted,
  queryWithoutPeriod,
  savedText,
} from "../../_parts/query";
import { LocalScopeProvider, useSearchScope } from "../../_parts/search-scope";
import { previousPath } from "../../_parts/shell";
import { nid, useStore } from "../../_parts/store";
import { EmptyState, PageHead } from "../../_parts/ui";

export default function GroupEditPage() {
  return (
    <Suspense fallback={<main className="p-4 text-sm">読み込み中…</main>}>
      <GroupEditRoute />
    </Suspense>
  );
}

function GroupEditRoute() {
  const id = useSearchParams().get("id");
  const { groups } = useStore();
  if (!id) return <GroupEditor key="new" group={null} />;
  const group = groups.find((g) => g.id === id);
  if (!group)
    return (
      <main className="mx-auto max-w-2xl p-3 md:p-4">
        <EmptyState text="このいつものエゴサは見つかりません（削除済みの可能性があります）">
          <Link href="/mock/groups" className="text-sm underline">
            いつものエゴサの一覧へ
          </Link>
        </EmptyState>
      </main>
    );
  return <GroupEditor key={group.id} group={group} />;
}

function GroupEditor({ group }: { group: Group | null }) {
  const s = useStore();
  const router = useRouter();
  const [name, setName] = useState(group?.name ?? "");
  const [items, setItems] = useState<SavedSearch[]>(group?.items ?? []);
  const [err, setErr] = useState("");
  // 作り終えたら組み立てを空に戻す（LocalScopeProvider を作り直す）
  const [makerKey, setMakerKey] = useState(0);

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    setItems(n);
  };

  const save = () => {
    if (!name.trim()) return setErr("名前を入力してください");
    if (!items.length) return setErr("検索を1つ以上入れてください");
    s.saveGroup({
      id: group?.id ?? nid("g"),
      name: name.trim(),
      items,
      doneToday: group?.doneToday ?? false,
    });
    router.push("/mock/groups");
  };

  // 保存・キャンセル（ページが長いので、見出しの右と末尾の2か所に同じものを置く）
  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {err && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {err}
        </p>
      )}
      {/* 遷移前の画面へ戻る（帯の［＋］から来たらそのページへ。直接開いたときは一覧へ） */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => router.push(previousPath("/mock/groups"))}
      >
        キャンセル
      </Button>
      <Button size="sm" onClick={save}>
        保存
      </Button>
    </div>
  );

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-3 md:p-4">
      <PageHead
        title={group ? "いつものエゴサを編集" : "いつものエゴサを追加"}
        right={actions}
      />

      <label className="block space-y-1 text-sm">
        <span className="font-medium">名前</span>
        <input
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          placeholder="例：配信後エゴサ"
          className="w-full rounded-lg border px-3 py-2"
        />
      </label>

      <section aria-label="中身の検索" className="space-y-1 text-sm">
        <h2 className="font-medium">
          中身の検索（{items.length}個。順に開きます）
        </h2>
        {items.length === 0 && (
          <p className="text-muted-foreground">
            まだありません。下の①か②で追加してください。
          </p>
        )}
        <ol className="space-y-1">
          {items.map((it, i) => (
            <li
              key={`${it.label}${i}`}
              className="flex items-center gap-1 rounded border px-2 py-1"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  {i + 1}. {it.label}
                </span>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {savedText(it) || "（条件なし）"}
                </span>
              </span>
              <button
                aria-label={`${it.label}を上へ`}
                onClick={() => move(i, -1)}
                className="px-1 focus-visible:ring-2 focus-visible:ring-ring"
              >
                ↑
              </button>
              <button
                aria-label={`${it.label}を下へ`}
                onClick={() => move(i, 1)}
                className="px-1 focus-visible:ring-2 focus-visible:ring-ring"
              >
                ↓
              </button>
              <button
                aria-label={`${it.label}を外す`}
                onClick={() => setItems(items.filter((_, j) => j !== i))}
                className="px-1 focus-visible:ring-2 focus-visible:ring-ring"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="お気に入りから追加" className="space-y-1 text-sm">
        <h2 className="font-medium">①お気に入りから追加（コピーします）</h2>
        {s.favs.length === 0 && (
          <p className="text-muted-foreground">
            お気に入りがありません。下の②で作れます。
          </p>
        )}
        {s.favs.map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setItems((v) => [...v, favToItem(f)])}
            >
              ＋ 追加
            </Button>
          </div>
        ))}
      </section>

      <section aria-label="条件を指定して新しく作る" className="space-y-2">
        <h2 className="text-sm font-medium">②条件を指定して新しく作る</h2>
        <LocalScopeProvider key={makerKey} source="いつものエゴサの編集">
          <NewSearchMaker
            groupName={name}
            onMade={(item) => {
              setItems((v) => [...v, item]);
              setMakerKey((k) => k + 1);
            }}
          />
        </LocalScopeProvider>
      </section>

      {/* ページの末尾にも保存・キャンセル（見出しの右と同じ操作） */}
      <div className="border-t pt-3">{actions}</div>
    </main>
  );
}

/**
 * ②の検索の組み立て。ホームと同じ並び（入力 → クエリ表示 → 操作）と同じ「条件」の枠を使う。
 * 操作は［X で開く］［Yahoo で開く］（保存せずに試す。ホームと同じ部品）＋［お気に入りに保存して追加］。詳細条件の末尾にも同じ操作を置く。
 */
function NewSearchMaker({
  groupName,
  onMade,
}: {
  groupName: string;
  onMade: (item: SavedSearch) => void;
}) {
  const s = useStore();
  const scope = useSearchScope();
  const [err, setErr] = useState("");
  const [engine, setEngine] = useState<Engine>("x");
  const firstChip = scope.usedChips[0]?.label ?? "";
  const base = scope.word.trim() || firstChip;
  const autoName = [groupName.trim(), base].filter(Boolean).join("：");

  const make = () => {
    if (!scope.query.text)
      return setErr("検索語か条件ボタンを1つ以上選んでください");
    if (periodInverted(scope.period)) return setErr("開始日が終了日より後です");
    const fav = {
      id: nid("f"),
      name: autoName || "新しい検索",
      query: queryWithoutPeriod(scope.query, scope.period),
      period: scope.period,
      engine,
      last: "未実行",
    };
    s.saveFav(fav);
    onMade(favToItem(fav));
  };

  // 追加の前に、保存せずに X／Yahoo!リアルタイム検索で開いて結果を確かめられる（この画面の主な操作は追加なので、青は追加だけ）
  const action = (
    <div className="space-y-2">
      <div className="flex gap-2">
        <OpenButtons primary={false} />
      </div>
      {/* 詳細条件の末尾にも同じ action を置くので、検索先も同じ状態を共有する */}
      <EnginePicker value={engine} onChange={setEngine} />
      <Button className="w-full" onClick={make}>
        お気に入りに保存して追加
      </Button>
      {err && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {err}
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
            setErr("");
          }}
          aria-label="検索する語"
          placeholder="名前や #タグ を入力"
          className="w-full rounded-full border-2 px-4 py-2"
        />
        <QueryPreview />
        <p className="text-xs text-muted-foreground">
          お気に入りにも保存されます。名前は自動で付きます：
          <span className="font-medium">
            {autoName || "（検索語を入れると決まります）"}
          </span>
        </p>
        {action}
      </div>
      <ConditionFrame footer={action} />
    </div>
  );
}
