"use client";
// MOCK: 破棄予定（#61）
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { ChipRow } from "./_parts/chips";
import { DetailPanel } from "./_parts/detail-panel";
import { OpenBar } from "./_parts/open-bar";
import { PeriodPicker } from "./_parts/period-picker";
import { favQuery } from "./_parts/rows";
import { useStore } from "./_parts/store";
import { EmptyState } from "./_parts/ui";

const FAV_OPEN_KEY = "mock:favOpen:v1";

const favOpenListeners = new Set<() => void>();
function subscribeFavOpen(fn: () => void) {
  favOpenListeners.add(fn);
  return () => {
    favOpenListeners.delete(fn);
  };
}

/** お気に入り：閉じた1行。開くと「押して実行」だけの一覧。開閉は localStorage に記憶する */
function FavoritesFold() {
  const s = useStore();
  // サーバー側は閉じた状態（ハイドレーションのずれを避ける）。クライアントで localStorage を読む
  const open = useSyncExternalStore(
    subscribeFavOpen,
    () => localStorage.getItem(FAV_OPEN_KEY) === "1",
    () => false,
  );
  const toggle = () => {
    localStorage.setItem(FAV_OPEN_KEY, open ? "0" : "1");
    favOpenListeners.forEach((fn) => fn());
  };
  return (
    <section aria-label="お気に入り" className="border-t pt-3">
      <button
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        <span>☆ お気に入り（{s.favs.length}）</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {s.favs.length === 0 && (
            <EmptyState text="条件を触って気に入ったら ☆ 保存 でここに入ります" />
          )}
          <ul className="space-y-2">
            {s.favs.slice(0, 4).map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-2 rounded-lg border p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{f.name}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {favQuery(f).text || "（条件なし）"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => s.runFav(f.id)}
                >
                  ▶ 実行
                </Button>
              </li>
            ))}
          </ul>
          <Link
            href="/mock/favorites"
            className="block text-right text-sm text-muted-foreground underline underline-offset-4"
          >
            お気に入りを編集 →
          </Link>
        </div>
      )}
    </section>
  );
}

export default function MockHome() {
  const s = useStore();

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-3 md:p-4">
      {/* このサイトを作った理由（1〜2文）。くわしくはメニューの「このサイトについて」 */}
      <p className="text-sm text-muted-foreground">
        SNS
        の検索は毎日するのに、検索コマンドを覚えておく場所がない。その負担を減らしたくて作りました。
        <Link
          href="/mock/about"
          className="ml-1 whitespace-nowrap underline underline-offset-4"
        >
          詳しく →
        </Link>
      </p>

      {/* 入力 → クエリ → 開くボタン を1かたまりにして、つながりを見せる */}
      <section aria-label="検索" className="space-y-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={s.word}
            onChange={(ev) => s.setWord(ev.target.value)}
            onKeyDown={(ev) => {
              // 日本語入力の確定の Enter では開かない
              if (
                ev.key === "Enter" &&
                !ev.nativeEvent.isComposing &&
                ev.keyCode !== 229
              )
                s.run("X", "ホーム");
            }}
            aria-label="検索する語"
            placeholder="名前や #タグ を入力（Enter で X で開く）"
            className="w-full rounded-full border-2 bg-background py-2.5 pr-4 pl-11 text-lg"
          />
        </div>
        <OpenBar />
      </section>

      {/* 条件ボタン・期間・詳細条件は同じ「条件」の領域。1つの枠で囲む */}
      <section
        aria-label="条件"
        className="space-y-3 rounded-xl border bg-muted/20 p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">条件</h2>
          {/* ON/OFF の設定なので、ボタンではなくチェックボックス＋ラベル */}
          <label className="flex shrink-0 items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={s.exact}
              onChange={(ev) => s.setExact(ev.target.checked)}
              className="size-4"
            />
            完全一致
          </label>
        </div>

        <ChipRow />

        {/* 詳細条件の「期間」と同じ状態（s.period）を共有する */}
        <PeriodPicker value={s.period} onChange={s.setPeriod} />

        <DetailPanel />
      </section>

      <FavoritesFold />
    </main>
  );
}
