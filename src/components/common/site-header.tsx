"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";
import { useI18n } from "@/store/i18n-context";

/**
 * ヘッダー（画面仕様書 2.1）。左から［≡］（1280px 以上はサイドバーが常にあるので出さない）、
 * サイト名「Hololive EgoSearch」（ホームへのリンク）、機能タイトル。`sticky` にしない。
 * 興味の対象の切替は設定ページ（S11）にある。
 */
export function SiteHeader({
  toggleRef,
  menuOpen,
  menuId,
  onOpenMenu,
}: {
  toggleRef: RefObject<HTMLButtonElement | null>;
  menuOpen: boolean;
  menuId: string;
  onOpenMenu: () => void;
}) {
  const { t } = useI18n();
  return (
    <header className="flex items-center gap-2 border-b px-3 py-2">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-label={t.header.openMenu}
        onClick={onOpenMenu}
        className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
      >
        <Menu className="size-6" aria-hidden />
      </button>
      <Link href="/" className="shrink-0 font-bold">
        {t.header.siteName}
      </Link>
      <span
        aria-label={t.header.featureLabel}
        className="min-w-0 truncate rounded-full border px-2.5 py-0.5 text-sm"
      >
        {t.header.feature}
      </span>
    </header>
  );
}
