/**
 * `data`（async。保存を伴うユースケース）。DAO の上に、上限・連動・プリセット・ID と日時を足す（docs/api-spec.md 4.5）。
 * DAO は最初の呼び出しで1回だけ開く。初回（meta が無い）のときだけ、すべての興味の対象にプリセットを入れる。
 */
import {
  ApiError,
  LIMITS,
  type AppData,
  type Chip,
  type Clock,
  type DataApi,
  type Favorite,
  type Group,
  type HistoryItem,
  type InterestId,
  type Lang,
  type TrashDetail,
  type TrashKind,
} from "@/api";
import { interests, presetsFor } from "@/data";
import { labelFromQuery } from "@/lib/query/chip";
import {
  applyFavEdit,
  chipConds,
  condsToQuery,
  condToken,
  normalize,
} from "@/lib/query/model";
import type { KeyValueAdapter } from "@/lib/storage/kv-adapter";
import { openDao, wipeKv } from "@/lib/storage/kv-dao";
import { META_KEY } from "@/lib/storage/migrate";
import type { Dao } from "@/lib/storage/types";
import { guarded, migrationError } from "./errors";

type Deps = {
  kv: KeyValueAdapter;
  clock: Clock;
  newId: () => string;
  /** 初回にプリセットを足すときの言語（まだ prefs が無いので、ブラウザの言語を渡す） */
  initialLang: () => Lang;
};

const notFound = () => new ApiError("NOT_FOUND");
const invalid = (field: string) => new ApiError("INVALID", { field });

export function createDataApi({
  kv,
  clock,
  newId,
  initialLang,
}: Deps): DataApi {
  let opened: Promise<Dao> | null = null;

  /** 初回の判定は、`openDao` が meta を書く前に行う（「条件ボタンが0件」では判定しない） */
  const open = (): Promise<Dao> => {
    opened ??= (async () => {
      const first = (await kv.get(META_KEY)) === null;
      let dao: Dao;
      try {
        dao = await openDao(kv);
      } catch (e) {
        throw migrationError(e);
      }
      if (first)
        for (const id of interests().keys())
          await addPresets(dao, id, initialLang());
      return dao;
    })().catch((e: unknown) => {
      opened = null; // 失敗は覚えない（直したあと、再読み込みなしで読み直せる）
      throw e;
    });
    return opened;
  };

  const newChip = (
    interestId: InterestId,
    label: string,
    query: string,
    isPreset: boolean,
  ): Omit<Chip, "order"> => ({
    id: newId(),
    interestId,
    label,
    query,
    on: false,
    visible: true,
    isPreset,
    createdAt: clock.now(),
    updatedAt: clock.now(),
    deletedAt: null,
  });

  /**
   * プリセットのうち、正規化した検索文字列が一致する（削除済みを除く）ボタンが無いものを、上限まで足す。
   * ラベルは、足すときの言語のものを保存する（あとで言語を切り替えても、保存したボタンは変わらない）。
   */
  async function addPresets(
    dao: Dao,
    interestId: InterestId,
    lang: Lang,
  ): Promise<Chip[]> {
    if (!interests().has(interestId)) throw notFound();
    const have = await dao.chips.listByInterest(interestId);
    const keys = new Set(have.map((c) => normalize(c.query)));
    const added: Chip[] = [];
    let count = have.length;
    for (const p of presetsFor(interestId)) {
      const key = normalize(p.query);
      if (count >= LIMITS.chips) break;
      if (keys.has(key)) continue;
      keys.add(key);
      const chip = {
        ...newChip(interestId, p.label[lang], p.query, true),
        on: p.on,
        visible: p.visible,
      };
      await dao.chips.save(chip);
      added.push((await dao.chips.get(chip.id))!);
      count++;
    }
    return added;
  }

  const activeChip = async (dao: Dao, id: string): Promise<Chip> => {
    const c = await dao.chips.get(id);
    if (!c || c.deletedAt) throw notFound();
    return c;
  };
  const activeFavorite = async (dao: Dao, id: string): Promise<Favorite> => {
    const f = await dao.favorites.get(id);
    if (!f || f.deletedAt) throw notFound();
    return f;
  };
  const activeGroup = async (dao: Dao, id: string): Promise<Group> => {
    const g = await dao.groups.get(id);
    if (!g || g.deletedAt) throw notFound();
    return g;
  };

  const updateChip = async (dao: Dao, id: string, patch: Partial<Chip>) => {
    const c = await activeChip(dao, id);
    await dao.chips.save({ ...c, ...patch, updatedAt: clock.now() });
    return (await dao.chips.get(id))!;
  };

  /** 削除済みの行を返す（無い・削除済みでないなら NOT_FOUND） */
  const deleted = async (
    dao: Dao,
    kind: TrashKind,
    id: string,
  ): Promise<TrashDetail> => {
    const detail: TrashDetail | null =
      kind === "chip"
        ? await dao.chips.get(id).then((chip) => (chip ? { kind, chip } : null))
        : kind === "favorite"
          ? await dao.favorites
              .get(id)
              .then((favorite) => (favorite ? { kind, favorite } : null))
          : await dao.groups
              .get(id)
              .then((group) => (group ? { kind, group } : null));
    const row =
      detail &&
      (detail.kind === "chip"
        ? detail.chip
        : detail.kind === "favorite"
          ? detail.favorite
          : detail.group);
    if (!detail || !row?.deletedAt) throw notFound();
    return detail;
  };

  const saveFavorite = async (
    dao: Dao,
    input: { name: string; query: string; engine: Favorite["engine"] },
  ): Promise<Favorite> => {
    const fav = {
      id: newId(),
      ...input,
      lastRunAt: null,
      createdAt: clock.now(),
      updatedAt: clock.now(),
      deletedAt: null,
    };
    await dao.favorites.save(fav);
    return (await dao.favorites.get(fav.id))!;
  };

  const checkGroup = (name: string, itemCount: number) => {
    if (!name.trim()) throw invalid("name");
    if (itemCount === 0) throw invalid("items");
  };

  const load = async (dao: Dao): Promise<AppData> => ({
    prefs: await dao.prefs.get(),
    chips: await dao.chips.listAllByInterest(),
    favorites: await dao.favorites.list(),
    groups: await dao.groups.list(),
    history: await dao.history.list(),
  });

  const api: DataApi = {
    init: async () => load(await open()),
    reset: async () => {
      await wipeKv(kv);
      opened = null; // 破棄した後は、初回として開き直す（プリセットを入れる）
      return load(await open());
    },
    chips: {
      save: async (input) => {
        const dao = await open();
        const cur = input.id ? await activeChip(dao, input.id) : null;
        const chip = {
          ...(cur ?? newChip(input.interestId, "", "", false)),
          interestId: input.interestId,
          label: input.label,
          query: input.query,
          on: input.on ?? cur?.on ?? false,
          visible: input.visible ?? cur?.visible ?? true,
          updatedAt: clock.now(),
        };
        await dao.chips.save(chip);
        return (await dao.chips.get(chip.id))!;
      },
      setOn: async (id, on) => updateChip(await open(), id, { on }),
      setVisible: async (id, visible) =>
        updateChip(await open(), id, { visible }),
      setValue: async (id, condId, value) => {
        const dao = await open();
        const chip = await activeChip(dao, id);
        const conds = chipConds(chip);
        const cond = conds.find((c) => c.id === condId);
        if (!cond) throw notFound();
        if (
          cond.kind !== "number" &&
          cond.kind !== "date" &&
          cond.kind !== "text"
        )
          throw invalid("condId");
        if (!condToken({ ...cond, value })) throw invalid("value");
        const query = condsToQuery(
          conds.map((c) => (c.id === condId ? { ...c, value } : c)),
        );
        return updateChip(dao, id, { query, on: true });
      },
      reorder: async (interestId, ids) =>
        (await open()).chips.reorder(interestId, ids),
      remove: async (id) => {
        const dao = await open();
        await activeChip(dao, id);
        await dao.chips.softDelete(id, clock.now());
      },
      addPresets: async (interestId, lang) =>
        addPresets(await open(), interestId, lang),
      adoptSuggestion: async (interestId, token) => {
        const dao = await open();
        const chip = newChip(interestId, labelFromQuery(token), token, false);
        await dao.chips.save(chip);
        return (await dao.chips.get(chip.id))!;
      },
    },
    favorites: {
      save: async (input) => saveFavorite(await open(), input),
      update: async (id, patch) => {
        const dao = await open();
        const before = await activeFavorite(dao, id);
        const next: Favorite = {
          ...before,
          ...patch,
          updatedAt: clock.now(),
        };
        const groups = await dao.groups.list();
        const edit = applyFavEdit(
          groups,
          { query: before.query, engine: before.engine },
          { query: next.query, engine: next.engine },
        );
        const originals = groups.filter((g, i) => edit.groups[i] !== g);
        const changed = edit.groups
          .filter((g, i) => g !== groups[i])
          .map((g) => ({ ...g, updatedAt: clock.now() }));
        await dao.favorites.save(next);
        for (const g of changed) await dao.groups.save(g);
        return {
          favorite: (await dao.favorites.get(id))!,
          groups: changed,
          count: edit.count,
          undo: guarded(async () => {
            await dao.favorites.save(before);
            for (const g of originals) await dao.groups.save(g);
          }),
        };
      },
      reorder: async (ids) => (await open()).favorites.reorder(ids),
      remove: async (id) => {
        const dao = await open();
        await activeFavorite(dao, id);
        await dao.favorites.softDelete(id, clock.now());
      },
    },
    groups: {
      save: async (input) => {
        const dao = await open();
        checkGroup(input.name, input.items.length);
        const cur = input.id ? await activeGroup(dao, input.id) : null;
        const group = {
          id: cur?.id ?? newId(),
          name: input.name.trim(),
          items: input.items,
          lastRunAt: cur?.lastRunAt ?? null,
          createdAt: cur?.createdAt ?? clock.now(),
          updatedAt: clock.now(),
          deletedAt: null,
          ...(cur ? { order: cur.order } : {}),
        };
        await dao.groups.save(group);
        return (await dao.groups.get(group.id))!;
      },
      remove: async (id) => {
        const dao = await open();
        await activeGroup(dao, id);
        await dao.groups.softDelete(id, clock.now());
      },
    },
    saveSearch: async ({ favorite, target }) => {
      const dao = await open();
      // お気に入りを保存する前に、追加先を確かめる（失敗したときに片方だけ残さない）
      const existing =
        target.kind === "group" ? await activeGroup(dao, target.groupId) : null;
      if (target.kind === "newGroup" && !target.name.trim())
        throw invalid("name");
      const fav = await saveFavorite(dao, favorite);
      const item = { query: fav.query, engine: fav.engine };
      if (target.kind === "none") return { favorite: fav, group: null };
      const group = {
        id: existing?.id ?? newId(),
        name: existing?.name ?? (target as { name: string }).name.trim(),
        items: [...(existing?.items ?? []), item],
        lastRunAt: existing?.lastRunAt ?? null,
        createdAt: existing?.createdAt ?? clock.now(),
        updatedAt: clock.now(),
        deletedAt: null,
        ...(existing ? { order: existing.order } : {}),
      };
      await dao.groups.save(group);
      return { favorite: fav, group: (await dao.groups.get(group.id))! };
    },
    history: {
      record: async (plan, source) => {
        const dao = await open();
        const at = clock.now(); // 履歴と lastRunAt で同じ時刻にする
        const items: HistoryItem[] = plan.targets.map((t) => ({
          id: newId(),
          at,
          query: t.query,
          engine: t.engine,
          source: { kind: source.kind, label: source.label },
        }));
        for (const item of items) await dao.history.add(item);
        // lastRunAt：展開前の文字列が一致するお気に入りすべて（検索先は見ない）と、実行したいつものエゴサ。
        // 実行は編集ではないので updatedAt は動かさない。無い・削除済みの groupId は黙って飛ばす（もう開いた後）
        const stored = new Set(plan.targets.map((t) => normalize(t.stored)));
        for (const f of await dao.favorites.list())
          if (stored.has(normalize(f.query)))
            await dao.favorites.save({ ...f, lastRunAt: at });
        const group = source.groupId
          ? await dao.groups.get(source.groupId)
          : null;
        if (group && !group.deletedAt)
          await dao.groups.save({ ...group, lastRunAt: at });
        return items;
      },
      clear: async () => (await open()).history.clear(),
    },
    trash: {
      list: async () => (await open()).trash.list(),
      detail: async (kind, id) => deleted(await open(), kind, id),
      restore: async (kind, id) => {
        const dao = await open();
        await deleted(dao, kind, id);
        await dao.trash.restore(kind, id);
      },
      purge: async (kind, id) => {
        const dao = await open();
        await deleted(dao, kind, id);
        await dao.trash.purge(kind, id);
      },
      purgeKind: async (kind) => (await open()).trash.purgeKind(kind),
      purgeAll: async () => (await open()).trash.purgeAll(),
    },
    prefs: {
      set: async (patch) => {
        const dao = await open();
        if (patch.interest !== undefined && !interests().has(patch.interest))
          throw invalid("interest");
        await dao.prefs.set(patch);
        return dao.prefs.get();
      },
    },
  };

  return guardAll(api);
}

/** `data` のすべての async 関数に、エラーの変換をかける（`undo` は作った時点で包んである） */
function guardAll<T>(obj: T): T {
  if (typeof obj === "function")
    return guarded(obj as (...a: unknown[]) => Promise<unknown>) as T;
  if (obj && typeof obj === "object")
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, guardAll(v)]),
    ) as T;
  return obj;
}
