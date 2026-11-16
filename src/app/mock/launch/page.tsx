"use client";
// MOCK: 破棄予定（#61）
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PRESETS } from "../_components/dummy";

type State = "ok" | "blocked" | "broken" | "unknown";

export default function MockLaunch() {
  const [state, setState] = useState<State>("ok");

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <div className="flex flex-wrap gap-1 text-xs">
        <span className="py-1 text-muted-foreground">
          表示切替（モック用）：
        </span>
        {(
          [
            ["ok", "通常"],
            ["blocked", "ポップアップ遮断"],
            ["broken", "URLが壊れている"],
            ["unknown", "未知のバージョン"],
          ] as const
        ).map(([k, label]) => (
          <Button
            key={k}
            size="xs"
            variant={state === k ? "default" : "outline"}
            onClick={() => setState(k)}
          >
            {label}
          </Button>
        ))}
      </div>

      {state === "broken" && (
        <section className="rounded border p-4">
          <p>ブックマークURLを読み込めませんでした</p>
          <Link href="/mock" className="underline">
            クイック実行へ
          </Link>
        </section>
      )}
      {state === "unknown" && (
        <section className="rounded border p-4">
          新しい形式のURLです。アプリを更新してください
        </section>
      )}
      {(state === "ok" || state === "blocked") && (
        <>
          <h1 className="text-xl font-bold">検索セット名：毎朝のエゴサ</h1>
          <p className="text-sm">
            {PRESETS.length}件の検索を新しいタブで開きます
          </p>
          <Button onClick={() => setState("blocked")}>▶ すべて開く</Button>
          {state === "blocked" && (
            <p role="status" className="rounded border p-3 text-sm">
              ⚠
              1個開けて、2個が失敗しました。ブラウザのポップアップを許可してから、もう一度［すべて開く］を押してください。下のリンクから個別にも開けます。
            </p>
          )}
          <ol className="space-y-2">
            {PRESETS.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2 text-sm">
                <span>
                  {i + 1}. {p.name}（{p.engines.join("/")}）
                </span>
                <a
                  href="#"
                  onClick={(ev) => ev.preventDefault()}
                  className="ml-auto underline"
                >
                  開く
                </a>
              </li>
            ))}
          </ol>
          <Link
            href="/mock/studio"
            className={buttonVariants({ variant: "outline" })}
          >
            スタジオで編集
          </Link>
        </>
      )}
    </main>
  );
}
