import type { Messages } from "@/messages";
import { SITE_NAME } from "@/messages/site";
import { MENU_ITEMS } from "./menu-items";

/** 末尾のスラッシュを除く（`/about/` と `/about` を同じページとして扱う） */
function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** メニューに無い下位のページ（編集ページ）。タブの名前は、そのページの見出しの辞書から出す */
const SUB_PAGES: Record<string, (t: Messages) => string> = {
  "/favorites/edit": (t) => t.favoriteEdit.title,
  "/groups/edit": (t) => t.groupEdit.tabTitle,
  "/launch": (t) => t.launchPage.tabTitle,
};

/**
 * ページ名（ブラウザのタブに出す名前）。ホームと、メニューにも下位のページにも無い道は null。
 * 管理ページ（追加・編集・削除）は「〇〇の管理」、ほかはメニューの名前のまま。
 * 見出しは画面ごとの辞書が持つので、ここは変えない。
 */
export function pageName(t: Messages, pathname: string): string | null {
  const path = normalize(pathname);
  const sub = SUB_PAGES[path];
  if (sub) return sub(t);
  const item = MENU_ITEMS.find((m) => m.href === path);
  if (!item || item.href === "/") return null;
  const name = t.menu.items[item.key];
  return item.manage ? t.menu.manage(name) : name;
}

/** `document.title`。ホーム・メニューに無い道は、サイト全体の title（辞書の `meta.title`） */
export function documentTitle(t: Messages, pathname: string): string {
  const name = pageName(t, pathname);
  return name ? `${name}｜${SITE_NAME}` : t.meta.title;
}
