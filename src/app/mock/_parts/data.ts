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

/**
 * 条件ボタンの中身の1項目（表示・編集用のモデル。保存はしない）。
 * 条件ボタンの本体は検索文字列（Chip.query）で、画面で使うときに chipConds() で分ける。
 * kind が number／date のときだけ op を持つ（値は value。数値は正の整数、日付は YYYY-MM-DD。
 * 「以前」（until）の value は文字列と同じ日で、指定日を含む）。
 */
export type Cond = { id: string; kind: CondKind; value: string; op?: ParamOp };

export const isParamCond = (c: Cond): boolean =>
  (c.kind === "number" || c.kind === "date") && !!c.op;

/**
 * 興味の対象。今後増える前提で、ID をキーにした1か所の定義に集める（実装では JSON＋zod。Map で扱う）。
 * list：その対象の既定リスト（F1）。条件ボタンのプリセットになる。無い対象（その他）は null。
 */
export type InterestId = string;
export type Interest = {
  label: string;
  list: { label: string; listId: string } | null;
};
export const INTERESTS: Record<InterestId, Interest> = {
  hololive: {
    label: "ホロライブ",
    list: { label: "ホロメンから", listId: "1412278227767218179" },
  },
  nijisanji: {
    label: "にじさんじ",
    list: { label: "にじさんじから", listId: "1478366370727608323" },
  },
  other: { label: "その他", list: null },
};
/** 表示順（ヘッダーの切替の並び） */
export const INTEREST_IDS: InterestId[] = Object.keys(INTERESTS);
/** 既定の興味の対象（静的 HTML もこれで出す） */
export const DEFAULT_INTEREST: InterestId = "hololive";

/**
 * 条件ボタン。本体は検索文字列（query）。興味の対象ごとに別の並びを持つ（interestId）。
 * お気に入り・いつものエゴサはこのボタンを参照しない（ボタンを直しても保存済みには波及しない）。
 */
export type Chip = {
  id: string;
  interestId: InterestId;
  label: string;
  /** 本体の検索文字列（例：`-ネタバレ語A -ネタバレ語B`、`min_faves:50`） */
  query: string;
  /** ホームで押されている（検索に使う）状態 */
  on: boolean;
  /** ホームに出す。false なら、ホームの並び・件数・クエリのどれにも入れない */
  visible: boolean;
  isNew?: boolean;
  /** 開発者が用意したプリセットから作ったボタン（編集・削除はできる） */
  isPreset?: boolean;
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
  /** アカウントの除外（-from: -to: -@）。X の実機で確認済み。-list: は X で検索がエラーになるので持たない */
  exFrom: string;
  exTo: string;
  exMention: string;
  flt: Record<string, Tri>;
  lang: string;
  minFaves: string;
  minRt: string;
  minReplies: string;
  live: boolean;
  /**
   * 共通（条件ボタン）の項目ごとの無効化。`<ボタンID>::<トークン>` の配列（disabledKey）。
   * ボタンの本体が文字列なので、項目は ID ではなくトークンで指す。
   */
  disabledConds: string[];
  /** テキストで足した生トークン */
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
  exFrom: "",
  exTo: "",
  exMention: "",
  flt: {},
  lang: "",
  minFaves: "",
  minRt: "",
  minReplies: "",
  live: false,
  disabledConds: [],
  raw: "",
};

export const EMPTY_PERIOD: Period = { kind: "none", from: "", to: "" };

/**
 * 相対期間の記号。保存する検索文字列にはこの記号のまま入れ、開く時点の日付で `since:YYYY-MM-DD` に展開する
 * （X／Yahoo!リアルタイム検索の URL とコピーには記号を出さない）。
 */
export const REL_PERIODS = [
  { kind: "d1", label: "昨日から", token: "since:yesterday", days: 1 },
  { kind: "d3", label: "3日前から", token: "since:3days_ago", days: 3 },
  { kind: "d7", label: "1週間前から", token: "since:1week_ago", days: 7 },
] as const;

/**
 * お気に入り。本体は検索文字列（期間の記号を含む）と検索先。条件ボタンを参照しない。
 * 編集するときは、文字列を条件ボタン・詳細条件に展開する（parseToScope）。
 */
export type Favorite = {
  id: string;
  name: string;
  /** 例：`"メンバーA" -filter:retweets since:yesterday` */
  query: string;
  engine: Engine;
  /** 最後に開いた日時（モックは表示用の文字列。本実装は ISO 形式） */
  last: string;
};

/**
 * いつものエゴサの1項目：検索文字列＋検索先。名前は持たない
 * （正規化した文字列が一致するお気に入りがあれば、その名前を表示する。favNameFor）。
 */
export type GroupItem = { query: string; engine: Engine };

export type Group = {
  id: string;
  name: string;
  /** 開く順の検索。お気に入りを編集すると、正規化した文字列が一致する項目も更新される（applyFavEdit） */
  items: GroupItem[];
  /** 今日は実行済み（本実装は履歴から求める） */
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

/**
 * 条件ボタンのプリセット（開発者が決める。中身は仮の値。本番の値は Issue「プリセットとサジェスト規則」で決める）。
 * 興味の対象ごとに、初回に入るボタンの並びを持つ。共通のものは COMMON から入れる（同じ定義を2回書かない）。
 * 既定リストのボタンは INTERESTS の list から作る。その他は共通だけ。
 */
type Preset = {
  key: string;
  label: string;
  query: string;
  on?: boolean;
  visible?: boolean;
};
const COMMON = {
  rt: { key: "rt", label: "RTを除く", query: "-filter:retweets", on: true },
  faves: { key: "faves", label: "ファボ", query: "min_faves:50" },
  since: { key: "since", label: "日付", query: "since:2026-11-07" },
  img: { key: "img", label: "画像つき", query: "filter:images" },
  reply: { key: "reply", label: "返信のみ", query: "filter:replies" },
  jp: { key: "jp", label: "日本語のみ", query: "lang:ja" },
  nolink: {
    key: "nolink",
    label: "リンクなし",
    query: "-filter:links",
    visible: false,
  },
} satisfies Record<string, Preset>;

const listPreset = (id: InterestId): Preset[] => {
  const l = INTERESTS[id]?.list;
  return l ? [{ key: "list", label: l.label, query: `list:${l.listId}` }] : [];
};

export const PRESETS: Record<InterestId, Preset[]> = {
  hololive: [
    COMMON.rt,
    ...listPreset("hololive"),
    {
      key: "spoil",
      label: "ネタバレ除外",
      query: "-ネタバレ語A -ネタバレ語B",
      on: true,
    },
    COMMON.faves,
    COMMON.since,
    COMMON.img,
    COMMON.reply,
    { key: "haishin", label: "配信タグ", query: "#配信タグA" },
    { key: "fanart", label: "ファンアート", query: "#ファンアートタグA" },
    { key: "clip", label: "切り抜き", query: "#切り抜きタグA" },
    COMMON.jp,
    COMMON.nolink,
  ],
  nijisanji: [
    COMMON.rt,
    ...listPreset("nijisanji"),
    COMMON.faves,
    COMMON.since,
    COMMON.img,
    COMMON.reply,
    COMMON.jp,
    COMMON.nolink,
  ],
  other: [
    COMMON.rt,
    COMMON.faves,
    COMMON.since,
    COMMON.img,
    COMMON.reply,
    COMMON.jp,
    COMMON.nolink,
  ],
};

/** プリセットから条件ボタンを作る。ID は興味の対象ごとに一意（`<興味>:<key>`） */
export function presetChips(interest: InterestId): Chip[] {
  return (PRESETS[interest] ?? []).map((p) => ({
    id: `${interest}:${p.key}`,
    interestId: interest,
    label: p.label,
    query: p.query,
    on: p.on ?? false,
    visible: p.visible ?? true,
    isPreset: true,
  }));
}

/** 初回の条件ボタン（興味の対象ごとの並び） */
export function initialChips(): Record<InterestId, Chip[]> {
  return Object.fromEntries(INTEREST_IDS.map((id) => [id, presetChips(id)]));
}

/**
 * サジェストの規則（開発者が決める。中身は仮の値）。検索文字列に when のどれか1語が含まれていれば、
 * suggest の条件をサジェストの先頭に出す（例：タレント名 → その人のファンアートタグ・エゴサワード）。
 */
export type SuggestRule = { when: string[]; suggest: string[] };
export const SUGGEST_RULES: SuggestRule[] = [
  {
    when: ["メンバーA", "愛称A"],
    suggest: ["#ファンアートタグA", "#配信タグA", "愛称A"],
  },
  { when: ["メンバーB"], suggest: ["#ファンアートタグB", "#配信タグB"] },
];

export const INITIAL_FAVORITES: Favorite[] = [
  {
    id: "f-name",
    name: "名前エゴサ",
    query:
      '"メンバーA" -filter:retweets -ネタバレ語A -ネタバレ語B since:yesterday',
    engine: "x",
    last: "昨日 22:30",
  },
  {
    id: "f-tag",
    name: "配信タグ",
    query: "#配信タグA -ネタバレ語A -ネタバレ語B since:yesterday",
    engine: "x",
    last: "昨日 22:35",
  },
  {
    id: "f-art",
    name: "ファンアート",
    query: "#ファンアートタグA filter:images since:3days_ago",
    engine: "x",
    last: "3日前",
  },
  {
    id: "f-clip",
    name: "切り抜き",
    query: "#切り抜きタグA since:3days_ago",
    engine: "x",
    last: "3日前",
  },
  {
    id: "f-reply",
    name: "ホロメンからのリプライ",
    query: "list:1412278227767218179 to:sample_id since:1week_ago",
    engine: "both",
    last: "未実行",
  },
];

/** お気に入りを、いつものエゴサの項目（文字列＋検索先）にする */
export function favToItem(f: Favorite): GroupItem {
  return { query: f.query, engine: f.engine };
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

/**
 * 検索先の表示名。Yahoo は正式名「Yahoo!リアルタイム検索」で書く。
 * 省略してよいのはボタン（［Yahoo で開く］）と［⋯］のメニュー項目だけ（そこは直書き）。
 */
export const ENGINE_LABEL = {
  X: "X",
  Yahoo: "Yahoo!リアルタイム検索",
} as const;

/** 保存した検索の検索先の名前（選択肢・説明で使う正式名） */
export const ENGINE_NAME: Record<Engine, string> = {
  x: ENGINE_LABEL.X,
  yahoo: ENGINE_LABEL.Yahoo,
  both: `${ENGINE_LABEL.X}と${ENGINE_LABEL.Yahoo}の両方`,
};

/**
 * 検索先の短縮名。お気に入りの管理の行のバッジ（ただの識別子）にだけ使う。
 * スマホで行が溢れないよう、正式名ではなく短く書く（ユーザーが許可した例外）。
 */
export const ENGINE_SHORT: Record<Engine, string> = {
  x: "X",
  yahoo: "Yahoo",
  both: "X＋Yahoo",
};

/** 検索先で開く順（両方なら X → Yahoo） */
export const engineTargets = (e: Engine): ("X" | "Yahoo")[] =>
  e === "both" ? ["X", "Yahoo"] : e === "x" ? ["X"] : ["Yahoo"];

/**
 * メニューの項目。manage：追加・編集・削除・並べ替えをする管理ページ（メニューでは歯車のアイコンで示す。
 * 「管理」の文言は足さない：英語で長くなるため）。
 */
export const MENU: readonly { href: string; label: string; manage?: true }[] = [
  { href: "/mock", label: "ホーム" },
  { href: "/mock/buttons", label: "条件ボタン", manage: true },
  { href: "/mock/favorites", label: "お気に入り", manage: true },
  { href: "/mock/groups", label: "いつものエゴサ", manage: true },
  { href: "/mock/history", label: "履歴" },
  { href: "/mock/trash", label: "削除済み" },
  { href: "/mock/import", label: "URL解析" },
  { href: "/mock/about", label: "このサイトについて" },
];

/** 削除済みの初期ダミー（3種類。画面を確かめやすくする） */
export const INITIAL_TRASH: TrashItem[] = [
  {
    tid: "tr-1",
    at: "昨日 21:10",
    kind: "chip",
    name: "ネタバレ注意",
    index: 3,
    data: {
      id: "hololive:old1",
      interestId: "hololive",
      label: "ネタバレ注意",
      query: "-ネタバレ",
      on: false,
      visible: true,
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
      query: "コラボ -filter:retweets since:yesterday",
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
        { query: "コラボ -filter:retweets since:yesterday", engine: "x" },
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
