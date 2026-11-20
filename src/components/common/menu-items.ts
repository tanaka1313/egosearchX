import type { Messages } from "@/messages";

export type MenuItem = {
  /** 辞書のキー（`t.menu.items[key]`） */
  key: keyof Messages["menu"]["items"];
  href: string;
  /** 管理ページ（追加・編集・削除ができる）。歯車を付け、読み上げは「〇〇の管理」 */
  manage: boolean;
};

/**
 * 左メニューのページ項目（画面仕様書 2.4）。定義はここ1か所。
 * コマンドパレット（#81）の「→ <ページ>へ移動」も、これを使う。
 */
export const MENU_ITEMS: readonly MenuItem[] = [
  { key: "home", href: "/", manage: false },
  { key: "buttons", href: "/buttons", manage: true },
  { key: "favorites", href: "/favorites", manage: true },
  { key: "groups", href: "/groups", manage: true },
  { key: "history", href: "/history", manage: false },
  { key: "trash", href: "/trash", manage: false },
  { key: "import", href: "/import", manage: false },
  { key: "settings", href: "/settings", manage: false },
  { key: "about", href: "/about", manage: false },
];
