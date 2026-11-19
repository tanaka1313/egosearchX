"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { OpenTarget } from "@/api";
import { useAppStore } from "@/store/store-context";
import { BlockedContext } from "./blocked-context";
import { BlockedNotice } from "./blocked-notice";
import { CommandPalette } from "./command-palette";
import { CorruptNotice } from "./corrupt-notice";
import { GroupStrip } from "./group-strip";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SiteMeta } from "./site-meta";
import { rememberPath } from "./previous-path";
import { MenuDrawer, MenuSidebar } from "./site-menu";
import { ToastProvider } from "./toast";

const DRAWER_ID = "site-drawer";
/** ランチャー（S9）。画面に集中させるため、フッターを出さない（帯は出す。画面仕様書 2章） */
const LAUNCHER_PATH = "/launch";

type Blocked = { total: number; blocked: OpenTarget[] };

/**
 * 全ページ共通の枠組み（画面仕様書 2章）。上から ヘッダー → いつものエゴサの帯 → ブロック時の表示 →
 * 保存データが壊れているときの表示 → 本文、画面の下にフッター。1280px 以上は左にサイドバー、未満は［≡］のドロワー。
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const launcher = pathname === LAUNCHER_PATH;
  const ready = useAppStore((s) => s.status === "ready");
  const trashLoad = useAppStore((s) => s.trash_load);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const paletteReturnRef = useRef<HTMLElement | null>(null);

  // キャンセルの戻り先（S3-E・S4-E）のために、表示したページを覚える（画面仕様書 9章）
  useEffect(() => rememberPath(pathname), [pathname]);

  // メニューの「削除済み」の件数のために、読み込みが終わったら一度だけ削除済みを読む
  useEffect(() => {
    if (ready) trashLoad().catch(console.error);
  }, [ready, trashLoad]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    toggleRef.current?.focus();
  }, []);

  // 開くと［×］にフォーカス。Esc で閉じて［≡］へ戻す。
  // メニューの中のダイアログ（バージョン情報）が Esc を処理したときは（`defaultPrevented`）、メニューは閉じない
  useEffect(() => {
    if (!menuOpen) return;
    closeRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && !ev.defaultPrevented) closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  // コマンドパレットを開く。閉じたときにフォーカスを戻す先（今フォーカスのある要素）を覚える
  const openPalette = useCallback(() => {
    paletteReturnRef.current = document.activeElement as HTMLElement | null;
    setPaletteOpen(true);
  }, []);

  // Ctrl/⌘+K（Shift・Alt なし。押しっぱなしと日本語入力の変換中は除く）。ブラウザの既定（Firefox の開発ツールなど）は
  // Shift 付きに割り当てられている。確認ダイアログなど、ほかのダイアログが開いている間は開かない
  // （フォーカスの囲いが二重になり、後ろの画面で Enter が実行されるのを避ける）
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (
        ev.key.toLowerCase() !== "k" ||
        !(ev.ctrlKey || ev.metaKey) ||
        ev.shiftKey ||
        ev.altKey ||
        ev.repeat ||
        ev.isComposing
      )
        return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]'))
        return;
      ev.preventDefault();
      if (menuOpen) closeMenu();
      openPalette();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu, openPalette]);

  const onBlocked = useCallback(
    (total: number, list: OpenTarget[]) => setBlocked({ total, blocked: list }),
    [],
  );

  return (
    <ToastProvider bottomClass={launcher ? "bottom-4" : "bottom-20"}>
      <SiteMeta />
      <div className="flex min-h-screen">
        <MenuSidebar onPalette={openPalette} />
        <div className={`min-w-0 flex-1 ${launcher ? "" : "pb-20"}`}>
          <SiteHeader
            toggleRef={toggleRef}
            menuOpen={menuOpen}
            menuId={DRAWER_ID}
            onOpenMenu={() => setMenuOpen(true)}
          />
          <GroupStrip onBlocked={onBlocked} />
          {blocked && (
            <BlockedNotice
              total={blocked.total}
              blocked={blocked.blocked}
              onClose={() => setBlocked(null)}
            />
          )}
          <CorruptNotice />
          <BlockedContext.Provider value={onBlocked}>
            {children}
          </BlockedContext.Provider>
        </div>
        {!launcher && <SiteFooter onBlocked={onBlocked} />}
        {menuOpen && (
          <MenuDrawer
            id={DRAWER_ID}
            closeRef={closeRef}
            onClose={closeMenu}
            onPalette={() => {
              closeMenu();
              openPalette();
            }}
          />
        )}
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          returnRef={paletteReturnRef}
          onBlocked={onBlocked}
        />
      </div>
    </ToastProvider>
  );
}
