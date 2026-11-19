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
import { BlockedNotice } from "./blocked-notice";
import { CorruptNotice } from "./corrupt-notice";
import { GroupStrip } from "./group-strip";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
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
  const launcher = usePathname() === LAUNCHER_PATH;
  const ready = useAppStore((s) => s.status === "ready");
  const trashLoad = useAppStore((s) => s.trash_load);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // メニューの「削除済み」の件数のために、読み込みが終わったら一度だけ削除済みを読む
  useEffect(() => {
    if (ready) trashLoad().catch(console.error);
  }, [ready, trashLoad]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    toggleRef.current?.focus();
  }, []);

  // 開くと［×］にフォーカス。Esc で閉じて［≡］へ戻す
  useEffect(() => {
    if (!menuOpen) return;
    closeRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  const onBlocked = useCallback(
    (total: number, list: OpenTarget[]) => setBlocked({ total, blocked: list }),
    [],
  );

  return (
    <ToastProvider bottomClass={launcher ? "bottom-4" : "bottom-20"}>
      <div className="flex min-h-screen">
        <MenuSidebar />
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
          {children}
        </div>
        {!launcher && <SiteFooter onBlocked={onBlocked} />}
        {menuOpen && (
          <MenuDrawer id={DRAWER_ID} closeRef={closeRef} onClose={closeMenu} />
        )}
      </div>
    </ToastProvider>
  );
}
