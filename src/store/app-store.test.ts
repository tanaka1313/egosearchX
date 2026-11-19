// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ApiError, EMPTY_DETAIL, EMPTY_PERIOD, type RunPlan } from "@/api";
import { createBackend } from "@/backend";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { createAppStore } from "./app-store";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

let n = 0;
const newId = () => `id-${++n}`;
const setup = (kv = new MemoryAdapter()) => {
  const api = createBackend({ kv, clock, newId });
  const store = createAppStore(api);
  return { kv, api, store };
};
const ready = async (kv = new MemoryAdapter()) => {
  const s = setup(kv);
  await s.store.getState().init();
  return s;
};
const dump = async (kv: MemoryAdapter) =>
  Promise.all(
    [
      "egosearch:meta",
      "egosearch:v2:chips",
      "egosearch:v2:favorites",
      "egosearch:v2:groups",
      "egosearch:v2:history",
      "egosearch:v2:prefs",
    ].map((k) => kv.get(k)),
  );

const plan = (query: string): RunPlan => ({
  targets: [{ engine: "x", url: "u", query, stored: query, warnings: [] }],
  warnings: [],
});

describe("init", () => {
  it("読み込み前は loading で、読み込み後は ready とプリセットの条件ボタンを持つ", async () => {
    const { store } = setup();
    expect(store.getState().status).toBe("loading");
    await store.getState().init();
    const s = store.getState();
    expect(s.status).toBe("ready");
    expect(s.chips.get("hololive")?.length).toBeGreaterThan(0);
  });
  it("2回呼んでも読み込みは1回だけ（再実行しても状態の参照が変わらない）", async () => {
    const { store } = await ready();
    const chips = store.getState().chips;
    await store.getState().init();
    expect(store.getState().chips).toBe(chips);
  });
  it("再読み込み後も保存したデータが残る", async () => {
    const a = await ready();
    const fav = await a.store.getState().favorites_save({
      name: "ぺこら",
      query: "ぺこら",
      engine: "x",
    });
    await a.store.getState().groups_save({
      name: "朝",
      items: [{ query: "ぺこら", engine: "x" }],
    });
    await a.store.getState().prefs_set({ interest: "other" });

    const b = await ready(a.kv);
    const s = b.store.getState();
    expect(s.favorites.map((f) => f.id)).toEqual([fav.id]);
    expect(s.groups.map((g) => g.name)).toEqual(["朝"]);
    expect(s.prefs?.interest).toBe("other");
  });
});

describe("壊れたデータ", () => {
  const corrupt = async () => {
    const kv = new MemoryAdapter();
    await ready(kv); // 一度正常に初期化してから壊す
    await kv.set("egosearch:v2:favorites", "{壊れた");
    return setup(kv);
  };
  it("init は reject せず status が corrupt になる", async () => {
    const { store } = await corrupt();
    await store.getState().init();
    expect(store.getState().status).toBe("corrupt");
  });
  it("corrupt の間は、操作しても保存データを1バイトも書き換えない", async () => {
    const { kv, store } = await corrupt();
    await store.getState().init();
    const before = await dump(kv);
    const s = store.getState();
    await expect(
      s.favorites_save({ name: "x", query: "x", engine: "x" }),
    ).rejects.toMatchObject({ code: "CORRUPT" });
    await expect(s.prefs_set({ interest: "other" })).rejects.toMatchObject({
      code: "CORRUPT",
    });
    expect(await dump(kv)).toEqual(before);
  });
});

describe("data_reset（壊れたデータの初期化）", () => {
  it("corrupt のとき、保存データを破棄して ready になり、プリセットが入る", async () => {
    const kv = new MemoryAdapter();
    await ready(kv);
    await kv.set("egosearch:v2:favorites", "{壊れた");
    const { store } = setup(kv);
    await store.getState().init();
    expect(store.getState().status).toBe("corrupt");

    await store.getState().data_reset();
    const s = store.getState();
    expect(s.status).toBe("ready");
    expect(s.chips.get("hololive")?.length).toBeGreaterThan(0);
    expect(s.favorites).toEqual([]);
    expect(s.prefs).not.toBeNull();
    // 以降は通常どおり保存できる
    await s.favorites_save({ name: "a", query: "a", engine: "x" });
    expect(store.getState().favorites).toHaveLength(1);
  });
  it("ready のときは throw し、保存データを1バイトも消さない", async () => {
    const { kv, store } = await ready();
    await store
      .getState()
      .favorites_save({ name: "a", query: "a", engine: "x" });
    const before = await dump(kv);
    await expect(store.getState().data_reset()).rejects.toThrow();
    expect(await dump(kv)).toEqual(before);
    expect(store.getState().favorites).toHaveLength(1);
  });
});

describe("戻り値の反映", () => {
  it("chips_setOn は該当の条件ボタンだけを変える", async () => {
    const { store } = await ready();
    const list = store.getState().chips.get("hololive")!;
    const [first, second] = list;
    await store.getState().chips_setOn(first.id, !first.on);
    const after = store.getState().chips.get("hololive")!;
    expect(after.find((c) => c.id === first.id)?.on).toBe(!first.on);
    expect(after.find((c) => c.id === second.id)).toEqual(second);
    expect(after.map((c) => c.id)).toEqual(list.map((c) => c.id));
  });
  it("chips_save の新規は末尾に入る", async () => {
    const { store } = await ready();
    const chip = await store.getState().chips_save({
      interestId: "hololive",
      label: "新規",
      query: "新規語",
    });
    const list = store.getState().chips.get("hololive")!;
    expect(list.at(-1)?.id).toBe(chip.id);
  });
  it("chips_remove は一覧から消える（削除済みへ移る）", async () => {
    const { store } = await ready();
    const target = store.getState().chips.get("hololive")![0];
    await store.getState().chips_remove(target.id);
    expect(
      store
        .getState()
        .chips.get("hololive")!
        .some((c) => c.id === target.id),
    ).toBe(false);
  });
  it("history_record の後に履歴が増える", async () => {
    const { store } = await ready();
    await store.getState().history_record(plan("ぺこら"), {
      kind: "home",
      label: "ホーム",
    });
    expect(store.getState().history.map((h) => h.query)).toEqual(["ぺこら"]);
  });
  it("上限を超えた操作は LIMIT で throw し、状態を変えない", async () => {
    const { api, store } = await ready();
    const limit = api.limits.chips;
    const before = store.getState().chips;
    let err: unknown;
    for (
      let i = store.getState().chips.get("hololive")!.length;
      i <= limit;
      i++
    ) {
      try {
        await store.getState().chips_save({
          interestId: "hololive",
          label: `c${i}`,
          query: `q${i}`,
        });
      } catch (e) {
        err = e;
      }
    }
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("LIMIT");
    expect(store.getState().chips.get("hololive")!.length).toBe(limit);
    expect(before).not.toBe(store.getState().chips);
  });
});

describe("お気に入りといつものエゴサ", () => {
  const withGroup = async () => {
    const s = await ready();
    const fav = await s.store.getState().favorites_save({
      name: "ぺこら",
      query: "ぺこら",
      engine: "x",
    });
    const group = await s.store.getState().groups_save({
      name: "朝",
      items: [{ query: "ぺこら", engine: "x" }],
    });
    return { ...s, fav, group };
  };
  it("お気に入りを削除しても、いつものエゴサは変わらない", async () => {
    const { store, fav, group } = await withGroup();
    const groups = store.getState().groups;
    await store.getState().favorites_remove(fav.id);
    expect(store.getState().favorites).toEqual([]);
    expect(store.getState().groups).toEqual(groups);
    expect(store.getState().groups[0].id).toBe(group.id);
  });
  it("お気に入りを編集すると、一致するいつものエゴサの項目が更新される", async () => {
    const { store, fav } = await withGroup();
    const res = await store
      .getState()
      .favorites_update(fav.id, { query: "ぺこら -RT" });
    expect(res.count).toBe(1);
    expect(store.getState().favorites[0].query).toBe("ぺこら -RT");
    expect(store.getState().groups[0].items[0].query).toBe("ぺこら -RT");
  });
  it("undo でお気に入りといつものエゴサが両方戻る", async () => {
    const { store, fav } = await withGroup();
    const res = await store
      .getState()
      .favorites_update(fav.id, { query: "ぺこら -RT" });
    await store.getState().undo(res.undo);
    expect(store.getState().favorites[0].query).toBe("ぺこら");
    expect(store.getState().groups[0].items[0].query).toBe("ぺこら");
  });
});

describe("home（ホームの検索の組み立て。保存しない）", () => {
  it("初期値は空の検索で、読み込みの前後で変わらない", async () => {
    const { store } = setup();
    expect(store.getState().home).toEqual({
      word: "",
      exact: false,
      detail: EMPTY_DETAIL,
      period: EMPTY_PERIOD,
      suggestionTokens: [],
    });
    await store.getState().init();
    expect(store.getState().home.word).toBe("");
  });
  it("home_set は指定した項目だけを変え、ほかは残す", async () => {
    const { store } = await ready();
    store.getState().home_set({ word: "ぺこら" });
    store.getState().home_set({ exact: true });
    expect(store.getState().home).toMatchObject({
      word: "ぺこら",
      exact: true,
      suggestionTokens: [],
    });
  });
  it("保存しない：home_set は kv を1バイトも変えない", async () => {
    const { kv, store } = await ready();
    const before = await dump(kv);
    store.getState().home_set({
      word: "ぺこら",
      period: { kind: "d1", from: "", to: "" },
      suggestionTokens: ["min_faves:10"],
    });
    expect(await dump(kv)).toEqual(before);
  });
  it("データが壊れている間も、検索の組み立てはできる（書き込みではない）", async () => {
    const kv = new MemoryAdapter();
    await kv.set("egosearch:meta", "{broken");
    const { store } = setup(kv);
    await store.getState().init();
    expect(store.getState().status).toBe("corrupt");
    store.getState().home_set({ word: "あ" });
    expect(store.getState().home.word).toBe("あ");
  });
});
