"use client";
// MOCK: 破棄予定（#61）
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_INTEREST,
  ENGINE_LABEL,
  ENGINE_NAME,
  engineTargets,
  EMPTY_DETAIL,
  EMPTY_PERIOD,
  INITIAL_FAVORITES,
  INITIAL_GROUPS,
  INITIAL_HISTORY,
  INITIAL_TRASH,
  INTERESTS,
  LIMITS,
  SUGGEST_RULES,
  SUGGEST_SEEDS,
  initialChips,
  presetChips,
  type Chip,
  type Detail,
  type Favorite,
  type Group,
  type GroupItem,
  type HistoryItem,
  type InterestId,
  type Period,
  type TrashItem,
} from "./data";
import { buildQuery, chipTokens, runText } from "./query";
import {
  applyFavEdit,
  chipConds,
  condsToQuery,
  parseToScope,
  suggestFromRules,
} from "./query-model";

type Toast = { id: string; msg: string; undo?: () => void };

/** 開く検索（履歴に残す中身） */
export type BuiltSearch = { word: string; text: string; chipLabels: string[] };

export type Store = {
  /** 今の興味の対象の条件ボタン（興味の対象ごとに別の並び） */
  chips: Chip[];
  /** 興味の対象ごとの条件ボタン（削除済みの復元で、戻す先の上限を見る） */
  chipsByInterest: Record<InterestId, Chip[]>;
  favs: Favorite[];
  groups: Group[];
  history: HistoryItem[];
  trash: TrashItem[];
  word: string;
  exact: boolean;
  detail: Detail;
  period: Period;
  /** ホームで ON にしたサジェスト検索条件（この検索にだけ足す） */
  sugOn: string[];
  suggestions: string[];
  toast: Toast | null;
  notice: string;
  setWord: (v: string) => void;
  setExact: (v: boolean) => void;
  setDetail: (f: (d: Detail) => Detail) => void;
  setPeriod: (p: Period) => void;
  toggleSuggestion: (token: string) => void;
  adoptSuggestion: (token: string) => string | null;
  setChips: (c: Chip[]) => void;
  toggleChip: (id: string) => void;
  /** ホームの条件ボタンの ON/OFF を指定の状態にする */
  setChipOn: (id: string, on: boolean) => void;
  /**
   * 値付きの条件（数値・日付）の値を変える。変えた値はボタンに保存する（どの画面で変えても同じボタンの値）。
   * ON にする処理は呼び出し側の検索の組み立て（SearchScope.setOn）が行う。
   */
  setCondValue: (chipId: string, condId: string, value: string) => void;
  /** ホームに出す／隠す */
  toggleVisible: (id: string) => void;
  saveChip: (chip: Chip) => string | null;
  deleteChip: (id: string) => void;
  /** 今の興味の対象のプリセットのうち、無いものを足す。足した数を返す */
  addPresets: () => number;
  /**
   * お気に入りを保存する。既存を編集したときは、編集前の文字列（正規化）と一致する
   * いつものエゴサの項目も更新する（トーストで件数を知らせ、［元に戻す］で両方戻す）。
   */
  saveFav: (fav: Favorite) => void;
  /** 削除はいつものエゴサに連動しない（項目は文字列を持っているため） */
  deleteFav: (id: string) => void;
  saveGroup: (g: Group) => void;
  deleteGroup: (id: string) => void;
  restore: (tid: string) => string | null;
  purge: (tid: string) => void;
  purgeKind: (kind: TrashItem["kind"]) => void;
  purgeAll: () => void;
  /** 開く（ダミー）。built を渡すとその検索を、省略するとホームの検索を履歴に残す */
  run: (engine: "X" | "Yahoo", source: string, built?: BuiltSearch) => void;
  runFav: (id: string, source?: string) => void;
  runGroup: (id: string) => void;
  clearHistory: () => void;
  resetDetail: () => void;
  say: (msg: string, undo?: () => void) => void;
  setNotice: (m: string) => void;
  usedChips: Chip[];
  query: ReturnType<typeof buildQuery>;
  /** 興味の対象（INTERESTS のキー。既定はホロライブ）。ヘッダーでいつでも切り替える */
  interest: InterestId;
  /** 条件ボタンの並びを切り替える。端末内（localStorage）にだけ保存する */
  setInterest: (id: InterestId) => void;
  /**
   * 検索文字列をホームの検索に展開する（URL解析の［ホームで編集する］）。
   * お気に入りの編集と同じ規則（parseToScope）で、今の興味の対象の条件ボタンを ON にし、残りを詳細条件に入れる。
   */
  loadIntoHome: (q: string) => void;
  /** 初回の状態（プリセットのみ・保存なし・興味はホロライブ）にする */
  startFresh: () => void;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider がありません");
  return s;
}

let seq = 100;
export const nid = (p: string) => `${p}${++seq}`;
const NOW = "今";

const INTEREST_KEY = "mock:interest:v2";

// 興味の対象は localStorage（端末内のみ）に持つ。静的 HTML は既定（ホロライブ）で出す
const interestListeners = new Set<() => void>();
const subscribeInterest = (fn: () => void) => {
  interestListeners.add(fn);
  return () => {
    interestListeners.delete(fn);
  };
};
const notifyInterest = () => interestListeners.forEach((fn) => fn());
const readInterest = (): InterestId => {
  const saved = localStorage.getItem(INTEREST_KEY);
  return saved && saved in INTERESTS ? saved : DEFAULT_INTEREST;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const interest = useSyncExternalStore(
    subscribeInterest,
    readInterest,
    () => DEFAULT_INTEREST,
  );
  // 条件ボタンは興味の対象ごとに別の並び（キーは INTERESTS の ID。本実装は DAO の listByInterest）
  const [chipsByInterest, setChipsByInterest] =
    useState<Record<InterestId, Chip[]>>(initialChips);
  const chips = useMemo(
    () => chipsByInterest[interest] ?? [],
    [chipsByInterest, interest],
  );
  /** 指定した興味の対象の条件ボタンを更新する */
  const updateChips = useCallback(
    (id: InterestId, f: (cs: Chip[]) => Chip[]) =>
      setChipsByInterest((m) => ({ ...m, [id]: f(m[id] ?? []) })),
    [],
  );
  const [favs, setFavs] = useState<Favorite[]>(INITIAL_FAVORITES);
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [history, setHistory] = useState<HistoryItem[]>(INITIAL_HISTORY);
  const [trash, setTrash] = useState<TrashItem[]>(INITIAL_TRASH);
  const [word, setWord] = useState("メンバーA");
  const [exact, setExact] = useState(true);
  const [detail, setDetailState] = useState<Detail>(EMPTY_DETAIL);
  const [period, setPeriod] = useState<Period>(EMPTY_PERIOD);
  const [sugOn, setSugOn] = useState<string[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 最新値を操作関数から読むための ref（クロージャの古い値を避ける）
  const live = useRef({ chips, chipsByInterest, favs, groups, trash, history });
  useEffect(() => {
    live.current = { chips, chipsByInterest, favs, groups, trash, history };
  });

  const say = useCallback((msg: string, undo?: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: nid("t"), msg, undo });
    timer.current = setTimeout(() => setToast(null), 7000);
  }, []);

  const pushTrash = useCallback((...items: TrashItem[]) => {
    // 新しい順。種類ごとに上限を超えたら、その種類の古いものから完全削除
    setTrash((t) => {
      const seen: Record<string, number> = {};
      return [...items, ...t].filter((x) => {
        seen[x.kind] = (seen[x.kind] ?? 0) + 1;
        return seen[x.kind] <= LIMITS.trash;
      });
    });
  }, []);

  /**
   * 保存した検索（お気に入り・いつものエゴサの中身）を、それぞれの検索先で開いたものとして履歴に残す。
   * 「両方」は X と Yahoo!リアルタイム検索の2件。開いたタブの数を返す。
   */
  const logSaved = useCallback((items: GroupItem[], source: string) => {
    const entries: HistoryItem[] = items.flatMap((item) =>
      engineTargets(item.engine).map((engine) => ({
        id: nid("h"),
        at: NOW,
        word: "",
        // 履歴には、相対期間を日付に展開した後の文字列を残す
        query: runText(item.query),
        engine,
        source,
        chipLabels: [],
      })),
    );
    // 新しい順：最後に開いたものが先頭
    setHistory((h) => [...entries.reverse(), ...h].slice(0, LIMITS.history));
    return entries.length;
  }, []);

  const query = useMemo(
    () => buildQuery({ word, exact, chips, detail, period, extra: sugOn }),
    [word, exact, chips, detail, period, sugOn],
  );
  // サジェスト：①規則（今の検索に含まれる語から。例：タレント名 → ファンアートタグ）
  // ②直近の検索（履歴）の条件。条件ボタンに無いものを最大 LIMITS.suggest 件
  const suggestions = useMemo(() => {
    const have = new Set(chips.flatMap((c) => chipTokens(c)));
    const fromRules = suggestFromRules(query.stored, SUGGEST_RULES);
    const fromHistory = history
      .flatMap((h) => h.query.split(/\s+/))
      .filter((t) => /[:#()-]/.test(t) && !/^(since|until):/.test(t));
    return [...new Set([...fromRules, ...fromHistory, ...SUGGEST_SEEDS])]
      .filter((t) => !have.has(t))
      .slice(0, LIMITS.suggest);
  }, [chips, history, query.stored]);
  const usedChips = useMemo(
    () => chips.filter((c) => c.on && c.visible),
    [chips],
  );

  const setInterest = useCallback((id: InterestId) => {
    if (!(id in INTERESTS)) return;
    localStorage.setItem(INTEREST_KEY, id);
    notifyInterest();
  }, []);

  const startFresh = useCallback(() => {
    localStorage.removeItem(INTEREST_KEY);
    notifyInterest();
    setChipsByInterest(initialChips());
    setFavs([]);
    setGroups([]);
    setHistory([]);
    setTrash([]);
    setWord("");
    setExact(false);
    setDetailState(EMPTY_DETAIL);
    setPeriod(EMPTY_PERIOD);
    setSugOn([]);
  }, []);

  const restore = useCallback(
    (tid: string): string | null => {
      const item = live.current.trash.find((t) => t.tid === tid);
      if (!item) return "見つかりません";
      if (item.kind === "chip") {
        // 条件ボタンは、削除したときの興味の対象の並びへ戻す（上限もその対象で数える）
        const target = live.current.chipsByInterest[item.data.interestId] ?? [];
        if (target.length >= LIMITS.chips)
          return `条件ボタンが上限（${LIMITS.chips}件）のため復元できません。不要なボタンを削除してください`;
        const at = Math.min(item.index, target.length);
        updateChips(item.data.interestId, (c) => [
          ...c.slice(0, at),
          item.data,
          ...c.slice(at),
        ]);
      } else if (item.kind === "fav") {
        setFavs((f) => [...f, item.data]);
      } else {
        setGroups((g) => [...g, item.data]);
      }
      setTrash((t) => t.filter((x) => x.tid !== tid));
      return null;
    },
    [updateChips],
  );

  const store: Store = {
    chips,
    chipsByInterest,
    favs,
    groups,
    history,
    trash,
    word,
    exact,
    detail,
    period,
    sugOn,
    suggestions,
    toast,
    notice,
    setWord,
    setExact,
    setDetail: (f) => setDetailState(f),
    setPeriod,
    toggleSuggestion: (token) =>
      setSugOn((v) =>
        v.includes(token) ? v.filter((x) => x !== token) : [...v, token],
      ),
    adoptSuggestion: (token) => {
      if (live.current.chips.length >= LIMITS.chips)
        return `上限（${LIMITS.chips}件）です。不要なボタンを削除してください`;
      const label = token.length > 14 ? `${token.slice(0, 13)}…` : token;
      updateChips(interest, (cs) => [
        ...cs,
        {
          id: nid("sg"),
          interestId: interest,
          label,
          query: token,
          on: false,
          isNew: true,
          visible: true,
        },
      ]);
      setSugOn((v) => v.filter((x) => x !== token));
      say(`条件ボタン「${label}」に追加しました`);
      return null;
    },
    setChips: (cs) => updateChips(interest, () => cs),
    toggleChip: (id) =>
      updateChips(interest, (cs) =>
        cs.map((c) => (c.id === id ? { ...c, on: !c.on, isNew: false } : c)),
      ),
    setChipOn: (id, on) =>
      updateChips(interest, (cs) =>
        cs.map((c) => (c.id === id ? { ...c, on, isNew: false } : c)),
      ),
    // 値を変えたら、本体の文字列を組み立て直して保存する
    setCondValue: (chipId, condId, value) =>
      updateChips(interest, (cs) =>
        cs.map((c) =>
          c.id === chipId
            ? {
                ...c,
                isNew: false,
                query: condsToQuery(
                  chipConds(c).map((x) =>
                    x.id === condId ? { ...x, value } : x,
                  ),
                ),
              }
            : c,
        ),
      ),
    toggleVisible: (id) =>
      updateChips(interest, (cs) =>
        cs.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
      ),
    saveChip: (chip) => {
      const list = live.current.chipsByInterest[chip.interestId] ?? [];
      const exists = list.some((c) => c.id === chip.id);
      if (!exists && list.length >= LIMITS.chips)
        return `上限（${LIMITS.chips}件）です。不要なボタンを削除してください`;
      updateChips(chip.interestId, (cs) =>
        exists ? cs.map((c) => (c.id === chip.id ? chip : c)) : [...cs, chip],
      );
      say(exists ? "条件ボタンを保存しました" : "条件ボタンを追加しました");
      return null;
    },
    deleteChip: (id) => {
      const index = live.current.chips.findIndex((c) => c.id === id);
      const chip = live.current.chips[index];
      if (!chip) return;
      const tid = nid("tr");
      updateChips(chip.interestId, (cs) => cs.filter((c) => c.id !== id));
      pushTrash({
        tid,
        at: NOW,
        kind: "chip",
        name: chip.label,
        data: chip,
        index,
      });
      say(`「${chip.label}」を削除しました`, () => {
        restore(tid);
      });
    },
    addPresets: () => {
      const have = live.current.chips.map((c) => c.id);
      const room = LIMITS.chips - live.current.chips.length;
      const add = presetChips(interest)
        .filter((c) => !have.includes(c.id))
        .slice(0, Math.max(room, 0));
      if (add.length) updateChips(interest, (cs) => [...cs, ...add]);
      return add.length;
    },
    saveFav: (fav) => {
      const before = live.current.favs.find((f) => f.id === fav.id);
      const prevFavs = live.current.favs;
      const prevGroups = live.current.groups;
      setFavs((fs) =>
        before ? fs.map((f) => (f.id === fav.id ? fav : f)) : [...fs, fav],
      );
      // 編集したときは、編集前の文字列と一致する、いつものエゴサの項目も更新する
      const { groups: nextGroups, count } = before
        ? applyFavEdit(prevGroups, before, fav)
        : { groups: prevGroups, count: 0 };
      if (count === 0) {
        say(`お気に入り「${fav.name}」を保存しました`);
        return;
      }
      setGroups(nextGroups);
      say(
        `お気に入り「${fav.name}」を保存し、いつものエゴサの${count}件の項目も更新しました`,
        () => {
          setFavs(prevFavs);
          setGroups(prevGroups);
        },
      );
    },
    deleteFav: (id) => {
      const index = live.current.favs.findIndex((f) => f.id === id);
      const fav = live.current.favs[index];
      if (!fav) return;
      // いつものエゴサの項目は検索文字列を持っているので、削除は連動しない（編集だけが連動する）
      const tid = nid("tr");
      setFavs((fs) => fs.filter((f) => f.id !== id));
      pushTrash({
        tid,
        at: NOW,
        kind: "fav",
        name: fav.name,
        data: fav,
        index,
      });
      say(`「${fav.name}」を削除しました`, () => {
        restore(tid);
      });
    },
    saveGroup: (g) => {
      const exists = live.current.groups.some((x) => x.id === g.id);
      setGroups((gs) =>
        exists ? gs.map((x) => (x.id === g.id ? g : x)) : [...gs, g],
      );
      say(`いつものエゴサ「${g.name}」を保存しました`);
    },
    deleteGroup: (id) => {
      const index = live.current.groups.findIndex((g) => g.id === id);
      const g = live.current.groups[index];
      if (!g) return;
      const tid = nid("tr");
      setGroups((gs) => gs.filter((x) => x.id !== id));
      pushTrash({ tid, at: NOW, kind: "group", name: g.name, data: g, index });
      say(`「${g.name}」を削除しました`, () => {
        restore(tid);
      });
    },
    restore,
    purge: (tid) => setTrash((t) => t.filter((x) => x.tid !== tid)),
    purgeKind: (kind) => setTrash((t) => t.filter((x) => x.kind !== kind)),
    purgeAll: () => setTrash([]),
    run: (engine, source, built) => {
      const b: BuiltSearch = built ?? {
        word,
        text: buildQuery({ word, exact, chips, detail, period }).text,
        chipLabels: chips.filter((c) => c.on && c.visible).map((c) => c.label),
      };
      setHistory((h) =>
        [
          {
            id: nid("h"),
            at: NOW,
            word: b.word,
            query: b.text,
            engine,
            source,
            chipLabels: b.chipLabels,
          },
          ...h,
        ].slice(0, LIMITS.history),
      );
      say(`${ENGINE_LABEL[engine]}で開きました（ダミー）`);
    },
    runFav: (id, source) => {
      const f = live.current.favs.find((x) => x.id === id);
      if (!f) return;
      logSaved([f], source ?? `お気に入り「${f.name}」`);
      setFavs((fs) => fs.map((x) => (x.id === id ? { ...x, last: "今" } : x)));
      say(`「${f.name}」を${ENGINE_NAME[f.engine]}で開きました（ダミー）`);
    },
    runGroup: (id) => {
      const g = live.current.groups.find((x) => x.id === id);
      if (!g) return;
      const tabs = logSaved(g.items, `いつものエゴサ「${g.name}」`);
      setGroups((gs) =>
        gs.map((x) => (x.id === id ? { ...x, doneToday: true } : x)),
      );
      say(`「${g.name}」：${tabs}個のタブを開きました（ダミー）`);
    },
    clearHistory: () => setHistory([]),
    resetDetail: () => {
      const prev = detail;
      const prevPeriod = period;
      setDetailState(EMPTY_DETAIL);
      setPeriod(EMPTY_PERIOD);
      say("この検索の個別設定をリセットしました", () => {
        setDetailState(prev);
        setPeriod(prevPeriod);
      });
    },
    say,
    setNotice,
    loadIntoHome: (q) => {
      const p = parseToScope(q, live.current.chips);
      updateChips(interest, (cs) =>
        cs.map((c) => ({ ...c, on: p.onIds.includes(c.id) })),
      );
      setWord(p.word);
      setExact(p.exact);
      setDetailState(p.detail);
      setPeriod(p.period);
      setSugOn([]);
    },
    usedChips,
    query,
    interest,
    setInterest,
    startFresh,
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
