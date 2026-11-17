"use client";
// MOCK: 破棄予定（#61）
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LIMITS, type Group } from "../_parts/data";
import { useStore } from "../_parts/store";
import { EmptyState, PageHead, Sheet } from "../_parts/ui";

export default function GroupsPage() {
  const s = useStore();
  const [editing, setEditing] = useState<Group | "new" | null>(null);
  const [issue, setIssue] = useState<Group | null>(null);

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead
        title="エゴサグループ"
        right={
          <Button size="sm" onClick={() => setEditing("new")}>
            ＋ 新しいグループ
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">
        エゴサのタイミング（配信後・毎朝など）ごとに、お気に入りをまとめて一括で開けます。ホームの一番上に並びます。
      </p>
      {s.groups.length === 0 ? (
        <EmptyState text="グループがありません。「配信後エゴサ」などを作ってみましょう">
          <Button size="sm" onClick={() => setEditing("new")}>
            ＋ 新しいグループ
          </Button>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {s.groups.map((g) => {
            const names = g.favIds
              .map((id) => s.favs.find((f) => f.id === id)?.name)
              .filter(Boolean);
            return (
              <li
                key={g.id}
                className="space-y-2 rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">
                    {g.name}（{g.favIds.length}）
                  </span>
                  <span className="text-xs">
                    {g.doneToday ? "✓ 今日は済" : "□ 今日は未"}
                  </span>
                  <div className="ml-auto flex flex-wrap gap-1">
                    <Button size="sm" onClick={() => s.runGroup(g.id)}>
                      ▶ 一括実行
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIssue(g)}
                    >
                      ブックマークURL
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(g)}
                    >
                      編集
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
                  {names.join("／") || "（お気に入りがありません）"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <GroupEditor
          group={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {issue && <IssueSheet group={issue} onClose={() => setIssue(null)} />}
    </main>
  );
}

function GroupEditor({
  group,
  onClose,
}: {
  group: Group | null;
  onClose: () => void;
}) {
  const s = useStore();
  const [name, setName] = useState(group?.name ?? "");
  const [sel, setSel] = useState<string[]>(group?.favIds ?? []);
  const [err, setErr] = useState("");
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= sel.length) return;
    const n = [...sel];
    [n[i], n[j]] = [n[j], n[i]];
    setSel(n);
  };
  return (
    <Sheet
      title={group ? "グループを編集" : "グループを作る"}
      onClose={onClose}
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">グループ名</span>
        <input
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          placeholder="例：配信後エゴサ"
          className="w-full rounded-lg border px-3 py-2"
        />
      </label>
      <fieldset className="space-y-1 text-sm">
        <legend className="font-medium">含めるお気に入り</legend>
        {s.favs.map((f) => (
          <label key={f.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sel.includes(f.id)}
              onChange={() =>
                setSel(
                  sel.includes(f.id)
                    ? sel.filter((x) => x !== f.id)
                    : [...sel, f.id],
                )
              }
            />
            {f.name}
          </label>
        ))}
      </fieldset>
      {sel.length > 1 && (
        <div className="space-y-1 text-sm">
          <div className="font-medium">開く順</div>
          <ol className="space-y-1">
            {sel.map((id, i) => (
              <li
                key={id}
                className="flex items-center gap-1 rounded border px-2 py-1"
              >
                <span className="flex-1">
                  {i + 1}. {s.favs.find((f) => f.id === id)?.name}
                </span>
                <button
                  aria-label="上へ"
                  onClick={() => move(i, -1)}
                  className="px-1"
                >
                  ↑
                </button>
                <button
                  aria-label="下へ"
                  onClick={() => move(i, 1)}
                  className="px-1"
                >
                  ↓
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      {err && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {err}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          キャンセル
        </Button>
        <Button
          onClick={() => {
            if (!name.trim()) return setErr("グループ名を入力してください");
            if (!sel.length) return setErr("お気に入りを1つ以上選んでください");
            s.saveGroup({
              id: group?.id ?? `g${Date.now()}`,
              name: name.trim(),
              favIds: sel,
              doneToday: group?.doneToday ?? false,
            });
            onClose();
          }}
        >
          保存
        </Button>
      </div>
    </Sheet>
  );
}

/** M2：ブックマーク URL 発行 */
function IssueSheet({ group, onClose }: { group: Group; onClose: () => void }) {
  const s = useStore();
  const url = `https://example.invalid/launch#v1.${"AAAA".repeat(30)}…（ダミー）`;
  const long = group.favIds.length * 120 > LIMITS.urlWarn;
  return (
    <Sheet title={`ブックマークURLを発行：${group.name}`} onClose={onClose}>
      <ul className="list-inside list-disc text-sm">
        {group.favIds.map((id) => (
          <li key={id}>{s.favs.find((f) => f.id === id)?.name}</li>
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
