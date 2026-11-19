// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import {
  ApiError,
  EMPTY_DETAIL,
  EMPTY_PERIOD,
  LIMITS,
  type ApiErrorCode,
  type EgoSearchApi,
  type RunPlan,
} from "@/api";
import { interests, presetsFor } from "@/data";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { META_KEY } from "@/lib/storage/migrate";
import { createBackend } from "./index";

const NOW = "2026-11-19T03:00:00.000Z";
const clock = { today: () => "2026-11-19", now: () => NOW };

let n = 0;
const newId = () => `id-${++n}`;
const make = (kv = new MemoryAdapter()) => ({
  kv,
  api: createBackend({ kv, clock, newId }),
});

const code = async (p: Promise<unknown>): Promise<ApiErrorCode | "OK"> => {
  try {
    await p;
    return "OK";
  } catch (e) {
    if (e instanceof ApiError) return e.code;
    throw e;
  }
};

const state = (word: string) => ({
  word,
  exact: false,
  onChipIds: [],
  suggestionTokens: [],
  detail: EMPTY_DETAIL,
  period: EMPTY_PERIOD,
});

describe("data.init（初回のプリセット）", () => {
  it("初回は、すべての興味の対象にプリセットが入る", async () => {
    const { api } = make();
    const data = await api.data.init();
    for (const id of interests().keys()) {
      expect(data.chips.get(id)?.map((c) => c.query)).toEqual(
        presetsFor(id).map((p) => p.query),
      );
    }
    expect(data.chips.get("hololive")?.every((c) => c.isPreset)).toBe(true);
  });
  it("2回目以降は足さない。条件ボタンを全部削除しても戻らない", async () => {
    const { kv, api } = make();
    const first = await api.data.init();
    for (const c of first.chips.get("hololive") ?? [])
      await api.data.chips.remove(c.id);
    const again = await createBackend({ kv, clock, newId }).data.init();
    expect(again.chips.get("hololive") ?? []).toEqual([]);
  });
  it("プリセットの ID と日時はバックエンドが付ける", async () => {
    const { api } = make();
    const data = await api.data.init();
    const c = data.chips.get("hololive")![0];
    expect(c.id).toMatch(/^id-/);
    expect(c.createdAt).toBe(NOW);
    expect(c.deletedAt).toBeNull();
  });
});

describe("壊れた保存データ", () => {
  it("meta が壊れていると CORRUPT で、何も書かない", async () => {
    const kv = new MemoryAdapter();
    await kv.set(META_KEY, "{broken");
    const writes: string[] = [];
    const set = kv.set.bind(kv);
    kv.set = async (k, v) => {
      writes.push(k);
      return set(k, v);
    };
    const api = createBackend({ kv, clock, newId });
    expect(await code(api.data.init())).toBe("CORRUPT");
    expect(writes).toEqual([]);
  });
  it("表が壊れていると CORRUPT（params.key つき）で、上書きしない", async () => {
    const kv = new MemoryAdapter();
    await make(kv).api.data.init();
    await kv.set("egosearch:v2:favorites", "not json");
    const api = createBackend({ kv, clock, newId });
    const err = await api.data.init().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("CORRUPT");
    expect((err as ApiError).params?.key).toBe("egosearch:v2:favorites");
    expect(await kv.get("egosearch:v2:favorites")).toBe("not json");
  });
  it("今より新しい版で保存されたデータは CORRUPT と同じ扱い", async () => {
    const kv = new MemoryAdapter();
    await kv.set(META_KEY, JSON.stringify({ version: 999 }));
    expect(await code(createBackend({ kv, clock, newId }).data.init())).toBe(
      "CORRUPT",
    );
    expect(await kv.get(META_KEY)).toBe(JSON.stringify({ version: 999 }));
  });
});

describe("data.reset（壊れたデータの初期化）", () => {
  const corruptions: [string, (kv: MemoryAdapter) => Promise<void>][] = [
    ["表が壊れている", (kv) => kv.set("egosearch:v2:favorites", "not json")],
    ["meta が壊れている", (kv) => kv.set(META_KEY, "{broken")],
    [
      "今より新しい版で保存されている",
      (kv) => kv.set(META_KEY, JSON.stringify({ version: 999 })),
    ],
  ];
  it.each(corruptions)(
    "%s：reset するとプリセット入りの AppData を返し、読み直しても同じ",
    async (_name, corrupt) => {
      const kv = new MemoryAdapter();
      await make(kv).api.data.init();
      await kv.set("egosearch:v1:chips", "旧版の残り"); // 版1のキーも消える
      await kv.set("other:key", "keep");
      await corrupt(kv);
      const api = createBackend({ kv, clock, newId });
      expect(await code(api.data.init())).toBe("CORRUPT");

      const data = await api.data.reset();
      expect(data.chips.get("hololive")?.length).toBeGreaterThan(0);
      expect(data.favorites).toEqual([]);
      expect(await kv.get("egosearch:v1:chips")).toBeNull();
      expect(await kv.get("other:key")).toBe("keep");

      const again = await createBackend({ kv, clock, newId }).data.init();
      expect(again.chips).toEqual(data.chips);
    },
  );
  it("reset のあとは通常の操作ができる", async () => {
    const kv = new MemoryAdapter();
    await kv.set(META_KEY, "{broken");
    const api = createBackend({ kv, clock, newId });
    await api.data.reset();
    const fav = await api.data.favorites.save({
      name: "a",
      query: "a",
      engine: "x",
    });
    expect((await api.data.init()).favorites.map((f) => f.id)).toEqual([
      fav.id,
    ]);
  });
  it("CORRUPT の init は、何も書かず何も消さない", async () => {
    const kv = new MemoryAdapter();
    await kv.set(META_KEY, "{broken");
    const ops: string[] = [];
    for (const m of ["set", "remove"] as const) {
      const f = kv[m].bind(kv) as (...a: string[]) => Promise<void>;
      kv[m] = async (...a: string[]) => {
        ops.push(m);
        return f(...a);
      };
    }
    await code(createBackend({ kv, clock, newId }).data.init());
    expect(ops).toEqual([]);
  });
});

describe("data.chips", () => {
  let api: EgoSearchApi;
  beforeEach(async () => {
    api = make().api;
    await api.data.init();
  });
  const chipsOf = async () =>
    (await api.data.init()).chips.get("hololive") ?? [];

  it("追加すると、ID・日時が付き、末尾に並ぶ", async () => {
    const before = await chipsOf();
    const c = await api.data.chips.save({
      interestId: "hololive",
      label: "新規",
      query: "foo",
    });
    expect(c).toMatchObject({
      label: "新規",
      on: false,
      visible: true,
      isPreset: false,
    });
    expect((await chipsOf()).map((x) => x.id)).toEqual([
      ...before.map((x) => x.id),
      c.id,
    ]);
  });
  it("更新しても on・順序・プリセットの印は変わらない", async () => {
    const [first] = await chipsOf();
    const u = await api.data.chips.save({
      id: first.id,
      interestId: "hololive",
      label: "改名",
      query: first.query,
    });
    expect(u).toMatchObject({
      label: "改名",
      on: first.on,
      order: first.order,
      isPreset: true,
    });
  });
  it("上限を超える追加は LIMIT", async () => {
    const have = (await chipsOf()).length;
    for (let i = have; i < LIMITS.chips; i++)
      await api.data.chips.save({
        interestId: "hololive",
        label: `c${i}`,
        query: `q${i}`,
      });
    expect(
      await code(
        api.data.chips.save({ interestId: "hololive", label: "x", query: "x" }),
      ),
    ).toBe("LIMIT");
  });
  it("ラベルが20文字を超えると INVALID", async () => {
    expect(
      await code(
        api.data.chips.save({
          interestId: "hololive",
          label: "a".repeat(21),
          query: "x",
        }),
      ),
    ).toBe("INVALID");
  });
  it("無い ID は NOT_FOUND", async () => {
    expect(await code(api.data.chips.setOn("nope", true))).toBe("NOT_FOUND");
    expect(await code(api.data.chips.remove("nope"))).toBe("NOT_FOUND");
  });
  it("setOn・setVisible が反映される", async () => {
    const [first] = await chipsOf();
    expect((await api.data.chips.setOn(first.id, !first.on)).on).toBe(
      !first.on,
    );
    expect((await api.data.chips.setVisible(first.id, false)).visible).toBe(
      false,
    );
  });
  it("setValue は値付きの条件の値だけを書き換え、on にする", async () => {
    const fav = (await chipsOf()).find((c) => c.query === "min_faves:50")!;
    const cond = api.query.chipConds(fav)[0];
    const c = await api.data.chips.setValue(fav.id, cond.id, "100");
    expect(c).toMatchObject({ query: "min_faves:100", on: true });
  });
  it("setValue は不正な値・値付きでない条件を INVALID、無い条件を NOT_FOUND にする", async () => {
    const fav = (await chipsOf()).find((c) => c.query === "min_faves:50")!;
    const cond = api.query.chipConds(fav)[0];
    expect(await code(api.data.chips.setValue(fav.id, cond.id, "0"))).toBe(
      "INVALID",
    );
    const plain = (await chipsOf()).find(
      (c) => c.query === "-filter:retweets",
    )!;
    const pc = api.query.chipConds(plain)[0];
    expect(await code(api.data.chips.setValue(plain.id, pc.id, "x"))).toBe(
      "INVALID",
    );
    expect(await code(api.data.chips.setValue(fav.id, "zzz", "5"))).toBe(
      "NOT_FOUND",
    );
  });
  it("addPresets は、一致するものを足さず、削除済みは「無い」扱いにする", async () => {
    expect(await api.data.chips.addPresets("hololive")).toEqual([]);
    const target = (await chipsOf()).find((c) => c.query === "min_faves:50")!;
    await api.data.chips.remove(target.id);
    const added = await api.data.chips.addPresets("hololive");
    expect(added.map((c) => c.query)).toEqual(["min_faves:50"]);
    expect(added[0].isPreset).toBe(true);
  });
  it("addPresets は、トークンの順序の違いを同じ検索文字列とみなす", async () => {
    const target = (await chipsOf()).find((c) => c.query.includes(" "))!;
    const reversed = target.query.split(" ").reverse().join(" ");
    await api.data.chips.save({
      id: target.id,
      interestId: "hololive",
      label: target.label,
      query: reversed,
    });
    expect(await api.data.chips.addPresets("hololive")).toEqual([]);
  });
  it("addPresets は、知らない興味の対象を NOT_FOUND にする", async () => {
    expect(await code(api.data.chips.addPresets("nope"))).toBe("NOT_FOUND");
  });
  it("adoptSuggestion は、長い候補のラベルを20文字に収める", async () => {
    const token = "a".repeat(30);
    const c = await api.data.chips.adoptSuggestion("hololive", token);
    expect(c.query).toBe(token);
    expect(c.label).toBe("a".repeat(19) + "…");
    expect(c.on).toBe(false);
  });
  it("reorder で並び、remove で削除済みへ移る", async () => {
    const list = await chipsOf();
    const ids = list.map((c) => c.id).reverse();
    await api.data.chips.reorder("hololive", ids);
    expect((await chipsOf()).map((c) => c.id)).toEqual(ids);
    await api.data.chips.remove(ids[0]);
    expect((await api.data.trash.list()).map((t) => t.id)).toContain(ids[0]);
  });
});

describe("お気に入り・いつものエゴサ", () => {
  let api: EgoSearchApi;
  beforeEach(async () => {
    api = make().api;
    await api.data.init();
  });

  it("update は一致するいつものエゴサの項目も更新し、undo で両方戻る", async () => {
    const fav = await api.data.favorites.save({
      name: "A",
      query: "a b",
      engine: "x",
    });
    const g = await api.data.groups.save({
      name: "朝",
      items: [
        { query: "b a", engine: "x" },
        { query: "other", engine: "x" },
      ],
    });
    const r = await api.data.favorites.update(fav.id, { query: "a c" });
    expect(r.count).toBe(1);
    expect(r.favorite.query).toBe("a c");
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].id).toBe(g.id);
    expect(r.groups[0].items.map((i) => i.query)).toEqual(["a c", "other"]);
    let now = await api.data.init();
    expect(now.groups[0].items[0].query).toBe("a c");

    await r.undo();
    now = await api.data.init();
    expect(now.favorites[0].query).toBe("a b");
    expect(now.groups[0].items.map((i) => i.query)).toEqual(["b a", "other"]);
  });
  it("update で一致する項目が無ければ count は 0 で、いつものエゴサは変わらない", async () => {
    const fav = await api.data.favorites.save({
      name: "A",
      query: "a",
      engine: "x",
    });
    await api.data.groups.save({
      name: "G",
      items: [{ query: "z", engine: "x" }],
    });
    const r = await api.data.favorites.update(fav.id, { name: "改名" });
    expect(r).toMatchObject({ count: 0, groups: [] });
    expect(r.favorite.name).toBe("改名");
  });
  it("お気に入りを削除しても、いつものエゴサは変わらない", async () => {
    const fav = await api.data.favorites.save({
      name: "A",
      query: "a",
      engine: "x",
    });
    await api.data.groups.save({
      name: "G",
      items: [{ query: "a", engine: "x" }],
    });
    await api.data.favorites.remove(fav.id);
    const d = await api.data.init();
    expect(d.favorites).toEqual([]);
    expect(d.groups[0].items).toEqual([{ query: "a", engine: "x" }]);
  });
  it("update は無い ID で NOT_FOUND、名前が空で INVALID", async () => {
    expect(await code(api.data.favorites.update("nope", { name: "x" }))).toBe(
      "NOT_FOUND",
    );
    const fav = await api.data.favorites.save({
      name: "A",
      query: "a",
      engine: "x",
    });
    expect(await code(api.data.favorites.update(fav.id, { name: "" }))).toBe(
      "INVALID",
    );
    expect(
      await code(
        api.data.favorites.save({ name: "", query: "a", engine: "x" }),
      ),
    ).toBe("INVALID");
  });
  it("groups.save は、名前が空・項目が0件で INVALID", async () => {
    expect(
      await code(
        api.data.groups.save({
          name: "  ",
          items: [{ query: "a", engine: "x" }],
        }),
      ),
    ).toBe("INVALID");
    expect(await code(api.data.groups.save({ name: "G", items: [] }))).toBe(
      "INVALID",
    );
  });
  it("groups.save は、id があれば更新する（順序・作成日時を保つ）", async () => {
    const g = await api.data.groups.save({
      name: "G",
      items: [{ query: "a", engine: "x" }],
    });
    const u = await api.data.groups.save({
      id: g.id,
      name: "H",
      items: [{ query: "b", engine: "both" }],
    });
    expect(u).toMatchObject({
      id: g.id,
      name: "H",
      order: g.order,
      createdAt: g.createdAt,
    });
    expect(
      await code(
        api.data.groups.save({
          id: "nope",
          name: "H",
          items: [{ query: "b", engine: "x" }],
        }),
      ),
    ).toBe("NOT_FOUND");
  });
  it("saveSearch：追加しない／既存に追加／新規作成", async () => {
    const f = { name: "F", query: "q", engine: "yahoo" as const };
    const none = await api.data.saveSearch({
      favorite: f,
      target: { kind: "none" },
    });
    expect(none.group).toBeNull();
    const g = await api.data.groups.save({
      name: "G",
      items: [{ query: "x", engine: "x" }],
    });
    const added = await api.data.saveSearch({
      favorite: f,
      target: { kind: "group", groupId: g.id },
    });
    expect(added.group?.items.at(-1)).toEqual({
      query: "q",
      engine: "yahoo",
    });
    const created = await api.data.saveSearch({
      favorite: f,
      target: { kind: "newGroup", name: "新規" },
    });
    expect(created.group).toMatchObject({
      name: "新規",
      items: [{ query: "q", engine: "yahoo" }],
    });
  });
  it("saveSearch は、無いいつものエゴサを指定すると、お気に入りも保存せず NOT_FOUND", async () => {
    const before = (await api.data.init()).favorites.length;
    expect(
      await code(
        api.data.saveSearch({
          favorite: { name: "F", query: "q", engine: "x" },
          target: { kind: "group", groupId: "nope" },
        }),
      ),
    ).toBe("NOT_FOUND");
    expect((await api.data.init()).favorites).toHaveLength(before);
  });
});

describe("履歴・削除済み・設定", () => {
  let api: EgoSearchApi;
  beforeEach(async () => {
    api = make().api;
    await api.data.init();
  });
  const plan: RunPlan = {
    warnings: [],
    targets: [
      {
        engine: "x",
        url: "u1",
        query: "q since:2026-11-18",
        stored: "q since:yesterday",
        warnings: [],
      },
      {
        engine: "yahoo",
        url: "u2",
        query: "q since:2026-11-18",
        stored: "q since:yesterday",
        warnings: [],
      },
    ],
  };
  it("record は targets の数だけ、開いた時点の文字列で残す（groupId は保存しない）", async () => {
    const items = await api.data.history.record(plan, {
      kind: "group",
      label: "朝",
      groupId: "g1",
    });
    expect(items.map((i) => [i.engine, i.query])).toEqual([
      ["x", "q since:2026-11-18"],
      ["yahoo", "q since:2026-11-18"],
    ]);
    expect(items[0].source).toEqual({ kind: "group", label: "朝" });
    expect((await api.data.init()).history).toHaveLength(2);
    await api.data.history.clear();
    expect((await api.data.init()).history).toEqual([]);
  });
  it("削除 → 一覧 → 詳細 → 復元 → 完全削除", async () => {
    const fav = await api.data.favorites.save({
      name: "A",
      query: "a",
      engine: "x",
    });
    await api.data.favorites.remove(fav.id);
    expect((await api.data.trash.list()).map((t) => [t.kind, t.id])).toEqual([
      ["favorite", fav.id],
    ]);
    expect(await api.data.trash.detail("favorite", fav.id)).toMatchObject({
      kind: "favorite",
    });
    await api.data.trash.restore("favorite", fav.id);
    expect((await api.data.init()).favorites).toHaveLength(1);
    await api.data.favorites.remove(fav.id);
    await api.data.trash.purge("favorite", fav.id);
    expect(await api.data.trash.list()).toEqual([]);
  });
  it("削除済みでない・無い ID の detail／restore／purge は NOT_FOUND", async () => {
    const fav = await api.data.favorites.save({
      name: "A",
      query: "a",
      engine: "x",
    });
    expect(await code(api.data.trash.detail("favorite", fav.id))).toBe(
      "NOT_FOUND",
    );
    expect(await code(api.data.trash.restore("favorite", "nope"))).toBe(
      "NOT_FOUND",
    );
    expect(await code(api.data.trash.purge("group", "nope"))).toBe("NOT_FOUND");
  });
  it("条件ボタンを削除して復元すると、並びの途中のものでも元の位置に戻る", async () => {
    const before = (await api.data.init()).chips.get("hololive")!;
    const target = before[2];
    await api.data.chips.remove(target.id);
    await api.data.trash.restore("chip", target.id);
    const after = (await api.data.init()).chips.get("hololive")!;
    expect(after.map((c) => c.id)).toEqual(before.map((c) => c.id));
  });
  it("条件ボタンの復元で、戻す先が上限なら LIMIT", async () => {
    const list = (await api.data.init()).chips.get("hololive")!;
    await api.data.chips.remove(list[0].id);
    for (let i = list.length - 1; i < LIMITS.chips; i++)
      await api.data.chips.save({
        interestId: "hololive",
        label: `c${i}`,
        query: `zz${i}`,
      });
    expect(await code(api.data.trash.restore("chip", list[0].id))).toBe(
      "LIMIT",
    );
  });
  it("prefs.set は反映して返し、知らない興味の対象は INVALID", async () => {
    expect(await api.data.prefs.set({ lang: "en" })).toMatchObject({
      lang: "en",
      interest: "hololive",
    });
    expect(await code(api.data.prefs.set({ interest: "nope" }))).toBe(
      "INVALID",
    );
  });
  it("言語は再読み込み後も残り、選ぶ前は null（ほかの設定を保存しても変わらない）", async () => {
    const kv = new MemoryAdapter();
    const first = createBackend({ kv, clock, newId });
    expect((await first.data.init()).prefs.lang).toBeNull();
    await first.data.prefs.set({ interest: "other" });
    const again = await createBackend({ kv, clock, newId }).data.init();
    expect(again.prefs.lang).toBeNull();
    await first.data.prefs.set({ lang: "en" });
    const reloaded = await createBackend({ kv, clock, newId }).data.init();
    expect(reloaded.prefs).toMatchObject({ lang: "en", interest: "other" });
  });
});

describe("clock と計算", () => {
  it("query.build・expand・url.plan は、clock の日付で相対期間を展開する", () => {
    const { api } = make();
    const q = api.query.build(
      { ...state("a"), period: { kind: "d1", from: "", to: "" } },
      [],
    );
    expect(q.stored).toBe("a since:yesterday");
    expect(q.text).toBe("a since:2026-11-18");
    expect(api.query.expand("a since:1week_ago")).toBe("a since:2026-11-12");
    const plan = api.url.plan([{ query: "a since:yesterday", engine: "x" }]);
    expect(plan.targets[0].query).toBe("a since:2026-11-18");
    expect(plan.targets[0].url).toContain("since%3A2026-11-18");
  });
  it("clock を変えると展開が変わる", () => {
    const other = createBackend({
      kv: new MemoryAdapter(),
      clock: { today: () => "2027-01-01", now: () => NOW },
      newId,
    });
    expect(other.query.expand("since:yesterday")).toBe("since:2026-12-31");
  });
  it("master と limits を束ねている", () => {
    const { api } = make();
    expect([...api.master.interests().keys()]).toContain("hololive");
    expect(api.master.wordSet("nope")).toEqual([]);
    expect(api.limits).toBe(LIMITS);
  });
  it("launcher の encode → decode で往復し、壊れた入力は LAUNCHER_BROKEN", async () => {
    const { api } = make();
    const payload = {
      name: "朝",
      items: [{ query: "a", engine: "x" as const }],
    };
    expect(
      await api.launcher.decode(await api.launcher.encode(payload)),
    ).toEqual(payload);
    expect(await code(api.launcher.decode("broken"))).toBe("LAUNCHER_BROKEN");
  });
  it("starters は履歴が0件のときだけ値を返し、suggest は履歴の検索語を候補にする", () => {
    const { api } = make();
    const hist = [
      {
        id: "h",
        at: NOW,
        query: "ぺこら since:yesterday",
        engine: "x" as const,
        source: { kind: "home" as const, label: "" },
      },
    ];
    expect(
      api.query.starters({ interest: "hololive", chips: [], history: hist }),
    ).toEqual([]);
    expect(api.query.suggest({ text: "", chips: [], history: hist })).toEqual([
      "ぺこら",
    ]);
  });
  it("suggest の候補は20件で切る（仕様の値。履歴に25種類あっても）", () => {
    const { api } = make();
    const words = Array.from({ length: 25 }, (_, i) => `語${i + 1}`);
    const out = api.query.suggest({
      text: "",
      chips: [],
      history: [
        {
          id: "h",
          at: NOW,
          query: words.join(" "),
          engine: "x" as const,
          source: { kind: "home" as const, label: "" },
        },
      ],
    });
    expect(out).toHaveLength(20);
    expect(out).toEqual(words.slice(0, 20));
  });
});

describe("lastRunAt（いつものエゴサ・お気に入り）と「今日は実行済み」", () => {
  const T_RUN = "2026-11-19T05:00:00.000Z";
  let kv: MemoryAdapter;
  let api: EgoSearchApi;
  let nowIso = NOW;
  const mutableClock = { today: () => "2026-11-19", now: () => nowIso };
  const target = (
    engine: "x" | "yahoo",
    stored: string,
  ): RunPlan["targets"][number] => ({
    engine,
    url: "u",
    query: stored,
    stored,
    warnings: [],
  });
  const planOf = (...t: RunPlan["targets"]): RunPlan => ({
    targets: t,
    warnings: [],
  });
  const reload = () => api.data.init();

  beforeEach(async () => {
    nowIso = NOW;
    kv = new MemoryAdapter();
    api = createBackend({ kv, clock: mutableClock, newId });
    await api.data.init();
  });

  it("record は、source.groupId のいつものエゴサの lastRunAt を現在時刻にする（updatedAt は動かさない）", async () => {
    const g = await api.data.groups.save({
      name: "朝",
      items: [{ query: "a", engine: "x" }],
    });
    expect(g.lastRunAt).toBeNull();
    nowIso = T_RUN;
    await api.data.history.record(planOf(target("x", "a")), {
      kind: "group",
      label: "朝",
      groupId: g.id,
    });
    const after = (await reload()).groups[0];
    expect(after.lastRunAt).toBe(T_RUN);
    expect(after.updatedAt).toBe(g.updatedAt);
  });

  it("record は、stored を正規化して一致するお気に入りすべての lastRunAt を更新する（検索先は見ない・削除済みは除く）", async () => {
    const x = await api.data.favorites.save({
      name: "X",
      query: "b a",
      engine: "x",
    });
    const y = await api.data.favorites.save({
      name: "Y",
      query: "a  b",
      engine: "yahoo",
    });
    const other = await api.data.favorites.save({
      name: "他",
      query: "z",
      engine: "x",
    });
    const gone = await api.data.favorites.save({
      name: "削除済み",
      query: "a b",
      engine: "x",
    });
    await api.data.favorites.remove(gone.id);
    nowIso = T_RUN;
    // both は同じ stored の2件になる
    await api.data.history.record(
      planOf(target("x", "a b"), target("yahoo", "a b")),
      { kind: "favorite", label: "X" },
    );
    const data = await reload();
    const byId = (id: string) => data.favorites.find((f) => f.id === id)!;
    expect(byId(x.id).lastRunAt).toBe(T_RUN);
    expect(byId(y.id).lastRunAt).toBe(T_RUN);
    expect(byId(x.id).updatedAt).toBe(x.updatedAt);
    expect(byId(other.id).lastRunAt).toBeNull();
    // 削除済みのお気に入りは更新しない
    await api.data.trash.restore("favorite", gone.id);
    expect(
      (await reload()).favorites.find((f) => f.id === gone.id)!.lastRunAt,
    ).toBeNull();
  });

  it("ランチャーからの実行（groupId なし）は、お気に入りだけ更新し、いつものエゴサは更新しない", async () => {
    const f = await api.data.favorites.save({
      name: "F",
      query: "a",
      engine: "x",
    });
    const g = await api.data.groups.save({
      name: "G",
      items: [{ query: "a", engine: "x" }],
    });
    nowIso = T_RUN;
    await api.data.history.record(planOf(target("x", "a")), {
      kind: "launch",
      label: "L",
    });
    const data = await reload();
    expect(data.favorites.find((x) => x.id === f.id)!.lastRunAt).toBe(T_RUN);
    expect(data.groups.find((x) => x.id === g.id)!.lastRunAt).toBeNull();
  });

  it("存在しない・削除済みの groupId は、例外にせず履歴だけ書く", async () => {
    const g = await api.data.groups.save({
      name: "G",
      items: [{ query: "a", engine: "x" }],
    });
    await api.data.groups.remove(g.id);
    for (const groupId of ["nope", g.id]) {
      const items = await api.data.history.record(planOf(target("x", "a")), {
        kind: "group",
        label: "G",
        groupId,
      });
      expect(items).toHaveLength(1);
    }
    await api.data.trash.restore("group", g.id);
    expect((await reload()).groups[0].lastRunAt).toBeNull();
  });

  it("groups.save（編集）と saveSearch（追加）は lastRunAt を保つ", async () => {
    const g = await api.data.groups.save({
      name: "G",
      items: [{ query: "a", engine: "x" }],
    });
    nowIso = T_RUN;
    await api.data.history.record(planOf(target("x", "a")), {
      kind: "group",
      label: "G",
      groupId: g.id,
    });
    const renamed = await api.data.groups.save({
      id: g.id,
      name: "改名",
      items: [{ query: "a", engine: "x" }],
    });
    expect(renamed.lastRunAt).toBe(T_RUN);
    const added = await api.data.saveSearch({
      favorite: { name: "F", query: "q", engine: "x" },
      target: { kind: "group", groupId: g.id },
    });
    expect(added.group?.lastRunAt).toBe(T_RUN);
  });

  it("履歴を全件削除しても、「今日は実行済み」は変わらない", async () => {
    const g = await api.data.groups.save({
      name: "G",
      items: [{ query: "a", engine: "x" }],
    });
    nowIso = T_RUN;
    await api.data.history.record(planOf(target("x", "a")), {
      kind: "group",
      label: "G",
      groupId: g.id,
    });
    await api.data.history.clear();
    const data = await reload();
    expect(data.history).toEqual([]);
    expect(api.clock.isToday(data.groups[0].lastRunAt)).toBe(true);
  });

  it("clock.isToday は、現地（日本時間）の日付が today と同じかで決める（境目と null）", () => {
    const cases: [string | null, boolean][] = [
      ["2026-11-18T14:59:59.999Z", false], // 11/18 23:59:59 JST
      ["2026-11-18T15:00:00.000Z", true], // 11/19 00:00:00 JST
      ["2026-11-19T14:59:59.999Z", true], // 11/19 23:59:59 JST
      ["2026-11-19T15:00:00.000Z", false], // 11/20 00:00:00 JST
      [null, false],
    ];
    for (const [at, expected] of cases)
      expect([at, api.clock.isToday(at)]).toEqual([at, expected]);
  });

  it("版1のデータは init で版2へ移行し、groups の lastRunAt は null になる", async () => {
    const old = new MemoryAdapter();
    await old.set(META_KEY, JSON.stringify({ version: 1 }));
    await old.set(
      "egosearch:v1:groups",
      JSON.stringify([
        {
          id: "g1",
          name: "朝",
          items: [{ query: "a", engine: "x" }],
          order: 0,
          createdAt: NOW,
          updatedAt: NOW,
          deletedAt: null,
        },
      ]),
    );
    const data = await createBackend({
      kv: old,
      clock: mutableClock,
      newId,
    }).data.init();
    expect(data.groups).toHaveLength(1);
    expect(data.groups[0]).toMatchObject({ id: "g1", lastRunAt: null });
  });

  it("版1の groups が壊れていると CORRUPT で、版1のデータも meta も変えない", async () => {
    const old = new MemoryAdapter();
    await old.set(META_KEY, JSON.stringify({ version: 1 }));
    await old.set("egosearch:v1:groups", "{壊れた");
    const err = await createBackend({ kv: old, clock: mutableClock, newId })
      .data.init()
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("CORRUPT");
    expect(await old.get("egosearch:v1:groups")).toBe("{壊れた");
    expect(await old.get(META_KEY)).toBe(JSON.stringify({ version: 1 }));
  });
});
