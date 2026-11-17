// MOCK: 破棄予定（#61）
// 上限値は仕様で「今後変更の可能性大」。ここ1か所に集める（requirements F6/F9/F10）。
export const LIMITS = {
  chips: 30,
  trash: 20,
  history: 100,
  foldRows: 2,
  headerGroups: 2,
  urlWarn: 500,
} as const;

export const TODAY = "2026-11-17";
export const YESTERDAY = "2026-11-16";

export type CondKind =
  "word" | "exact" | "exclude" | "list" | "account" | "filter" | "raw";

export const COND_KINDS: { kind: CondKind; label: string; hint: string }[] = [
  { kind: "word", label: "語（通常）", hint: "ぺこら" },
  { kind: "exact", label: "語（完全一致）", hint: "兎田ぺこら" },
  { kind: "exclude", label: "除外", hint: "切り抜き" },
  { kind: "list", label: "リスト", hint: "リストID（数字）" },
  { kind: "account", label: "アカウント", hint: "from:ID / to:ID" },
  { kind: "filter", label: "フィルタ", hint: "-filter:retweets" },
  { kind: "raw", label: "生トークン", hint: "foo:bar" },
];

export type Cond = { id: string; kind: CondKind; value: string };
export type Chip = {
  id: string;
  label: string;
  conds: Cond[];
  on: boolean;
  isNew?: boolean;
  isDefault?: boolean;
};

export type Period = {
  kind: "none" | "today" | "yday" | "last" | "days" | "date";
  days: string;
  from: string;
  to: string;
};

export type Engine = "x" | "yahoo" | "both";
export type Tri = "any" | "inc" | "exc";

export type Detail = {
  exact: string[];
  plain: string[];
  variants: string[];
  exclude: string[];
  from: string;
  to: string;
  mention: string;
  list: string;
  flt: Record<string, Tri>;
  lang: string;
  minFaves: string;
  minRt: string;
  minReplies: string;
  engine: Engine;
  live: boolean;
  /** 共通（条件ボタン）の項目ごとの無効化。無効にした Cond の id */
  disabledConds: string[];
  /** 構造ビューで OFF にしたノード（トークン文字列） */
  offTokens: string[];
  /** テキスト編集で足した生トークン */
  raw: string;
};

export const FILTERS: { key: string; label: string; op: string }[] = [
  { key: "replies", label: "リプライ", op: "filter:replies" },
  { key: "retweets", label: "リポスト", op: "filter:retweets" },
  { key: "quote", label: "引用", op: "filter:quote" },
  { key: "images", label: "画像", op: "filter:images" },
  { key: "videos", label: "動画", op: "filter:videos" },
  { key: "links", label: "リンク", op: "filter:links" },
  { key: "verified", label: "認証済み", op: "filter:verified" },
];

export const EMPTY_DETAIL: Detail = {
  exact: [],
  plain: [],
  variants: [],
  exclude: [],
  from: "",
  to: "",
  mention: "",
  list: "",
  flt: {},
  lang: "",
  minFaves: "",
  minRt: "",
  minReplies: "",
  engine: "x",
  live: false,
  disabledConds: [],
  offTokens: [],
  raw: "",
};

export const EMPTY_PERIOD: Period = {
  kind: "none",
  days: "3",
  from: "",
  to: "",
};

export type Favorite = {
  id: string;
  name: string;
  word: string;
  exact: boolean;
  chipIds: string[];
  /** 個別設定のトークン（保存時点のもの） */
  extra: string[];
  period: Period["kind"];
  engine: Engine;
  last: string;
};

export type Group = {
  id: string;
  name: string;
  favIds: string[];
  doneToday: boolean;
};

export type HistoryItem = {
  id: string;
  at: string;
  word: string;
  query: string;
  engine: "X" | "Yahoo";
  source: string;
  chipLabels: string[];
  note?: string;
};

export type TrashItem =
  | {
      tid: string;
      at: string;
      kind: "chip";
      name: string;
      data: Chip;
      index: number;
    }
  | {
      tid: string;
      at: string;
      kind: "fav";
      name: string;
      data: Favorite;
      index: number;
    }
  | {
      tid: string;
      at: string;
      kind: "group";
      name: string;
      data: Group;
      index: number;
    };

/** 既定リスト（requirements F1）。ID は開発者が確認した値のみ。 */
export const DEFAULT_LISTS = [
  { id: "d-holo", name: "ホロメンから", listId: "1412278227767218179" },
  { id: "d-niji", name: "にじさんじから", listId: "1478366370727608323" },
];

const c = (id: string, kind: CondKind, value: string): Cond => ({
  id,
  kind,
  value,
});

export function defaultChips(): Chip[] {
  return DEFAULT_LISTS.map((l) => ({
    id: l.id,
    label: l.name,
    on: false,
    isDefault: true,
    conds: [c(`${l.id}-c`, "list", l.listId)],
  }));
}

export const INITIAL_CHIPS: Chip[] = [
  {
    id: "k-rt",
    label: "RTを除く",
    on: true,
    conds: [c("k-rt-1", "filter", "-filter:retweets")],
  },
  ...defaultChips(),
  {
    id: "k-spoil",
    label: "ネタバレ除外",
    on: true,
    conds: [
      c("k-spoil-1", "exclude", "ネタバレ語A"),
      c("k-spoil-2", "exclude", "ネタバレ語B"),
    ],
  },
  {
    id: "k-img",
    label: "画像つき",
    on: false,
    conds: [c("k-img-1", "filter", "filter:images")],
  },
  {
    id: "k-reply",
    label: "返信のみ",
    on: false,
    conds: [c("k-reply-1", "filter", "filter:replies")],
  },
  {
    id: "k-haishin",
    label: "配信タグ",
    on: false,
    conds: [c("k-haishin-1", "word", "#配信タグA")],
  },
  {
    id: "k-fanart",
    label: "ファンアート",
    on: false,
    conds: [c("k-fanart-1", "word", "#ファンアートタグA")],
  },
  {
    id: "k-clip",
    label: "切り抜き",
    on: false,
    conds: [c("k-clip-1", "word", "#切り抜きタグA")],
  },
  {
    id: "k-faves",
    label: "反応100以上",
    on: false,
    conds: [c("k-faves-1", "filter", "min_faves:100")],
  },
  {
    id: "k-jp",
    label: "日本語のみ",
    on: false,
    conds: [c("k-jp-1", "filter", "lang:ja")],
  },
  {
    id: "k-nolink",
    label: "リンクなし",
    on: false,
    conds: [c("k-nolink-1", "filter", "-filter:links")],
  },
];

export const INITIAL_FAVORITES: Favorite[] = [
  {
    id: "f-name",
    name: "名前エゴサ",
    word: "メンバーA",
    exact: true,
    chipIds: ["k-rt", "k-spoil"],
    extra: [],
    period: "last",
    engine: "x",
    last: "昨日 22:30",
  },
  {
    id: "f-tag",
    name: "配信タグ",
    word: "",
    exact: false,
    chipIds: ["k-haishin", "k-spoil"],
    extra: [],
    period: "today",
    engine: "x",
    last: "昨日 22:35",
  },
  {
    id: "f-art",
    name: "ファンアート",
    word: "",
    exact: false,
    chipIds: ["k-fanart", "k-img"],
    extra: [],
    period: "today",
    engine: "x",
    last: "3日前",
  },
  {
    id: "f-clip",
    name: "切り抜き",
    word: "",
    exact: false,
    chipIds: ["k-clip"],
    extra: [],
    period: "today",
    engine: "x",
    last: "3日前",
  },
  {
    id: "f-reply",
    name: "ホロメンからのリプライ",
    word: "",
    exact: false,
    chipIds: ["d-holo"],
    extra: ["to:sample_id"],
    period: "last",
    engine: "both",
    last: "未実行",
  },
];

export const INITIAL_GROUPS: Group[] = [
  {
    id: "g-today",
    name: "今日のエゴサ",
    favIds: ["f-name", "f-reply", "f-tag", "f-art", "f-clip"],
    doneToday: true,
  },
  {
    id: "g-after",
    name: "配信後エゴサ",
    favIds: ["f-tag", "f-art", "f-clip"],
    doneToday: false,
  },
];

export const INITIAL_HISTORY: HistoryItem[] = [
  {
    id: "h1",
    at: "昨日 22:35",
    word: "",
    query: "#配信タグA since:2026-11-16 -ネタバレ語A -ネタバレ語B",
    engine: "X",
    source: "グループ「配信後エゴサ」",
    chipLabels: ["配信タグ", "ネタバレ除外"],
  },
  {
    id: "h2",
    at: "昨日 22:30",
    word: "メンバーA",
    query: '"メンバーA" -filter:retweets -ネタバレ語A -ネタバレ語B',
    engine: "X",
    source: "お気に入り「名前エゴサ」",
    chipLabels: ["RTを除く", "ネタバレ除外"],
  },
  {
    id: "h3",
    at: "3日前 08:10",
    word: "メンバーB",
    query: "メンバーB list:1412278227767218179 min_faves:50",
    engine: "X",
    source: "ホーム",
    chipLabels: ["ホロメンから"],
    note: "自動追加：「min_faves:50」",
  },
];

export const MENU = [
  { href: "/mock/mock6", label: "ホーム" },
  { href: "/mock/mock6/buttons", label: "条件ボタンの編集" },
  { href: "/mock/mock6/favorites", label: "お気に入り" },
  { href: "/mock/mock6/groups", label: "エゴサグループ" },
  { href: "/mock/mock6/history", label: "履歴" },
  { href: "/mock/mock6/trash", label: "削除済み" },
  { href: "/mock/mock6/import", label: "URL取り込み" },
  { href: "/mock/mock6/settings", label: "設定" },
] as const;
