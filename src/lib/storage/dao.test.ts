import { beforeEach, describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/limits";
import { LocalStorageAdapter, MemoryAdapter } from "./kv-adapter";
import { StorageCorruptError, LimitError, openDao } from "./kv-dao";
import type { Migration } from "./migrate";
import type { Chip, Favorite, Group } from "./schema";
import type { Dao } from "./types";

const T0 = "2026-11-18T00:00:00.000Z";
const T1 = "2026-11-18T01:00:00.000Z";

const chip = (id: string, interestId = "hololive", query = id): Chip => ({
  id,
  interestId,
  label: id,
  query,
  on: false,
  visible: true,
  isPreset: false,
  order: 0,
  createdAt: T0,
  updatedAt: T0,
  deletedAt: null,
});
const fav = (id: string, query = id): Favorite => ({
  id,
  name: id,
  query,
  engine: "x",
  order: 0,
  lastRunAt: null,
  createdAt: T0,
  updatedAt: T0,
  deletedAt: null,
});
const group = (id: string, queries: string[] = []): Group => ({
  id,
  name: id,
  items: queries.map((query) => ({ query, engine: "x" })),
  order: 0,
  createdAt: T0,
  updatedAt: T0,
  deletedAt: null,
});

describe("DAO（KeyValue の上のリポジトリ）", () => {
  let dao: Dao;
  beforeEach(async () => {
    dao = await openDao(new MemoryAdapter());
  });

  it("条件ボタンは興味の対象ごとに分かれ、order 順に返る", async () => {
    await dao.chips.save(chip("a"));
    await dao.chips.save(chip("b"));
    await dao.chips.save(chip("n", "nijisanji"));
    expect(
      (await dao.chips.listByInterest("hololive")).map((c) => c.id),
    ).toEqual(["a", "b"]);
    const all = await dao.chips.listAllByInterest();
    expect(all).toBeInstanceOf(Map);
    expect(all.get("nijisanji")?.map((c) => c.id)).toEqual(["n"]);
  });

  it("新規の order は末尾に付き、reorder で並びを変えられる", async () => {
    await dao.chips.save(chip("a"));
    await dao.chips.save(chip("b"));
    await dao.chips.save(chip("c"));
    await dao.chips.reorder("hololive", ["c", "a", "b"]);
    expect(
      (await dao.chips.listByInterest("hololive")).map((c) => c.id),
    ).toEqual(["c", "a", "b"]);
  });

  it("既存の保存は上書き（upsert）で、件数は増えない", async () => {
    await dao.favorites.save(fav("f1", "a"));
    await dao.favorites.save({ ...fav("f1", "b"), updatedAt: T1 });
    const list = await dao.favorites.list();
    expect(list).toHaveLength(1);
    expect(list[0].query).toBe("b");
  });

  it("条件ボタンの上限は興味の対象ごとに数える", async () => {
    for (let i = 0; i < LIMITS.chips; i++) await dao.chips.save(chip(`h${i}`));
    await expect(dao.chips.save(chip("over"))).rejects.toBeInstanceOf(
      LimitError,
    );
    // 別の対象には追加できる
    await expect(
      dao.chips.save(chip("n", "nijisanji")),
    ).resolves.toBeUndefined();
    // 既存の更新は上限に関係しない
    await expect(
      dao.chips.save({ ...chip("h0"), label: "変更" }),
    ).resolves.toBeUndefined();
  });

  describe("削除済み（deletedAt による論理削除）", () => {
    it("削除すると一覧から消え、削除済みに出て、復元すると元の位置に戻る", async () => {
      await dao.favorites.save(fav("f1"));
      await dao.favorites.save(fav("f2"));
      await dao.favorites.save(fav("f3"));
      await dao.favorites.softDelete("f2", T1);
      expect((await dao.favorites.list()).map((f) => f.id)).toEqual([
        "f1",
        "f3",
      ]);
      expect(await dao.trash.list()).toEqual([
        { kind: "favorite", id: "f2", name: "f2", deletedAt: T1 },
      ]);
      await dao.trash.restore("favorite", "f2");
      expect((await dao.favorites.list()).map((f) => f.id)).toEqual([
        "f1",
        "f2",
        "f3",
      ]);
    });

    it("種類ごとに上限を超えたら、その種類の古いものから完全削除する", async () => {
      for (let i = 0; i <= LIMITS.trash; i++) {
        await dao.groups.save(group(`g${i}`));
        await dao.groups.softDelete(
          `g${i}`,
          new Date(Date.UTC(2026, 10, 18, 0, i)).toISOString(),
        );
      }
      await dao.favorites.save(fav("f1"));
      await dao.favorites.softDelete("f1", T1);
      const trash = await dao.trash.list();
      const groups = trash.filter((t) => t.kind === "group");
      expect(groups).toHaveLength(LIMITS.trash);
      expect(groups.some((t) => t.id === "g0")).toBe(false);
      // 別の種類は影響を受けない
      expect(trash.filter((t) => t.kind === "favorite")).toHaveLength(1);
    });

    it("条件ボタンの復元は、戻す先の興味の対象の上限で判定する", async () => {
      await dao.chips.save(chip("x"));
      await dao.chips.softDelete("x", T1);
      for (let i = 0; i < LIMITS.chips; i++)
        await dao.chips.save(chip(`h${i}`));
      await expect(dao.trash.restore("chip", "x")).rejects.toBeInstanceOf(
        LimitError,
      );
    });

    it("完全削除は、その1件・種類ごと・全体を選べる", async () => {
      await dao.favorites.save(fav("f1"));
      await dao.favorites.save(fav("f2"));
      await dao.chips.save(chip("c1"));
      await dao.favorites.softDelete("f1", T1);
      await dao.favorites.softDelete("f2", T1);
      await dao.chips.softDelete("c1", T1);
      await dao.trash.purge("favorite", "f1");
      expect((await dao.trash.list()).map((t) => t.id).sort()).toEqual([
        "c1",
        "f2",
      ]);
      await dao.trash.purgeKind("favorite");
      expect((await dao.trash.list()).map((t) => t.id)).toEqual(["c1"]);
      await dao.trash.purgeAll();
      expect(await dao.trash.list()).toEqual([]);
    });
  });

  it("履歴は新しい順で、上限を超えたら古いものから消える", async () => {
    for (let i = 0; i < LIMITS.history + 2; i++) {
      await dao.history.add({
        id: `h${i}`,
        at: new Date(Date.UTC(2026, 10, 18, 0, 0, i)).toISOString(),
        query: "a since:2026-11-17",
        engine: "x",
        source: { kind: "home", label: "ホーム" },
      });
    }
    const list = await dao.history.list();
    expect(list).toHaveLength(LIMITS.history);
    expect(list[0].id).toBe(`h${LIMITS.history + 1}`);
    await dao.history.clear();
    expect(await dao.history.list()).toEqual([]);
  });

  it("設定は既定値を持ち、一部だけ更新できる", async () => {
    expect(await dao.prefs.get()).toEqual({
      interest: "hololive",
      lang: "ja",
      favOpen: false,
    });
    await dao.prefs.set({ interest: "other" });
    expect((await dao.prefs.get()).interest).toBe("other");
  });

  it("不正なデータは保存しない（zod で検証）", async () => {
    await expect(
      dao.favorites.save({ ...fav("f1"), engine: "google" as "x" }),
    ).rejects.toThrow();
  });
});

describe("保存先の差し替えと移行", () => {
  it("壊れた JSON は StorageCorruptError にし、上書きしない", async () => {
    const kv = new MemoryAdapter();
    await kv.set("egosearch:v1:favorites", "{壊れた");
    const dao = await openDao(kv);
    await expect(dao.favorites.list()).rejects.toBeInstanceOf(
      StorageCorruptError,
    );
    expect(await kv.get("egosearch:v1:favorites")).toBe("{壊れた");
  });

  it("スキーマに合わないデータも StorageCorruptError", async () => {
    const kv = new MemoryAdapter();
    await kv.set("egosearch:v1:favorites", JSON.stringify([{ id: 1 }]));
    const dao = await openDao(kv);
    await expect(dao.favorites.list()).rejects.toBeInstanceOf(
      StorageCorruptError,
    );
  });

  it("古いバージョンのデータを、順に移行してから開く", async () => {
    const kv = new MemoryAdapter();
    await kv.set("egosearch:meta", JSON.stringify({ version: 0 }));
    await kv.set("old-favs", JSON.stringify([{ id: "f1", name: "n", q: "a" }]));
    const migrations: Migration[] = [
      {
        to: 1,
        run: async (a) => {
          const old = JSON.parse((await a.get("old-favs")) ?? "[]") as {
            id: string;
            name: string;
            q: string;
          }[];
          await a.set(
            "egosearch:v1:favorites",
            JSON.stringify(
              old.map((o, i) => ({
                ...fav(o.id, o.q),
                name: o.name,
                order: i,
              })),
            ),
          );
          await a.remove("old-favs");
        },
      },
    ];
    const dao = await openDao(kv, { migrations });
    expect((await dao.favorites.list())[0]).toMatchObject({
      id: "f1",
      query: "a",
    });
    expect(JSON.parse((await kv.get("egosearch:meta")) ?? "{}")).toEqual({
      version: 1,
    });
    expect(await kv.get("old-favs")).toBeNull();
  });

  it("新しいバージョンで保存されたデータは開かない（古いアプリで壊さない）", async () => {
    const kv = new MemoryAdapter();
    await kv.set("egosearch:meta", JSON.stringify({ version: 99 }));
    await expect(openDao(kv)).rejects.toThrow(/新しいバージョン/);
  });

  it("localStorage に保存したデータは、開き直しても残る", async () => {
    localStorage.clear();
    const a = await openDao(new LocalStorageAdapter(localStorage));
    await a.favorites.save(fav("f1", "a b"));
    await a.groups.save(group("g1", ["a b"]));
    const b = await openDao(new LocalStorageAdapter(localStorage));
    expect((await b.favorites.list()).map((f) => f.id)).toEqual(["f1"]);
    expect((await b.groups.list())[0].items).toEqual([
      { query: "a b", engine: "x" },
    ]);
  });
});
