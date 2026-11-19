"use client";

import { Info, Search, Settings2, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { LanguageSwitch } from "./language-switch";
import { MENU_ITEMS } from "./menu-items";
import { VersionDialog } from "./version-dialog";

const ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-base hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

/** ドロワーとサイドバーで共通の項目（画面仕様書 2.4）。縦に並べる */
function MenuList({
  onNavigate,
  onPalette,
}: {
  onNavigate?: () => void;
  onPalette: () => void;
}) {
  const { t } = useI18n();
  const path = usePathname();
  const trashCount = useAppStore((s) => s.trash?.length ?? 0);
  return (
    <ul className="space-y-1">
      {MENU_ITEMS.map((m) => {
        const here = path === m.href;
        const name = t.menu.items[m.key];
        return (
          <li key={m.href}>
            <Link
              href={m.href}
              onClick={onNavigate}
              aria-current={here ? "page" : undefined}
              aria-label={m.manage ? t.menu.manage(name) : undefined}
              title={m.manage ? t.menu.manageTitle(name) : undefined}
              className={`${ITEM_CLASS} ${here ? "bg-muted font-bold" : ""}`}
            >
              <span className="flex-1">{name}</span>
              {/* 管理ページの印（歯車）。文言を足さずに「管理する場所」だと示す */}
              {m.manage && (
                <Settings2
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
              {m.key === "trash" && trashCount > 0 && (
                <span className="rounded-full border px-2 text-xs">
                  {trashCount}
                </span>
              )}
              {here && <span className="text-xs">{t.menu.current}</span>}
            </Link>
          </li>
        );
      })}
      <li>
        <button type="button" onClick={onPalette} className={ITEM_CLASS}>
          <Search className="size-4" aria-hidden />
          <span className="flex-1">{t.palette.title}</span>
          <kbd className="rounded border px-1 text-xs">
            {t.palette.shortcut}
          </kbd>
        </button>
      </li>
      <li>
        <VersionDialog
          trigger={
            <button type="button" className={ITEM_CLASS}>
              <Info className="size-4" aria-hidden />
              <span className="flex-1">{t.version.open}</span>
            </button>
          }
        />
      </li>
      {/* 言語の切替（設定画面は置かない）。初期値はブラウザの言語 */}
      <li className="px-3 pt-3">
        <LanguageSwitch />
      </li>
    </ul>
  );
}

/** 1280px 以上で常に出すサイドバー（同じ項目） */
export function MenuSidebar({ onPalette }: { onPalette: () => void }) {
  const { t } = useI18n();
  return (
    <aside
      aria-label={t.menu.fixedLabel}
      className="hidden w-64 shrink-0 border-r p-3 xl:block"
    >
      <p className="mb-3 px-3 font-bold">Hololive EgoSearch</p>
      <MenuList onPalette={onPalette} />
    </aside>
  );
}

/**
 * 1280px 未満で［≡］から開くドロワー。幅は画面の約70%（最大 360px）、残りは幕で、押すと閉じる。最前面に出す。
 * 開くと［×］にフォーカスする。閉じたときにフォーカスを［≡］へ戻すのは呼び出し側（`onClose`）。
 */
export function MenuDrawer({
  id,
  closeRef,
  onClose,
  onPalette,
}: {
  id: string;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  /** ドロワーを閉じてからパレットを開く（呼び出し側が行う） */
  onPalette: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-[60] flex xl:hidden">
      <nav
        id={id}
        aria-label={t.menu.label}
        className="flex h-full w-[70%] max-w-[22.5rem] flex-col overflow-auto border-r bg-background p-3 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-bold">Hololive EgoSearch</span>
          <button
            ref={closeRef}
            type="button"
            aria-label={t.menu.close}
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <MenuList onPalette={onPalette} onNavigate={onClose} />
      </nav>
      <button
        type="button"
        aria-label={t.menu.closeOutside}
        tabIndex={-1}
        onClick={onClose}
        className="flex-1 bg-black/40"
      />
    </div>
  );
}
