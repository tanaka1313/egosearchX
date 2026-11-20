import type { Messages } from "@/messages";

export type MenuItem = {
  /** 辞書のキー（`t.menu.items[key]`） */
  key: keyof Messages["menu"]["items"];
  href: string;
  /** 管理ページ（追加・編集・削除ができる）。歯車を付け、読み上げは「〇〇の管理」 */
  manage: boolean;
};

/** ページへ移動する項目ではなく、操作で開くもの（コマンドパレット、バージョン情報のダイアログ） */
export type MenuAction = { action: "palette" | "version" };

export type MenuSection = {
  /** 見出しの辞書のキー（`t.menu.sections[key]`） */
  key: keyof Messages["menu"]["sections"];
  entries: readonly (MenuItem | MenuAction)[];
};

export const isMenuAction = (e: MenuItem | MenuAction): e is MenuAction =>
  "action" in e;

/** 見出しの上に単独で置くホーム */
export const MENU_HOME: MenuItem = { key: "home", href: "/", manage: false };

/**
 * 左メニューの構成（画面仕様書 2.4）。見出しごとに小さめの文字の項目を並べる。定義はここ1か所。
 * 項目を足すときは、該当する見出しの `entries` に1行足す（コマンドパレットの移動先・ページ名にも反映される）。
 */
export const MENU_SECTIONS: readonly MenuSection[] = [
  {
    key: "data",
    entries: [
      { key: "buttons", href: "/buttons", manage: true },
      { key: "favorites", href: "/favorites", manage: true },
      { key: "groups", href: "/groups", manage: true },
      { key: "history", href: "/history", manage: true },
      { key: "trash", href: "/trash", manage: true },
    ],
  },
  {
    key: "tools",
    entries: [
      { key: "import", href: "/import", manage: false },
      { action: "palette" },
    ],
  },
  {
    key: "other",
    entries: [
      { key: "settings", href: "/settings", manage: false },
      { key: "about", href: "/about", manage: false },
      { action: "version" },
    ],
  },
];

/**
 * ページ項目の一覧（ホーム＋見出しの下のページ）。
 * コマンドパレット（#81）の「→ <ページ>へ移動」と、ページ名の判定が使う。
 */
export const MENU_ITEMS: readonly MenuItem[] = [
  MENU_HOME,
  ...MENU_SECTIONS.flatMap((s) => s.entries.filter((e) => !isMenuAction(e))),
] as readonly MenuItem[];
