"use client";

import { Settings2, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { LanguageSwitch } from "./language-switch";
import {
  isMenuAction,
  MENU_HOME,
  MENU_SECTIONS,
  type MenuItem,
} from "./menu-items";
import { VersionDialog } from "./version-dialog";

/** ホーム（見出しなし）。見出しの下の項目より大きい文字 */
const ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-lg px-3 py-1 tall:py-2 text-left text-base hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring";
/**
 * 見出しの下の項目：小さめの文字で、行を詰める（iPhone SE でも全部開いたまま収め、項目が増えても収まるように）。
 * 左に余白を足して、見出しの下にあることを示す
 */
const SUB_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-lg py-1 tall:py-2 pr-3 pl-6 text-left text-sm hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring";

/** ドロワーとサイドバーで共通の項目（画面仕様書 2.4）。縦に並べ、見出しごとに分ける */
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

  const pageLink = (m: MenuItem, className: string) => {
    const here = path === m.href;
    const name = t.menu.items[m.key];
    return (
      <Link
        href={m.href}
        onClick={onNavigate}
        aria-current={here ? "page" : undefined}
        aria-label={m.manage ? t.menu.manage(name) : undefined}
        title={
          m.manage
            ? t.menu.manageTitle(name, t.menu.manageActions[m.key] ?? "")
            : undefined
        }
        className={`${className} ${here ? "bg-sidebar-accent font-bold" : ""}`}
      >
        <span className="flex-1">{name}</span>
        {/* 管理ページの印（歯車）。文言を足さずに「管理する場所」だと示す */}
        {m.manage && (
          <Settings2
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
        {m.key === "settings" && (
          <SlidersHorizontal
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
        {m.key === "trash" && trashCount > 0 && (
          <span className="rounded-full border px-2 text-xs">{trashCount}</span>
        )}
        {here && <span className="text-xs">{t.menu.current}</span>}
      </Link>
    );
  };

  return (
    <div className="space-y-0.5">
      <ul>
        <li>{pageLink(MENU_HOME, ITEM_CLASS)}</li>
      </ul>
      {MENU_SECTIONS.map((section) => {
        const headingId = `menu-section-${section.key}`;
        return (
          <section key={section.key} aria-labelledby={headingId}>
            <h2
              id={headingId}
              className="px-3 pt-1 tall:pt-3 pb-0.5 text-xs font-medium text-muted-foreground"
            >
              {t.menu.sections[section.key]}
            </h2>
            <ul>
              {section.entries.map((e) => {
                if (!isMenuAction(e))
                  return <li key={e.href}>{pageLink(e, SUB_ITEM_CLASS)}</li>;
                if (e.action === "palette")
                  return (
                    <li key="palette">
                      <button
                        type="button"
                        onClick={onPalette}
                        className={SUB_ITEM_CLASS}
                      >
                        <span className="flex-1">{t.palette.title}</span>
                        <kbd className="rounded border px-1 text-xs">
                          {t.palette.shortcut}
                        </kbd>
                      </button>
                    </li>
                  );
                return (
                  <li key="version">
                    <VersionDialog
                      trigger={
                        <button type="button" className={SUB_ITEM_CLASS}>
                          <span className="flex-1">{t.version.open}</span>
                        </button>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {/* 言語の切替（設定画面は置かない）。初期値はブラウザの言語 */}
      <div className="px-3 pt-1">
        <LanguageSwitch />
      </div>
    </div>
  );
}

/** 1280px 以上で常に出すサイドバー（同じ項目） */
export function MenuSidebar({ onPalette }: { onPalette: () => void }) {
  const { t } = useI18n();
  return (
    <aside
      aria-label={t.menu.fixedLabel}
      className="hidden w-64 shrink-0 border-r bg-sidebar p-3 xl:sticky xl:top-0 xl:block xl:h-screen xl:self-start xl:overflow-y-auto"
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
        className="flex h-full w-[70%] max-w-[22.5rem] flex-col overflow-auto border-r bg-sidebar p-3 shadow-xl"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="font-bold">Hololive EgoSearch</span>
          <button
            ref={closeRef}
            type="button"
            aria-label={t.menu.close}
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
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
