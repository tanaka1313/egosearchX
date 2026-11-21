/**
 * フロントエンドとバックエンドの境界（docs/api-spec.md 4章）。実装は `src/backend`（`createBackend`）。
 * 計算は同期の純粋関数、保存を伴うものは async（失敗は `ApiError` を throw）。文言は返さず、コードと値で返す。
 */
import type {
  Chip,
  Engine,
  Favorite,
  Group,
  GroupItem,
  HistoryItem,
  InterestId,
  Prefs,
  TrashEntry,
  TrashKind,
} from "./entities";
import type { Result } from "./issues";
import type { LIMITS } from "./limits";
import type {
  BuiltQuery,
  Cond,
  Interest,
  Lang,
  LauncherPayload,
  ParsedScope,
  ParsedUrl,
  Period,
  PlanItem,
  RunPlan,
  RunSource,
  SearchState,
  WordGroup,
} from "./types";

export interface MasterApi {
  /** JSON の並び（ヘッダーの切替の並び） */
  interests(): Map<InterestId, Interest>;
  /** 検索ワード集の全件。対象が無い・空のときは `[]` */
  wordSet(interest: InterestId): WordGroup[];
}

export interface QueryApi {
  build(state: SearchState, chips: Chip[]): BuiltQuery;
  parse(stored: string, chips: Chip[]): ParsedScope;
  /** 相対期間の記号を `clock` の日付に展開する */
  expand(stored: string): string;
  periodTokens(p: Period): string[];
  tokenize(q: string): string[];
  normalize(q: string): string;
  disabledKey(chipId: string, token: string): string;
  chipConds(chip: Pick<Chip, "id" | "query">): Cond[];
  condsToQuery(conds: Cond[]): string;
  /** D1 の保存前の検証。ラベルが空なら、検索文字列から作る（20文字を超えたら先頭19文字＋「…」）。上限は見ない */
  validateChip(
    label: string,
    conds: Cond[],
  ): Result<{ label: string; query: string }>;
  favName(
    query: string,
    favorites: Pick<Favorite, "name" | "query">[],
  ): string | null;
  /** 履歴が0件のときだけ、今の対象の starter の検索文字列を返す（それ以外は `[]`） */
  starters(input: {
    interest: InterestId;
    chips: Chip[];
    history: HistoryItem[];
  }): string[];
  /** 規則 → 履歴のトークンの順。最大 `LIMITS.suggest` */
  suggest(input: {
    interest: InterestId;
    text: string;
    chips: Chip[];
    history: HistoryItem[];
  }): string[];
}

export interface UrlApi {
  plan(items: PlanItem[]): RunPlan;
  parse(input: string): Result<ParsedUrl>;
  listId(input: string): Result<string>;
}

export interface LauncherApi {
  encode(payload: LauncherPayload): Promise<string>;
  decode(hash: string): Promise<LauncherPayload>;
}

export type AppData = {
  prefs: Prefs;
  /** 興味の対象ごと。非表示も含む。order 順 */
  chips: Map<InterestId, Chip[]>;
  favorites: Favorite[];
  groups: Group[];
  history: HistoryItem[];
};

/** `id` があれば更新。`on`・`visible` を省くと、更新は今の値、新規は false・true */
export type ChipInput = {
  id?: string;
  interestId: InterestId;
  label: string;
  query: string;
  on?: boolean;
  visible?: boolean;
};
export type FavoriteInput = { name: string; query: string; engine: Engine };
export type FavoritePatch = Partial<FavoriteInput>;
export type GroupInput = { id?: string; name: string; items: GroupItem[] };

export type FavoriteUpdate = {
  favorite: Favorite;
  /** 一緒に更新されたいつものエゴサ（変わったものだけ） */
  groups: Group[];
  /** 更新した項目の数。0 ならトーストを出さない */
  count: number;
  /** お気に入りといつものエゴサを両方戻す */
  undo(): Promise<void>;
};

export type SaveSearchInput = {
  favorite: FavoriteInput;
  target:
    | { kind: "none" }
    | { kind: "group"; groupId: string }
    | { kind: "newGroup"; name: string };
};

export type TrashDetail =
  | { kind: "chip"; chip: Chip }
  | { kind: "favorite"; favorite: Favorite }
  | { kind: "group"; group: Group };

export interface DataApi {
  /** 初回はプリセットを入れる。CORRUPT のときは何も書かない */
  init(): Promise<AppData>;
  /**
   * 保存データをすべて破棄し、プリセットから作り直す。CORRUPT のとき、ユーザーが確認ダイアログ（D3）で
   * 確かめた後だけ呼ぶ（画面仕様書 2.7。「上書きしない」の唯一の例外）
   */
  reset(): Promise<AppData>;
  chips: {
    save(input: ChipInput): Promise<Chip>;
    setOn(id: string, on: boolean): Promise<Chip>;
    setVisible(id: string, visible: boolean): Promise<Chip>;
    /** 値付きの条件。query を書き換え、on にする */
    setValue(id: string, condId: string, value: string): Promise<Chip>;
    reorder(interestId: InterestId, ids: string[]): Promise<void>;
    remove(id: string): Promise<void>;
    /** 正規化した検索文字列が一致するボタンが無いものだけ（削除済みを除く）。上限まで。足したものを返す */
    addPresets(interestId: InterestId, lang: Lang): Promise<Chip[]>;
    adoptSuggestion(interestId: InterestId, token: string): Promise<Chip>;
  };
  favorites: {
    save(input: FavoriteInput): Promise<Favorite>;
    update(id: string, patch: FavoritePatch): Promise<FavoriteUpdate>;
    reorder(ids: string[]): Promise<void>;
    /** いつものエゴサには連動しない */
    remove(id: string): Promise<void>;
  };
  groups: {
    save(input: GroupInput): Promise<Group>;
    remove(id: string): Promise<void>;
  };
  saveSearch(
    input: SaveSearchInput,
  ): Promise<{ favorite: Favorite; group: Group | null }>;
  history: {
    record(plan: RunPlan, source: RunSource): Promise<HistoryItem[]>;
    clear(): Promise<void>;
  };
  trash: {
    list(): Promise<TrashEntry[]>;
    detail(kind: TrashKind, id: string): Promise<TrashDetail>;
    restore(kind: TrashKind, id: string): Promise<void>;
    purge(kind: TrashKind, id: string): Promise<void>;
    purgeKind(kind: TrashKind): Promise<void>;
    purgeAll(): Promise<void>;
  };
  prefs: { set(patch: Partial<Prefs>): Promise<Prefs> };
}

export type Clock = {
  /** 端末の現地の日付（YYYY-MM-DD） */
  today(): string;
  /** ISO 8601（UTC） */
  now(): string;
};

/** 契約が出す時計。注入する `Clock` に、端末の現地の日付で決める判定を足したもの */
export type AppClock = Clock & {
  /** ISO 8601（UTC）の日時が、端末の現地の「今日」か。null は false。「今日は実行済み」の判定に使う（履歴は見ない） */
  isToday(at: string | null): boolean;
};

export interface EgoSearchApi {
  master: MasterApi;
  query: QueryApi;
  url: UrlApi;
  launcher: LauncherApi;
  data: DataApi;
  clock: AppClock;
  limits: typeof LIMITS;
}
