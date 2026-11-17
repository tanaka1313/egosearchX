"use client";
// MOCK: 破棄予定（#61）
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PRESETS, QUERY_X } from "../_components/dummy";
import { Mono } from "../_components/mock-dialog";

const SOURCES = [
  {
    label: "Top 10 Transformative Web Design Trends for 2026（clay.global）",
    href: "https://clay.global/blog/web-design-guide/web-design-trends",
  },
  {
    label: "17 Web Design Trends for 2026（designrush.com）",
    href: "https://www.designrush.com/agency/website-design-development/trends/web-design-trends",
  },
];

export default function Mock4() {
  const [palette, setPalette] = useState(false);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setPalette(true);
      } else if (ev.key === "Escape") {
        setPalette(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (palette) inputRef.current?.focus();
  }, [palette]);

  const hits = PRESETS.filter((p) => p.name.includes(filter));
  const open = (name: string) => {
    setMsg(`「${name}」を開きました（ダミー）`);
    setPalette(false);
    setFilter("");
  };

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">ダッシュボード</h1>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => setPalette(true)}
        >
          <Search className="size-4" /> コマンド検索
          <kbd className="ml-1 rounded border px-1 text-xs">Ctrl/⌘+K</kbd>
        </Button>
      </div>

      <div className="grid auto-rows-[9rem] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <section className="rounded-2xl border p-4 sm:col-span-2 sm:row-span-2">
          <h2 className="font-bold">クイック検索</h2>
          <input
            aria-label="検索する語"
            defaultValue="メンバーA"
            className="mt-2 w-full rounded-lg border px-3 py-2"
          />
          <div className="mt-2">
            <Mono>{QUERY_X}</Mono>
          </div>
          <Button
            className="mt-3"
            onClick={() => setMsg("X で開きました（ダミー）")}
          >
            X で開く
          </Button>
        </section>

        {PRESETS.map((p) => (
          <section
            key={p.id}
            className="flex flex-col justify-between rounded-2xl border p-4"
          >
            <div>
              <h2 className="text-sm font-bold">{p.name}</h2>
              <p className="text-xs text-muted-foreground">
                {p.engines.join("/")}　最終 {p.last}
                {p.warn && "　⚠ 警告あり"}
              </p>
            </div>
            <Button size="sm" onClick={() => open(p.name)}>
              実行
            </Button>
          </section>
        ))}

        <section className="rounded-2xl border p-4 lg:col-span-2">
          <h2 className="font-bold">検索セット：毎朝のエゴサ</h2>
          <p className="text-sm text-muted-foreground">
            3件を新しいタブで開きます
          </p>
          <Button
            className="mt-2"
            onClick={() => setMsg("3個のタブを開きました（ダミー）")}
          >
            ▶ すべて開く
          </Button>
        </section>

        <section className="rounded-2xl border p-4">
          <h2 className="font-bold">警告</h2>
          <p className="text-sm">
            ⚠ 2件：list: は Yahoo では使えません（ダミー）
          </p>
        </section>

        <section className="rounded-2xl border p-4">
          <h2 className="font-bold">マスタ</h2>
          <p className="text-sm">サンプル事務所 ／ 箱A ／ メンバー 3名</p>
        </section>
      </div>

      {msg && (
        <p role="status" className="rounded border bg-muted px-3 py-2 text-sm">
          {msg}
        </p>
      )}

      <footer className="border-t pt-3 text-xs text-muted-foreground">
        デザインの出典（2026年のトレンドとして Bento Grid
        とコマンドパレットが挙げられている）：
        <ul className="list-disc pl-5">
          {SOURCES.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </footer>

      {palette && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4 pt-24"
          onClick={() => setPalette(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="コマンドパレット"
            className="w-full max-w-md rounded-xl border bg-background p-3 shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={filter}
              onChange={(ev) => setFilter(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" && hits[0]) open(hits[0].name);
              }}
              aria-label="プリセットを絞り込み"
              placeholder="プリセット名を入力、Enter で実行、Esc で閉じる"
              className="w-full rounded border px-3 py-2"
            />
            <ul className="mt-2 space-y-1">
              {hits.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => open(p.name)}
                    className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                  >
                    ▶ {p.name}
                  </button>
                </li>
              ))}
              {hits.length === 0 && (
                <li className="px-2 py-1 text-sm text-muted-foreground">
                  該当なし
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
