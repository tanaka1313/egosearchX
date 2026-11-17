"use client";
// MOCK: 破棄予定（#61）
import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MENU } from "./data";
import { useStore } from "./store";

function MenuList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { trash } = useStore();
  return (
    <ul className="space-y-1">
      {MENU.map((m) => {
        const here = path === m.href;
        return (
          <li key={m.href}>
            <Link
              href={m.href}
              onClick={onNavigate}
              aria-current={here ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-3 py-3 text-base hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring ${here ? "bg-muted font-bold" : ""}`}
            >
              <span className="flex-1">{m.label}</span>
              {m.label === "削除済み" && trash.length > 0 && (
                <span className="rounded-full border px-2 text-xs">
                  {trash.length}
                </span>
              )}
              {here && <span className="text-xs">表示中</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { toast } = useStore();

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setPalette(true);
      } else if (ev.key === "Escape") {
        setPalette(false);
        setOpen((o) => {
          if (o) toggleRef.current?.focus();
          return false;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)]">
      {/* 1280px 以上は常時表示のサイドバー */}
      <aside
        aria-label="メニュー（常時表示）"
        className="hidden w-64 shrink-0 border-r p-3 xl:block"
      >
        <p className="mb-3 px-3 font-bold">EgoSearch Studio</p>
        <MenuList />
      </aside>

      <div className="min-w-0 flex-1">
        {/* ヘッダーは sticky にしない（バナーの下に潜らせない） */}
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <button
            ref={toggleRef}
            aria-expanded={open}
            aria-controls="mock6-drawer"
            aria-label="メニューを開く"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
          >
            <Menu className="size-6" />
          </button>
          <Link href="/mock/mock6" className="font-bold">
            EgoSearch
          </Link>
          <button
            onClick={() => setPalette(true)}
            aria-label="コマンドパレットを開く（Ctrl/⌘+K）"
            className="ml-auto flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">検索・実行</span>
            <kbd className="hidden rounded border px-1 text-xs md:inline">
              Ctrl/⌘+K
            </kbd>
          </button>
        </header>
        {children}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex xl:hidden">
          <nav
            id="mock6-drawer"
            aria-label="メニュー"
            className="flex h-full w-[70%] max-w-[22.5rem] flex-col overflow-auto border-r bg-background p-3 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold">EgoSearch Studio</span>
              <button
                ref={closeRef}
                aria-label="メニューを閉じる"
                onClick={close}
                className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-5" />
              </button>
            </div>
            <MenuList onNavigate={() => setOpen(false)} />
          </nav>
          <button
            aria-label="メニューの外を押して閉じる"
            tabIndex={-1}
            onClick={close}
            className="flex-1 bg-black/40"
          />
        </div>
      )}

      {palette && <Palette onClose={() => setPalette(false)} />}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-foreground px-4 py-3 text-sm text-background shadow-xl"
        >
          <span className="flex-1">{toast.msg}</span>
          {toast.undo && (
            <button
              onClick={toast.undo}
              className="rounded border border-background/50 px-2 py-1 font-bold underline"
            >
              元に戻す
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const { favs, groups, runFav, runGroup } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const items = [
    ...groups.map((g) => ({
      key: `g${g.id}`,
      label: `▶ グループ：${g.name}（${g.favIds.length}個）`,
      run: () => runGroup(g.id),
    })),
    ...favs.map((f) => ({
      key: `f${f.id}`,
      label: `▶ お気に入り：${f.name}`,
      run: () => runFav(f.id),
    })),
    ...MENU.map((m) => ({
      key: `m${m.href}`,
      label: `→ ${m.label}へ移動`,
      run: () => router.push(m.href),
    })),
  ].filter((i) => i.label.includes(q));

  const go = (run: () => void) => {
    run();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-24"
      onClick={onClose}
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
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && items[0]) go(items[0].run);
          }}
          aria-label="実行・移動先を絞り込み"
          placeholder="名前を入力、Enter で実行、Esc で閉じる"
          className="w-full rounded-lg border px-3 py-2"
        />
        <ul className="mt-2 max-h-80 space-y-1 overflow-auto">
          {items.map((i) => (
            <li key={i.key}>
              <button
                onClick={() => go(i.run)}
                className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                {i.label}
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-2 py-1 text-sm text-muted-foreground">
              該当なし
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
