/**
 * キー・バリュー型の保存先（KeyValueAdapter）の上に作る DAO。MVP は localStorage で使う。
 * 1つの表を1つのキー（`egosearch:v<版>:<表>`）に JSON の配列で持つ。読み書きのたびに zod で検証し、
 * 壊れたデータは StorageCorruptError にする（勝手に上書きしない）。
 * RDB に移るときは、同じインターフェース（types.ts の Dao）を RDB／API 向けに実装して差し替える。
 */
import { z } from "zod";
import {
  ChipSchema,
  DEFAULT_PREFS,
  FavoriteSchema,
  GroupSchema,
  HistorySchema,
  LIMITS,
  PrefsSchema,
  type Chip,
  type HistoryItem,
  type InterestId,
  type TrashEntry,
  type TrashKind,
} from "@/api";
import { StorageCorruptError } from "./corrupt-error";
import type { KeyValueAdapter } from "./kv-adapter";
import { META_KEY, migrate, type Migration } from "./migrate";
import { SCHEMA_VERSION } from "./schema";
import type { CrudRepo, Dao, Saveable } from "./types";

export { StorageCorruptError };

/** 上限に達していて追加・復元できない */
export class LimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitError";
  }
}

/** 表の名前（キーは版ごとに `egosearch:v<版>:<表>`）。表を足すときはここに足す（wipeKv もこれで消す） */
export const TABLE_NAMES = [
  "chips",
  "favorites",
  "groups",
  "history",
  "prefs",
] as const;

type TableName = (typeof TABLE_NAMES)[number];

const keyOf = (table: TableName, version = SCHEMA_VERSION) =>
  `egosearch:v${version}:${table}`;

/** 1つのキーに配列で持つ表 */
class Table<T> {
  private readonly key: string;
  private readonly schema: z.ZodType<T[]>;
  constructor(
    private readonly kv: KeyValueAdapter,
    name: TableName,
    row: z.ZodType<T>,
  ) {
    this.key = keyOf(name);
    this.schema = z.array(row);
  }
  async all(): Promise<T[]> {
    const raw = await this.kv.get(this.key);
    if (raw === null) return [];
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new StorageCorruptError(this.key, e);
    }
    const r = this.schema.safeParse(json);
    if (!r.success) throw new StorageCorruptError(this.key, r.error);
    return r.data;
  }
  /** 書く前に検証する（不正なデータを保存しない） */
  async write(rows: T[]): Promise<void> {
    await this.kv.set(this.key, JSON.stringify(this.schema.parse(rows)));
  }
}

type Row = {
  id: string;
  order: number;
  deletedAt: string | null;
};

const byOrder = <T extends Row>(a: T, b: T) => a.order - b.order;
const active = <T extends Row>(rows: T[]) =>
  rows.filter((r) => r.deletedAt === null).sort(byOrder);
const nextOrder = (rows: Row[]) =>
  rows.reduce((m, r) => Math.max(m, r.order + 1), 0);

/** 追加または更新した行の配列を返す（order を省略した新規は末尾） */
function upsert<T extends Row>(rows: T[], item: Saveable<T>, scope: T[]): T[] {
  const i = rows.findIndex((r) => r.id === item.id);
  const order = item.order ?? (i >= 0 ? rows[i].order : nextOrder(scope));
  const row = { ...item, order } as T;
  return i >= 0 ? rows.map((r, j) => (j === i ? row : r)) : [...rows, row];
}

/** 削除済みのうち、上限を超えた古いものを完全削除する（種類＝表ごと） */
function pruneTrash<T extends Row>(rows: T[]): T[] {
  const deleted = rows
    .filter((r) => r.deletedAt !== null)
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));
  const drop = new Set(deleted.slice(LIMITS.trash).map((r) => r.id));
  return rows.filter((r) => !drop.has(r.id));
}

function softDeleteRows<T extends Row>(rows: T[], id: string, at: string) {
  return pruneTrash(
    rows.map((r) => (r.id === id ? { ...r, deletedAt: at } : r)),
  );
}

function reorderRows<T extends Row>(rows: T[], ids: string[]): T[] {
  return rows.map((r) => {
    const i = ids.indexOf(r.id);
    return i >= 0 ? { ...r, order: i } : r;
  });
}

function crud<T extends Row>(table: Table<T>): CrudRepo<T> {
  return {
    list: async () => active(await table.all()),
    get: async (id) => (await table.all()).find((r) => r.id === id) ?? null,
    save: async (item) => {
      const rows = await table.all();
      await table.write(upsert(rows, item, rows));
    },
    softDelete: async (id, at) =>
      table.write(softDeleteRows(await table.all(), id, at)),
    reorder: async (ids) => table.write(reorderRows(await table.all(), ids)),
  };
}

const chipLimitMessage = `条件ボタンが上限（${LIMITS.chips}件）です。不要なボタンを削除してください`;

export function createKvDao(kv: KeyValueAdapter): Dao {
  const chips = new Table(kv, "chips", ChipSchema);
  const favorites = new Table(kv, "favorites", FavoriteSchema);
  const groups = new Table(kv, "groups", GroupSchema);
  const history = new Table(kv, "history", HistorySchema);
  const prefsKey = keyOf("prefs");

  const activeIn = (rows: Chip[], interestId: InterestId) =>
    active(rows.filter((c) => c.interestId === interestId));

  const tables = { chip: chips, favorite: favorites, group: groups } as const;

  return {
    chips: {
      listByInterest: async (interestId) =>
        activeIn(await chips.all(), interestId),
      listAllByInterest: async () => {
        const map = new Map<InterestId, Chip[]>();
        for (const c of active(await chips.all())) {
          map.set(c.interestId, [...(map.get(c.interestId) ?? []), c]);
        }
        return map;
      },
      get: async (id) => (await chips.all()).find((c) => c.id === id) ?? null,
      save: async (chip) => {
        const rows = await chips.all();
        const inInterest = rows.filter((c) => c.interestId === chip.interestId);
        const exists = rows.some((c) => c.id === chip.id);
        if (!exists && active(inInterest).length >= LIMITS.chips)
          throw new LimitError(chipLimitMessage);
        await chips.write(upsert(rows, chip, inInterest));
      },
      softDelete: async (id, at) =>
        chips.write(softDeleteRows(await chips.all(), id, at)),
      // 並べ替えるのは、その興味の対象のボタンだけ（他の対象の ID が混ざっていても無視する）
      reorder: async (interestId, ids) => {
        const rows = await chips.all();
        const own = new Set(
          rows.filter((c) => c.interestId === interestId).map((c) => c.id),
        );
        await chips.write(
          reorderRows(
            rows,
            ids.filter((id) => own.has(id)),
          ),
        );
      },
    },
    favorites: crud(favorites),
    groups: crud(groups),
    history: {
      list: async () =>
        (await history.all()).sort((a, b) => b.at.localeCompare(a.at)),
      add: async (item: HistoryItem) => {
        const rows = [...(await history.all()), item]
          .sort((a, b) => b.at.localeCompare(a.at))
          .slice(0, LIMITS.history);
        await history.write(rows);
      },
      clear: async () => history.write([]),
    },
    trash: {
      list: async () => {
        const entries: TrashEntry[] = [];
        for (const c of await chips.all())
          if (c.deletedAt)
            entries.push({
              kind: "chip",
              id: c.id,
              name: c.label,
              deletedAt: c.deletedAt,
            });
        for (const f of await favorites.all())
          if (f.deletedAt)
            entries.push({
              kind: "favorite",
              id: f.id,
              name: f.name,
              deletedAt: f.deletedAt,
            });
        for (const g of await groups.all())
          if (g.deletedAt)
            entries.push({
              kind: "group",
              id: g.id,
              name: g.name,
              deletedAt: g.deletedAt,
            });
        return entries.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
      },
      restore: async (kind: TrashKind, id: string) => {
        if (kind === "chip") {
          const rows = await chips.all();
          const target = rows.find((c) => c.id === id);
          if (!target) return;
          if (activeIn(rows, target.interestId).length >= LIMITS.chips)
            throw new LimitError(chipLimitMessage);
          await chips.write(
            rows.map((c) => (c.id === id ? { ...c, deletedAt: null } : c)),
          );
          return;
        }
        // 元の位置（order）は削除しても残しているので、deletedAt を外すだけで元の位置に戻る
        if (kind === "favorite") {
          const rows = await favorites.all();
          await favorites.write(
            rows.map((r) => (r.id === id ? { ...r, deletedAt: null } : r)),
          );
        } else {
          const rows = await groups.all();
          await groups.write(
            rows.map((r) => (r.id === id ? { ...r, deletedAt: null } : r)),
          );
        }
      },
      purge: async (kind, id) => {
        const t = tables[kind] as Table<Row>;
        await t.write(
          (await t.all()).filter((r) => !(r.id === id && r.deletedAt)),
        );
      },
      purgeKind: async (kind) => {
        const t = tables[kind] as Table<Row>;
        await t.write((await t.all()).filter((r) => r.deletedAt === null));
      },
      purgeAll: async () => {
        for (const t of Object.values(tables) as Table<Row>[])
          await t.write((await t.all()).filter((r) => r.deletedAt === null));
      },
    },
    prefs: {
      get: async () => {
        const raw = await kv.get(prefsKey);
        if (raw === null) return DEFAULT_PREFS;
        try {
          return PrefsSchema.parse({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
        } catch (e) {
          throw new StorageCorruptError(prefsKey, e);
        }
      },
      set: async (patch) => {
        const raw = await kv.get(prefsKey);
        const cur = raw === null ? DEFAULT_PREFS : JSON.parse(raw);
        await kv.set(
          prefsKey,
          JSON.stringify(
            PrefsSchema.parse({ ...DEFAULT_PREFS, ...cur, ...patch }),
          ),
        );
      },
    },
  };
}

/** 保存データを最新のバージョンへ移行してから、DAO を開く */
export async function openDao(
  kv: KeyValueAdapter,
  opts: { migrations?: Migration[] } = {},
): Promise<Dao> {
  await migrate(kv, opts.migrations);
  return createKvDao(kv);
}

/**
 * 保存データをすべて、キーの名前で消す（版1〜今の版のすべての表と meta）。
 * 壊れたデータ（CORRUPT）をユーザーが確かめて初期化するときだけ使う（docs/requirements.md F12）。
 * スキーマの検証を通さず生のキーを消すので、DAO を開かずに呼べる。無関係のキーは消さない。
 */
export async function wipeKv(kv: KeyValueAdapter): Promise<void> {
  for (let v = 1; v <= SCHEMA_VERSION; v++)
    for (const t of TABLE_NAMES) await kv.remove(keyOf(t, v));
  await kv.remove(META_KEY);
}
