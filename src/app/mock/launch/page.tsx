"use client";
// MOCK: 破棄予定（#61）
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ENGINE_LABEL } from "../_parts/data";
import { useStore } from "../_parts/store";
import { savedText } from "../_parts/query";
import { EmptyState } from "../_parts/ui";

/** S9 ランチャー。ページを開いただけではタブを開かず、［すべて開く］のクリックを起点にする */
export default function LaunchPage() {
  const s = useStore();
  const g = s.groups[1] ?? s.groups[0];
  const [state, setState] = useState<null | { ok: number; ng: number }>(null);
  const [block, setBlock] = useState(false);

  if (!g)
    return (
      <main className="mx-auto max-w-xl space-y-3 p-4">
        <EmptyState text="ブックマークURLを読み込めませんでした">
          <Link href="/mock" className={buttonVariants({ size: "sm" })}>
            ホームへ
          </Link>
        </EmptyState>
      </main>
    );
  // いつものエゴサは検索文字列のコピーを持つので、お気に入りの削除・変更の影響を受けない
  const favs = g.items;

  return (
    <main className="mx-auto max-w-xl space-y-3 p-4">
      <h1 className="text-xl font-bold">いつものエゴサ：{g.name}</h1>
      <p className="text-sm">{favs.length}件の検索を新しいタブで開きます</p>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={block}
          onChange={(ev) => setBlock(ev.target.checked)}
        />
        ポップアップがブロックされた状態を試す（モック用）
      </label>
      <Button
        size="lg"
        onClick={() => {
          const ng = block ? Math.max(favs.length - 1, 0) : 0;
          setState({ ok: favs.length - ng, ng });
          if (!block) s.runGroup(g.id);
        }}
      >
        ▶ すべて開く
      </Button>
      {state && state.ng > 0 && (
        <div role="status" className="space-y-1 rounded border p-3 text-sm">
          <p>
            {state.ok}個のタブを開き、{state.ng}個は開けませんでした。
          </p>
          <p>
            ブラウザのポップアップを許可してから、もう一度［すべて開く］を押してください。下の個別リンクからも開けます。
          </p>
        </div>
      )}
      <ol className="space-y-2">
        {favs.map((f, i) => (
          <li
            key={`${f.label}${i}`}
            className="flex items-center gap-2 rounded-lg border p-2 text-sm"
          >
            <span>{i + 1}.</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {f.label}（
                {f.engine === "yahoo" ? ENGINE_LABEL.Yahoo : ENGINE_LABEL.X}）
              </div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {savedText(f)}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => s.say(`「${f.label}」を開きました（ダミー）`)}
            >
              開く
            </Button>
          </li>
        ))}
      </ol>
      <Link href="/mock" className={buttonVariants({ variant: "outline" })}>
        ホームで開く（新規として保存）
      </Link>
    </main>
  );
}
