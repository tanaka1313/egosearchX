// MOCK: 破棄予定（#61）
// 上限値は仕様で「今後変更の可能性大」。ここ1か所に集める（requirements F6/F9/F10）。
export const LIMITS = {
  chips: 30,
  /** 削除済み：条件ボタン・お気に入り・いつものエゴサの「種類ごと」の保持数 */
  trash: 20,
  history: 100,
  /** サジェスト検索条件の表示数（「もっと開く」の後だけ表示） */
  suggest: 20,
  /** ホームで［もっと開く］の前に出す条件ボタンの数 */
  foldChips: 8,
  headerGroups: 2,
  urlWarn: 500,
} as const;

/** 機能タイトル。今後 YouTube／TikTok の同様のツールを同じサイトに足す予定（Issue なし） */
export const APP_FEATURE = "X（Twitter）";

export const TODAY = "2026-11-17";

export type CondKind =
  | "word"
  | "exact"
  | "exclude"
  | "list"
  | "account"
  | "filter"
  | "raw"
  | "number"
  | "date";

export const COND_KINDS: { kind: CondKind; label: string; hint: string }[] = [
  { kind: "word", label: "語（通常）", hint: "ぺこら" },
  { kind: "exact", label: "語（完全一致）", hint: "兎田ぺこら" },
  { kind: "exclude", label: "除外", hint: "切り抜き" },
  { kind: "list", label: "リスト", hint: "リストID（数字）" },
  { kind: "account", label: "アカウント", hint: "from:ID / to:ID" },
  { kind: "filter", label: "フィルタ", hint: "-filter:retweets" },
  { kind: "raw", label: "生トークン", hint: "foo:bar" },
  { kind: "number", label: "数値", hint: "50" },
  { kind: "date", label: "日付", hint: "2026-11-07" },
];

/**
 * 値付きの条件（数値・日付）の演算子。ホームの条件ボタンの中に入力欄を出し、値をその場で変えられる。
 * 演算子を足すときはここに1件足すだけで、編集シートとホームのボタンに反映される。
 */
export const PARAM_OPS = {
  min_faves: { type: "number", suffix: "件以上", label: "ファボ数" },
  min_retweets: { type: "number", suffix: "件以上", label: "RT数" },
  min_replies: { type: "number", suffix: "件以上", label: "リプ数" },
  since: { type: "date", suffix: "以降", label: "開始日" },
  until: { type: "date", suffix: "以前", label: "終了日（含む）" },
} as const satisfies Record<
  string,
  { type: "number" | "date"; suffix: string; label: string }
>;
export type ParamOp = keyof typeof PARAM_OPS;
export const PARAM_OP_KEYS = Object.keys(PARAM_OPS) as ParamOp[];
/** 種類（数値／日付）ごとの演算子 */
export const paramOpsOf = (type: "number" | "date"): ParamOp[] =>
  PARAM_OP_KEYS.filter((k) => PARAM_OPS[k].type === type);

/** kind が number／date のときだけ op を持つ（値は value。数値は正の整数、日付は YYYY-MM-DD） */
export type Cond = { id: string; kind: CondKind; value: string; op?: ParamOp };

export const isParamCond = (c: Cond): boolean =>
  (c.kind === "number" || c.kind === "date") && !!c.op;
export type Chip = {
  id: string;
  label: string;
  conds: Cond[];
  /** ホームで押されている（検索に使う）状態 */
  on: boolean;
  /** ホームに出す。false なら、ホームの並び・件数・クエリのどれにも入れない */
  visible: boolean;
  isNew?: boolean;
  isDefault?: boolean;
};

/** 昨日から／3日前から／1週間前から／日付（以降・以前・範囲） */
export type PeriodKind = "none" | "d1" | "d3" | "d7" | "date";
export type Period = {
  kind: PeriodKind;
  /** kind が date のときだけ使う（YYYY-MM-DD。空なら指定なし） */
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

export const EMPTY_PERIOD: Period = { kind: "none", from: "", to: "" };

const per = (kind: PeriodKind): Period => ({ ...EMPTY_PERIOD, kind });

/**
 * 保存した検索。お気に入り・いつものエゴサは、条件ボタンを参照せず
 * 「検索文字列」を実体として持つ（条件ボタンを直しても、保存済みには反映されない）。
 * 期間だけは、相対指定（昨日から…）を実行時に解決するため文字列に入れず別に持つ。
 */
export type SavedSearch = {
  label: string;
  /** 期間を含まない検索文字列 */
  query: string;
  period: Period;
  engine: Engine;
};

export type Favorite = {
  id: string;
  name: string;
  query: string;
  period: Period;
  engine: Engine;
  last: string;
};

export type Group = {
  id: string;
  name: string;
  /** お気に入りからコピーした検索（元のお気に入りを直しても変わらない） */
  items: SavedSearch[];
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

type TrashBase = {
  tid: string;
  at: string;
  name: string;
  index: number;
};

export type TrashItem =
  | (TrashBase & { kind: "chip"; data: Chip })
  | (TrashBase & { kind: "fav"; data: Favorite })
  | (TrashBase & { kind: "group"; data: Group });

/** 既定リスト（requirements F1）。ID は開発者が確認した値のみ。 */
export const DEFAULT_LISTS = [
  {
    id: "d-holo",
    name: "ホロメンから",
    interest: "ホロライブ",
    listId: "1412278227767218179",
  },
  {
    id: "d-niji",
    name: "にじさんじから",
    interest: "にじさんじ",
    listId: "1478366370727608323",
  },
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
    visible: true,
    isDefault: true,
    conds: [c(`${l.id}-c`, "list", l.listId)],
  }));
}

export const INITIAL_CHIPS: Chip[] = [
  {
    id: "k-rt",
    label: "RTを除く",
    on: true,
    visible: true,
    conds: [c("k-rt-1", "filter", "-filter:retweets")],
  },
  ...defaultChips(),
  {
    id: "k-spoil",
    label: "ネタバレ除外",
    on: true,
    visible: true,
    conds: [
      c("k-spoil-1", "exclude", "ネタバレ語A"),
      c("k-spoil-2", "exclude", "ネタバレ語B"),
    ],
  },
  // 値付きの条件ボタン：ホームのボタンの中で値を変えられる（変えた値はボタンに保存）
  {
    id: "k-faves",
    label: "ファボ",
    on: false,
    visible: true,
    conds: [{ id: "k-faves-1", kind: "number", op: "min_faves", value: "50" }],
  },
  {
    id: "k-since",
    label: "日付",
    on: false,
    visible: true,
    conds: [
      { id: "k-since-1", kind: "date", op: "since", value: "2026-11-07" },
    ],
  },
  {
    id: "k-img",
    label: "画像つき",
    on: false,
    visible: true,
    conds: [c("k-img-1", "filter", "filter:images")],
  },
  {
    id: "k-reply",
    label: "返信のみ",
    on: false,
    visible: true,
    conds: [c("k-reply-1", "filter", "filter:replies")],
  },
  {
    id: "k-haishin",
    label: "配信タグ",
    on: false,
    visible: true,
    conds: [c("k-haishin-1", "word", "#配信タグA")],
  },
  {
    id: "k-fanart",
    label: "ファンアート",
    on: false,
    visible: true,
    conds: [c("k-fanart-1", "word", "#ファンアートタグA")],
  },
  {
    id: "k-clip",
    label: "切り抜き",
    on: false,
    visible: true,
    conds: [c("k-clip-1", "word", "#切り抜きタグA")],
  },
  {
    id: "k-jp",
    label: "日本語のみ",
    on: false,
    visible: true,
    conds: [c("k-jp-1", "filter", "lang:ja")],
  },
  {
    id: "k-nolink",
    label: "リンクなし",
    on: false,
    visible: false,
    conds: [c("k-nolink-1", "filter", "-filter:links")],
  },
];

export const INITIAL_FAVORITES: Favorite[] = [
  {
    id: "f-name",
    name: "名前エゴサ",
    query: '"メンバーA" -filter:retweets -ネタバレ語A -ネタバレ語B',
    period: per("d1"),
    engine: "x",
    last: "昨日 22:30",
  },
  {
    id: "f-tag",
    name: "配信タグ",
    query: "#配信タグA -ネタバレ語A -ネタバレ語B",
    period: per("d1"),
    engine: "x",
    last: "昨日 22:35",
  },
  {
    id: "f-art",
    name: "ファンアート",
    query: "#ファンアートタグA filter:images",
    period: per("d3"),
    engine: "x",
    last: "3日前",
  },
  {
    id: "f-clip",
    name: "切り抜き",
    query: "#切り抜きタグA",
    period: per("d3"),
    engine: "x",
    last: "3日前",
  },
  {
    id: "f-reply",
    name: "ホロメンからのリプライ",
    query: "list:1412278227767218179 to:sample_id",
    period: per("d7"),
    engine: "both",
    last: "未実行",
  },
];

/** お気に入りを、いつものエゴサに入れる検索（コピー）にする */
export function favToItem(f: Favorite): SavedSearch {
  return {
    label: f.name,
    query: f.query,
    period: f.period,
    engine: f.engine,
  };
}

export const INITIAL_GROUPS: Group[] = [
  {
    id: "g-today",
    name: "今日のエゴサ",
    items: INITIAL_FAVORITES.map(favToItem),
    doneToday: true,
  },
  {
    id: "g-after",
    name: "配信後エゴサ",
    items: INITIAL_FAVORITES.filter((f) =>
      ["f-tag", "f-art", "f-clip"].includes(f.id),
    ).map(favToItem),
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
    source: "いつものエゴサ「配信後エゴサ」",
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
  },
];

export const MENU = [
  { href: "/mock", label: "ホーム" },
  { href: "/mock/buttons", label: "条件ボタン" },
  { href: "/mock/favorites", label: "お気に入り" },
  { href: "/mock/groups", label: "いつものエゴサ" },
  { href: "/mock/history", label: "履歴" },
  { href: "/mock/trash", label: "削除済み" },
  { href: "/mock/import", label: "URL解析" },
  { href: "/mock/about", label: "このサイトについて" },
] as const;

/** 削除済みの初期ダミー（3種類。画面を確かめやすくする） */
export const INITIAL_TRASH: TrashItem[] = [
  {
    tid: "tr-1",
    at: "昨日 21:10",
    kind: "chip",
    name: "ネタバレ注意",
    index: 3,
    data: {
      id: "k-old1",
      label: "ネタバレ注意",
      on: false,
      visible: true,
      conds: [c("k-old1-1", "exclude", "ネタバレ")],
    },
  },
  {
    tid: "tr-2",
    at: "3日前 09:00",
    kind: "fav",
    name: "コラボ告知",
    index: 5,
    data: {
      id: "f-collab",
      name: "コラボ告知",
      query: "コラボ -filter:retweets",
      period: per("d1"),
      engine: "x",
      last: "3日前",
    },
  },
  {
    tid: "tr-3",
    at: "3日前 09:00",
    kind: "group",
    name: "コラボ日エゴサ",
    index: 2,
    data: {
      id: "g-collab",
      name: "コラボ日エゴサ",
      items: [
        {
          label: "コラボ告知",
          query: "コラボ -filter:retweets",
          period: per("d1"),
          engine: "x",
        },
      ],
      doneToday: false,
    },
  },
];

/** サジェスト検索条件（直近の検索から作る）の種。モックでは20件に満たす分をダミーで足す */
export const SUGGEST_SEEDS: string[] = [
  "min_faves:50",
  "min_faves:500",
  "filter:videos",
  "-filter:replies",
  "lang:en",
  "-filter:quote",
  "min_retweets:10",
  "filter:verified",
  "to:sample_id",
  "from:sample_id",
  "#配信タグB",
  "#ファンアートタグB",
  "(表記A OR 表記B)",
  "min_replies:5",
  "-切り抜き",
  "filter:media",
  "-filter:images",
  "lang:id",
  "min_faves:1000",
  "-ネタバレ語C",
  "-filter:links",
  "min_retweets:50",
];
