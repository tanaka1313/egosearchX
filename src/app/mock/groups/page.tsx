"use client";
// MOCK: 破棄予定（#61）
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LIMITS, type Group } from "../_parts/data";
import { itemLabel } from "../_parts/rows";
import { useStore } from "../_parts/store";
import { EmptyState, PageHead, Sheet } from "../_parts/ui";

/** 追加・編集は専用ページ（/mock/groups/edit）。詳細条件まで使うので、シートにしない */
const addButton = (
  <Button size="sm" asChild>
    <Link href="/mock/groups/edit">＋ 追加</Link>
  </Button>
);

export default function GroupsPage() {
  const s = useStore();
  const [issue, setIssue] = useState<Group | null>(null);

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead title="いつものエゴサ" right={addButton} />
      <p className="text-sm text-muted-foreground">
        エゴサのタイミング（配信後・毎朝など）ごとに、複数の検索をまとめて一括で開けます。先頭2件はどのページでもヘッダー下の帯に並びます。追加は、お気に入りを選んでまとめる方法と、条件を指定して新しく作る方法の2つです。中身は検索文字列の並びです。お気に入りを編集すると、同じ検索文字列の項目も一緒に更新されます（お気に入りを削除しても、ここからは消えません）。
      </p>
      {s.groups.length === 0 ? (
        <EmptyState text="いつものエゴサがありません。「配信後エゴサ」などを作ってみましょう">
          {addButton}
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {s.groups.map((g) => {
            const names = g.items.map((i) => itemLabel(i, s.favs));
            return (
              <li
                key={g.id}
                className="space-y-2 rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">
                    {g.name}（{g.items.length}）
                  </span>
                  <span className="text-xs">
                    {g.doneToday ? "✓ 今日は済" : "□ 今日は未"}
                  </span>
                  <div className="ml-auto flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => s.runGroup(g.id)}
                    >
                      ▶ 一括実行
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIssue(g)}
                    >
                      ブックマークURL
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/mock/groups/edit?id=${g.id}`}>編集</Link>
                    </Button>
                    <button
                      aria-label={`${g.name}を削除`}
                      onClick={() => s.deleteGroup(g.id)}
                      className="rounded px-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {names.join("／") || "（検索がありません）"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {issue && <IssueSheet group={issue} onClose={() => setIssue(null)} />}
    </main>
  );
}

/** M2：ブックマーク URL 発行 */
function IssueSheet({ group, onClose }: { group: Group; onClose: () => void }) {
  const s = useStore();
  const url = `https://example.invalid/launch#v1.${"AAAA".repeat(30)}…（ダミー）`;
  const long = group.items.length * 120 > LIMITS.urlWarn;
  return (
    <Sheet title={`ブックマークURLを発行：${group.name}`} onClose={onClose}>
      <ul className="list-inside list-disc text-sm">
        {group.items.map((item, i) => (
          <li key={`${item.query}${i}`}>{itemLabel(item, s.favs)}</li>
        ))}
      </ul>
      <code className="block rounded bg-muted p-2 font-mono text-xs break-all">
        {url}
      </code>
      {long && (
        <p className="text-sm">
          ⚠ URL が長めです（ダミーの警告）。お気に入りを減らすと短くなります。
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        ブックマークに追加する手順：URL をコピーして、ブックマークの URL
        欄に貼り付けます。
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          閉じる
        </Button>
        <Button
          onClick={() => {
            s.say("ブックマーク用URLをコピーしました");
            onClose();
          }}
        >
          コピー
        </Button>
      </div>
    </Sheet>
  );
}
