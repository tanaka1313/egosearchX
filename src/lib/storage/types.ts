/**
 * データアクセス（DAO）のインターフェース（docs/requirements.md 12章）。
 * - すべて async。今の保存先（localStorage）は同期だが、RDB やリモート API へ移すときに呼び出し側を直さずに済むようにする。
 * - 画面や状態管理（ストア）はこのインターフェースだけを使い、保存先を知らない。
 * - 一覧（list）は削除済み（deletedAt あり）を含まず、order 順で返す。
 */
import type {
  Chip,
  Favorite,
  Group,
  HistoryItem,
  InterestId,
  Prefs,
  TrashEntry,
  TrashKind,
} from "./schema";

/** order を省略すると、新規なら末尾に付ける */
export type Saveable<T extends { order: number }> = Omit<T, "order"> & {
  order?: number;
};

export interface ChipRepo {
  /** 興味の対象の条件ボタン */
  listByInterest(interestId: InterestId): Promise<Chip[]>;
  /** すべての興味の対象の条件ボタン（キーは興味の対象の ID） */
  listAllByInterest(): Promise<Map<InterestId, Chip[]>>;
  get(id: string): Promise<Chip | null>;
  /** 追加または更新。新規で、その興味の対象の上限に達していれば LimitError */
  save(chip: Saveable<Chip>): Promise<void>;
  /** 削除済みへ移す */
  softDelete(id: string, at: string): Promise<void>;
  /** 並びを ids の順にする */
  reorder(interestId: InterestId, ids: string[]): Promise<void>;
}

export interface CrudRepo<T extends { id: string; order: number }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  save(item: Saveable<T>): Promise<void>;
  softDelete(id: string, at: string): Promise<void>;
  reorder(ids: string[]): Promise<void>;
}

export type FavoriteRepo = CrudRepo<Favorite>;
export type GroupRepo = CrudRepo<Group>;

export interface HistoryRepo {
  /** 新しい順 */
  list(): Promise<HistoryItem[]>;
  /** 追加する。上限を超えたら古いものから消す */
  add(item: HistoryItem): Promise<void>;
  clear(): Promise<void>;
}

export interface TrashRepo {
  /** 削除済み（3種類）。新しい順 */
  list(): Promise<TrashEntry[]>;
  /** 元の位置（order）に戻す。条件ボタンは戻す先の興味の対象の上限で判定し、超えるなら LimitError */
  restore(kind: TrashKind, id: string): Promise<void>;
  /** 完全に削除する（元に戻せない。画面では確認を挟む） */
  purge(kind: TrashKind, id: string): Promise<void>;
  purgeKind(kind: TrashKind): Promise<void>;
  purgeAll(): Promise<void>;
}

export interface PrefsRepo {
  get(): Promise<Prefs>;
  set(patch: Partial<Prefs>): Promise<void>;
}

/** DAO の全体。保存先ごとに実装を差し替える（今は KeyValue＝localStorage。将来は RDB／API） */
export interface Dao {
  chips: ChipRepo;
  favorites: FavoriteRepo;
  groups: GroupRepo;
  history: HistoryRepo;
  trash: TrashRepo;
  prefs: PrefsRepo;
}
