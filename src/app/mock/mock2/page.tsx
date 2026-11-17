"use client";
// MOCK: 破棄予定（#61）
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PRESETS, QUERY_X, QUERY_YAHOO, URL_X } from "../_components/dummy";
import { Mono } from "../_components/mock-dialog";

const SECTIONS = [
  "プリセット",
  "検索セット",
  "マスタ",
  "共通設定",
  "発行",
] as const;
type Section = (typeof SECTIONS)[number];

export default function Mock2() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>("プリセット");
  const [sel, setSel] = useState(0);
  const [msg, setMsg] = useState("");
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };
  const p = PRESETS[sel];

  return (
    <div className="relative min-h-[calc(100vh-2.5rem)]">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <button
          ref={toggleRef}
          aria-expanded={open}
          aria-controls="mock2-drawer"
          aria-label="メニューを開く"
          onClick={() => setOpen(true)}
          className="rounded p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="truncate font-medium">{p.name}</h1>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          設定はすべて左上のメニューから。ここは編集とプレビューだけです。
        </p>
        <Mono>{QUERY_X}</Mono>
        <Mono>{p.engines.includes("Yahoo") ? QUERY_YAHOO : URL_X}</Mono>
        {p.warn && (
          <p className="rounded border p-2 text-sm">
            ⚠ list: は Yahoo では使えません（ダミー）
          </p>
        )}
        <div className="flex gap-2">
          <Button onClick={() => setMsg(`「${p.name}」を開きました（ダミー）`)}>
            実行
          </Button>
          <Button variant="outline">保存</Button>
        </div>
        {msg && (
          <p
            role="status"
            className="rounded border bg-muted px-3 py-2 text-sm"
          >
            {msg}
          </p>
        )}
      </main>

      {open && (
        <div className="fixed inset-0 z-40 flex">
          <nav
            id="mock2-drawer"
            aria-label="メニュー"
            className="flex h-full w-full flex-col overflow-auto border-r bg-background p-3 shadow-xl sm:w-80"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold">EgoSearch Studio</span>
              <button
                ref={closeRef}
                aria-label="メニューを閉じる"
                onClick={close}
                className="rounded p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-5" />
              </button>
            </div>
            <div
              role="tablist"
              aria-label="項目"
              className="mb-3 flex flex-wrap gap-1"
            >
              {SECTIONS.map((s) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={section === s}
                  onClick={() => setSection(s)}
                  className={`rounded border px-2 py-1 text-sm ${section === s ? "bg-muted font-bold" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="space-y-2 text-sm">
              {section === "プリセット" && (
                <ul className="space-y-1">
                  {PRESETS.map((x, i) => (
                    <li key={x.id}>
                      <button
                        onClick={() => {
                          setSel(i);
                          close();
                        }}
                        className="w-full rounded border px-2 py-2 text-left hover:bg-muted"
                      >
                        {x.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {x.engines.join("/")}
                          {x.warn && " ⚠"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {section === "検索セット" && (
                <>
                  <p>▾ 毎朝のエゴサ（3件）</p>
                  <p>▾ 週次チェック（2件）</p>
                  <Button
                    size="sm"
                    onClick={() => setMsg("3個のタブを開きました（ダミー）")}
                  >
                    ▶ 毎朝のエゴサを一括実行
                  </Button>
                </>
              )}
              {section === "マスタ" && (
                <ul className="pl-2">
                  <li>▾ サンプル事務所（閲覧のみ）</li>
                  <li className="pl-3">▾ 箱A</li>
                  <li className="pl-6">メンバーA</li>
                  <li className="pl-6">メンバーB</li>
                </ul>
              )}
              {section === "共通設定" &&
                ["完全一致：公式アカウント名", "除外：filter:retweets"].map(
                  (t) => (
                    <label
                      key={t}
                      className="flex items-center gap-2 rounded border px-2 py-1"
                    >
                      <input type="checkbox" defaultChecked /> {t}
                    </label>
                  ),
                )}
              {section === "発行" && (
                <>
                  <Mono>https://example.invalid/launch#v1.AAAA…（ダミー）</Mono>
                  <Button size="sm" variant="outline">
                    ブックマーク用URLをコピー
                  </Button>
                </>
              )}
            </div>
          </nav>
          <button
            aria-label="メニューの外を押して閉じる"
            tabIndex={-1}
            onClick={close}
            className="hidden flex-1 bg-black/40 sm:block"
          />
        </div>
      )}
    </div>
  );
}
