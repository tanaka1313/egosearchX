"use client";
// MOCK: 破棄予定（#61）
// お気に入りの編集ページ（/mock/favorites/edit?id=<id>）。以前は検索文字列のテキスト欄のシートだった。
// お気に入りの本体は検索文字列なので、開いたときに文字列を解析して、ホームと同じ検索の組み立て
// （条件ボタンの ON・検索語・完全一致・期間・詳細条件）に展開する（parseToScope）。
// 照合するのは今の興味の対象の条件ボタンだけで、当たらなかった条件は詳細条件に入る（内容は欠けない）。
// 保存すると文字列に組み立て直し、編集前と同じ文字列（正規化して比較）を持つ、いつものエゴサの項目も更新する。
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConditionFrame } from "../../_parts/condition-frame";
import { INTERESTS, type Engine, type Favorite } from "../../_parts/data";
import { EnginePicker } from "../../_parts/engine-picker";
import { OpenButtons, QueryPreview } from "../../_parts/open-bar";
import { periodInverted, toMockScope } from "../../_parts/query";
import { normalize, parseToScope } from "@/lib/query/model";
import { LocalScopeProvider, useSearchScope } from "../../_parts/search-scope";
import { previousPath } from "../../_parts/shell";
import { nid, useStore } from "../../_parts/store";
import { EmptyState, PageHead } from "../../_parts/ui";

export default function FavoriteEditPage() {
  return (
    <Suspense fallback={<main className="p-4 text-sm">読み込み中…</main>}>
      <FavoriteEditRoute />
    </Suspense>
  );
}

function FavoriteEditRoute() {
  const id = useSearchParams().get("id");
  const { favs } = useStore();
  const fav = favs.find((f) => f.id === id);
  if (!fav)
    return (
      <main className="mx-auto max-w-2xl p-3 md:p-4">
        <EmptyState text="このお気に入りは見つかりません（削除済みの可能性があります）">
          <Link href="/mock/favorites" className="text-sm underline">
            お気に入りの一覧へ
          </Link>
        </EmptyState>
      </main>
    );
  return <FavoriteEditor key={fav.id} fav={fav} />;
}

function FavoriteEditor({ fav }: { fav: Favorite }) {
  const { chips } = useStore();
  // 開いたときの条件ボタンで1回だけ展開する（編集中にボタンを直しても、組み立ては変えない）
  const [initial] = useState(() => toMockScope(parseToScope(fav.query, chips)));
  return (
    <LocalScopeProvider source="お気に入りの編集" initial={initial}>
      <EditorBody fav={fav} />
    </LocalScopeProvider>
  );
}

function EditorBody({ fav }: { fav: Favorite }) {
  const s = useStore();
  const router = useRouter();
  const scope = useSearchScope();
  const [name, setName] = useState(fav.name);
  const [engine, setEngine] = useState<Engine>(fav.engine);
  const [err, setErr] = useState("");

  // このお気に入りと同じ検索文字列（正規化して比較）を持つ、いつものエゴサの項目
  const related = useMemo(() => {
    const key = normalize(fav.query);
    return s.groups
      .map((g) => ({
        name: g.name,
        count: g.items.filter((it) => normalize(it.query) === key).length,
      }))
      .filter((g) => g.count > 0);
  }, [s.groups, fav.query]);

  const back = () => router.push(previousPath("/mock/favorites"));

  const validate = (): string | null => {
    if (!name.trim()) return "名前を入力してください";
    if (!scope.query.stored) return "検索語か条件ボタンを1つ以上選んでください";
    if (periodInverted(scope.period)) return "開始日が終了日より後です";
    return null;
  };

  const save = () => {
    const e = validate();
    if (e) return setErr(e);
    // 文字列に組み立て直して保存する（関連するいつものエゴサの更新はストアの saveFav が行う）
    s.saveFav({
      ...fav,
      name: name.trim(),
      query: scope.query.stored,
      engine,
    });
    back();
  };

  const duplicate = () => {
    const e = validate();
    if (e) return setErr(e);
    s.saveFav({
      id: nid("f"),
      name: `${name.trim()}（複製）`,
      query: scope.query.stored,
      engine,
      last: "未実行",
    });
    back();
  };

  // 保存・キャンセル（ページが長いので、見出しの右と末尾の2か所に同じものを置く）
  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {err && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {err}
        </p>
      )}
      <Button size="sm" variant="outline" onClick={duplicate}>
        複製
      </Button>
      <Button size="sm" variant="outline" onClick={back}>
        キャンセル
      </Button>
      <Button size="sm" onClick={save}>
        保存
      </Button>
    </div>
  );

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-3 md:p-4">
      <PageHead title="お気に入りを編集" right={actions} />

      <label className="block space-y-1 text-sm">
        <span className="font-medium">名前</span>
        <input
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
      </label>

      <EnginePicker value={engine} onChange={setEngine} />

      <section
        aria-label="保存している検索文字列"
        className="space-y-1 text-sm"
      >
        <h2 className="font-medium">保存している検索文字列（編集前）</h2>
        <code className="block rounded bg-muted p-2 font-mono text-xs break-all">
          {fav.query || "（条件なし）"}
        </code>
        <p className="text-xs text-muted-foreground">
          「{INTERESTS[s.interest]?.label}
          」の条件ボタンに当てはめて展開しました。当てはまらなかった条件は詳細条件に入っています。
        </p>
        <p className="text-xs text-muted-foreground">
          {related.length > 0
            ? `同じ検索文字列の項目が、いつものエゴサ（${related
                .map((g) => `「${g.name}」${g.count}件`)
                .join("、")}）にあります。保存すると一緒に更新されます。`
            : "この検索文字列を持つ、いつものエゴサはありません。"}
        </p>
      </section>

      <section aria-label="検索の組み立て" className="space-y-2">
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
        {/* 保存せずに開いて結果を確かめられる（この画面の主な操作は保存なので、青は保存だけ） */}
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

      {/* ページの末尾にも保存・キャンセル（見出しの右と同じ操作） */}
      <div className="border-t pt-3">{actions}</div>
    </main>
  );
}
