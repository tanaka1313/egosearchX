/**
 * 画面をまたぐ状態（docs/api-spec.md 2.5・4.5）。契約 `EgoSearchApi` だけを使う。
 * ストアはルール（上限・連動・並び・プリセット）を持たない：
 * - エンティティを返す操作は、戻り値を状態へ差し込むだけ（並びは DAO が付けた `order` のとおり）。
 * - 戻り値が無い操作（削除・並べ替え・履歴・削除済み）は、`data.init()` で読み直す。
 * - 保存データが壊れている（`CORRUPT`）間は、何も書かない（上書きしない）。
 * persist ミドルウェアは使わない（保存はバックエンドの DAO を通す）。
 */
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  ApiError,
  EMPTY_DETAIL,
  EMPTY_PERIOD,
  type AppData,
  type Chip,
  type ChipInput,
  type Detail,
  type EgoSearchApi,
  type Favorite,
  type FavoriteInput,
  type FavoritePatch,
  type FavoriteUpdate,
  type Group,
  type GroupInput,
  type HistoryItem,
  type InterestId,
  type Period,
  type Prefs,
  type RunPlan,
  type RunSource,
  type SaveSearchInput,
  type TrashEntry,
  type TrashKind,
} from "@/api";

export type StoreStatus = "loading" | "ready" | "corrupt";

type Data = {
  prefs: Prefs | null;
  chips: Map<InterestId, Chip[]>;
  favorites: Favorite[];
  groups: Group[];
  history: HistoryItem[];
};

/**
 * ホームの検索の組み立て（画面の状態。保存しない＝再読み込みで消える。docs/api-spec.md 1.1）。
 * ページを移って戻っても残り、S7 の［ホームで編集する］が外から書き込める。条件ボタンの ON は `Chip.on`（保存する）。
 */
export type HomeState = {
  word: string;
  exact: boolean;
  detail: Detail;
  period: Period;
  /** この検索だけ ON にしたサジェスト */
  suggestionTokens: string[];
};

export const EMPTY_HOME: HomeState = {
  word: "",
  exact: false,
  detail: EMPTY_DETAIL,
  period: EMPTY_PERIOD,
  suggestionTokens: [],
};

export type AppState = Data & {
  status: StoreStatus;
  home: HomeState;
  /** 指定した項目だけ変える。保存しないので、壊れたデータ（corrupt）でも使える */
  home_set(patch: Partial<HomeState>): void;
  /** 「新」印を付ける条件ボタンの ID（サジェストから追加したもの）。保存しない＝再読み込みで消える。ホームで初めて押すと外れる */
  newChipIds: string[];
  chip_seen(id: string): void;
  /** 削除済み。`trash_load` を呼ぶまでは null */
  trash: TrashEntry[] | null;
  /** 一度だけ読む。壊れていれば status を corrupt にする（throw しない） */
  init(): Promise<void>;
  trash_load(): Promise<void>;
  /** 保存データをすべて破棄してプリセットから作り直す（D3 の確認の後。壊れたとき（2.7）と、設定の［データをすべて初期化］）。読み込み中は使えない */
  data_reset(): Promise<void>;

  chips_save(input: ChipInput): Promise<Chip>;
  chips_setOn(id: string, on: boolean): Promise<Chip>;
  chips_setVisible(id: string, visible: boolean): Promise<Chip>;
  chips_setValue(id: string, condId: string, value: string): Promise<Chip>;
  chips_reorder(interestId: InterestId, ids: string[]): Promise<void>;
  chips_remove(id: string): Promise<void>;
  chips_addPresets(interestId: InterestId): Promise<Chip[]>;
  chips_adoptSuggestion(interestId: InterestId, token: string): Promise<Chip>;

  favorites_save(input: FavoriteInput): Promise<Favorite>;
  favorites_update(id: string, patch: FavoritePatch): Promise<FavoriteUpdate>;
  favorites_reorder(ids: string[]): Promise<void>;
  favorites_remove(id: string): Promise<void>;

  groups_save(input: GroupInput): Promise<Group>;
  groups_remove(id: string): Promise<void>;
  saveSearch(
    input: SaveSearchInput,
  ): Promise<{ favorite: Favorite; group: Group | null }>;

  history_record(plan: RunPlan, source: RunSource): Promise<HistoryItem[]>;
  history_clear(): Promise<void>;

  trash_restore(kind: TrashKind, id: string): Promise<void>;
  trash_purge(kind: TrashKind, id: string): Promise<void>;
  trash_purgeKind(kind: TrashKind): Promise<void>;
  trash_purgeAll(): Promise<void>;

  prefs_set(patch: Partial<Prefs>): Promise<Prefs>;
  /** `favorites_update` が返した `undo` を実行し、状態を読み直す */
  undo(undo: () => Promise<void>): Promise<void>;
};

export type AppStore = StoreApi<AppState>;

/** 並びは DAO が付けた `order` のとおり（ストアは並びの規則を持たない） */
const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

function upsert<T extends { id: string; order: number }>(
  list: T[],
  rows: T[],
): T[] {
  const ids = new Set(rows.map((r) => r.id));
  return [...list.filter((r) => !ids.has(r.id)), ...rows].sort(byOrder);
}

function upsertChips(
  chips: Map<InterestId, Chip[]>,
  rows: Chip[],
): Map<InterestId, Chip[]> {
  const ids = new Set(rows.map((r) => r.id));
  const next = new Map<InterestId, Chip[]>();
  for (const [k, list] of chips)
    next.set(
      k,
      list.filter((c) => !ids.has(c.id)),
    );
  for (const row of rows)
    next.set(
      row.interestId,
      [...(next.get(row.interestId) ?? []), row].sort(byOrder),
    );
  return next;
}

const dataOf = (d: AppData): Data => ({
  prefs: d.prefs,
  chips: d.chips,
  favorites: d.favorites,
  groups: d.groups,
  history: d.history,
});

export function createAppStore(api: EgoSearchApi): AppStore {
  const data = api.data;

  return createStore<AppState>()((set, get) => {
    /** 操作の共通の入口。ready のときだけ実行し、CORRUPT を受けたら corrupt にする */
    const run = async <T>(f: () => Promise<T>): Promise<T> => {
      const { status } = get();
      if (status === "corrupt") throw new ApiError("CORRUPT");
      if (status === "loading")
        throw new Error("ストアの読み込みが終わる前に操作された");
      try {
        return await f();
      } catch (e) {
        if (e instanceof ApiError && e.code === "CORRUPT")
          set({ status: "corrupt" });
        throw e;
      }
    };

    /** 戻り値の無い操作のあと、バックエンドから読み直す（規則はバックエンドが持つ） */
    const reload = async () => {
      const loaded = await data.init();
      set({ ...dataOf(loaded) });
      if (get().trash) set({ trash: await data.trash.list() });
    };
    const mutate = (f: () => Promise<unknown>) =>
      run(async () => {
        await f();
        await reload();
      });

    const putChips = (rows: Chip[]) =>
      set((s) => ({ chips: upsertChips(s.chips, rows) }));
    const putFavorites = (rows: Favorite[]) =>
      set((s) => ({ favorites: upsert(s.favorites, rows) }));
    const putGroups = (rows: Group[]) =>
      set((s) => ({ groups: upsert(s.groups, rows) }));
    const chipOp = (f: () => Promise<Chip>) =>
      run(async () => {
        const chip = await f();
        putChips([chip]);
        return chip;
      });

    return {
      status: "loading",
      prefs: null,
      chips: new Map(),
      favorites: [],
      groups: [],
      history: [],
      trash: null,
      home: EMPTY_HOME,
      newChipIds: [],
      chip_seen: (id) =>
        set((s) =>
          s.newChipIds.includes(id)
            ? { newChipIds: s.newChipIds.filter((x) => x !== id) }
            : s,
        ),
      home_set: (patch) => set((s) => ({ home: { ...s.home, ...patch } })),

      init: async () => {
        if (get().status !== "loading") return;
        try {
          set({ ...dataOf(await data.init()), status: "ready" });
        } catch (e) {
          if (e instanceof ApiError && e.code === "CORRUPT")
            return set({ status: "corrupt" });
          throw e;
        }
      },
      data_reset: async () => {
        if (get().status === "loading")
          throw new Error("data_reset は読み込みが終わってから使う");
        set({
          ...dataOf(await data.reset()),
          trash: null,
          newChipIds: [],
          status: "ready",
        });
      },
      trash_load: () =>
        run(async () => set({ trash: await data.trash.list() })),

      chips_save: (input) => chipOp(() => data.chips.save(input)),
      chips_setOn: (id, on) => chipOp(() => data.chips.setOn(id, on)),
      chips_setVisible: (id, v) => chipOp(() => data.chips.setVisible(id, v)),
      chips_setValue: (id, condId, value) =>
        chipOp(() => data.chips.setValue(id, condId, value)),
      chips_reorder: (interestId, ids) =>
        mutate(() => data.chips.reorder(interestId, ids)),
      chips_remove: (id) => mutate(() => data.chips.remove(id)),
      chips_addPresets: (interestId) =>
        run(async () => {
          const added = await data.chips.addPresets(interestId);
          putChips(added);
          return added;
        }),
      chips_adoptSuggestion: (interestId, token) =>
        run(async () => {
          const chip = await data.chips.adoptSuggestion(interestId, token);
          set((s) => ({ newChipIds: [...s.newChipIds, chip.id] }));
          putChips([chip]);
          return chip;
        }),

      favorites_save: (input) =>
        run(async () => {
          const fav = await data.favorites.save(input);
          putFavorites([fav]);
          return fav;
        }),
      favorites_update: (id, patch) =>
        run(async () => {
          const res = await data.favorites.update(id, patch);
          putFavorites([res.favorite]);
          putGroups(res.groups);
          return res;
        }),
      favorites_reorder: (ids) => mutate(() => data.favorites.reorder(ids)),
      favorites_remove: (id) => mutate(() => data.favorites.remove(id)),

      groups_save: (input) =>
        run(async () => {
          const group = await data.groups.save(input);
          putGroups([group]);
          return group;
        }),
      groups_remove: (id) => mutate(() => data.groups.remove(id)),
      saveSearch: (input) =>
        run(async () => {
          const res = await data.saveSearch(input);
          putFavorites([res.favorite]);
          if (res.group) putGroups([res.group]);
          return res;
        }),

      history_record: (plan, source) =>
        run(async () => {
          const items = await data.history.record(plan, source);
          await reload(); // 上限・lastRunAt の更新はバックエンドの規則
          return items;
        }),
      history_clear: () => mutate(() => data.history.clear()),

      trash_restore: (kind, id) => mutate(() => data.trash.restore(kind, id)),
      trash_purge: (kind, id) => mutate(() => data.trash.purge(kind, id)),
      trash_purgeKind: (kind) => mutate(() => data.trash.purgeKind(kind)),
      trash_purgeAll: () => mutate(() => data.trash.purgeAll()),

      prefs_set: (patch) =>
        run(async () => {
          const prefs = await data.prefs.set(patch);
          set({ prefs });
          return prefs;
        }),
      undo: (undo) => mutate(undo),
    };
  });
}
