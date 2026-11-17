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
  DEFAULT_LISTS,
  EMPTY_DETAIL,
  EMPTY_PERIOD,
  INITIAL_CHIPS,
  INITIAL_FAVORITES,
  INITIAL_GROUPS,
  INITIAL_HISTORY,
  INITIAL_TRASH,
  LIMITS,
  SUGGEST_SEEDS,
  defaultChips,
  type Chip,
  type Detail,
  type Favorite,
  type Group,
  type HistoryItem,
  type Period,
  type TrashItem,
} from "./data";
import { buildQuery, chipTokens, savedText } from "./query";

type Toast = { id: string; msg: string; undo?: () => void };

/** 開く検索（履歴に残す中身） */
export type BuiltSearch = { word: string; text: string; chipLabels: string[] };

export type Store = {
  chips: Chip[];
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
  addDefaultChips: () => number;
  saveFav: (fav: Favorite) => void;
  /** お気に入りは実体（検索文字列）を持つので、いつものエゴサには影響しない */
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
  /** 興味の対象（既定リストの ID。既定はホロライブ）。ヘッダーでいつでも切り替える */
  interest: string;
  /** 選んだ対象の既定リストだけホームに出す。端末内（localStorage）にだけ保存する */
  setInterest: (id: string) => void;
  /** 初回の状態（既定リストのみ・保存なし・興味はホロライブ）にする */
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

const DEFAULT_INTEREST = DEFAULT_LISTS[0].id;
const INTEREST_KEY = "mock:interest:v1";

/** 既定リストの条件ボタンは、興味の対象のものだけ「表示」にする */
const withInterest = (cs: Chip[], interest: string): Chip[] =>
  cs.map((c) => (c.isDefault ? { ...c, visible: c.id === interest } : c));

// 興味の対象は localStorage（端末内のみ）に持つ。静的 HTML は既定（ホロライブ）で出す
const interestListeners = new Set<() => void>();
const subscribeInterest = (fn: () => void) => {
  interestListeners.add(fn);
  return () => {
    interestListeners.delete(fn);
  };
};
const notifyInterest = () => interestListeners.forEach((fn) => fn());
const readInterest = (): string => {
  const saved = localStorage.getItem(INTEREST_KEY);
  return DEFAULT_LISTS.some((l) => l.id === saved)
    ? (saved as string)
    : DEFAULT_INTEREST;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const interest = useSyncExternalStore(
    subscribeInterest,
    readInterest,
    () => DEFAULT_INTEREST,
  );
  const [appliedInterest, setAppliedInterest] = useState(DEFAULT_INTEREST);
  const [chips, setChips] = useState<Chip[]>(() =>
    withInterest(INITIAL_CHIPS, DEFAULT_INTEREST),
  );
  // 興味の対象が変わったら、描画の中で条件ボタンの表示を合わせる（effect を使わない）
  if (appliedInterest !== interest) {
    setAppliedInterest(interest);
    setChips((cs) => withInterest(cs, interest));
  }
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
  const live = useRef({ chips, favs, groups, trash, history });
  useEffect(() => {
    live.current = { chips, favs, groups, trash, history };
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

  const query = useMemo(
    () => buildQuery({ word, exact, chips, detail, period, extra: sugOn }),
    [word, exact, chips, detail, period, sugOn],
  );
  // サジェスト：直近の検索（履歴）の条件から、条件ボタンに無いものを最大 LIMITS.suggest 件
  const suggestions = useMemo(() => {
    const have = new Set(chips.flatMap((c) => chipTokens(c)));
    const fromHistory = history.flatMap((h) => h.query.split(/\s+/));
    return [...new Set([...fromHistory, ...SUGGEST_SEEDS])]
      .filter((t) => /[:#()-]/.test(t) && !t.startsWith("since:"))
      .filter((t) => !have.has(t))
      .slice(0, LIMITS.suggest);
  }, [chips, history]);
  const usedChips = useMemo(
    () => chips.filter((c) => c.on && c.visible),
    [chips],
  );

  const setInterest = useCallback((id: string) => {
    if (!DEFAULT_LISTS.some((l) => l.id === id)) return;
    localStorage.setItem(INTEREST_KEY, id);
    notifyInterest();
  }, []);

  const startFresh = useCallback(() => {
    localStorage.removeItem(INTEREST_KEY);
    notifyInterest();
    setAppliedInterest(DEFAULT_INTEREST);
    setChips(withInterest(defaultChips(), DEFAULT_INTEREST));
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
        if (live.current.chips.length >= LIMITS.chips)
          return `条件ボタンが上限（${LIMITS.chips}件）のため復元できません。不要なボタンを削除してください`;
        const at = Math.min(item.index, live.current.chips.length);
        setChips((c) => [...c.slice(0, at), item.data, ...c.slice(at)]);
      } else if (item.kind === "fav") {
        setFavs((f) => [...f, item.data]);
      } else {
        setGroups((g) => [...g, item.data]);
      }
      setTrash((t) => t.filter((x) => x.tid !== tid));
      return null;
    },
    [setChips],
  );

  const store: Store = {
    chips,
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
      setChips((cs) => [
        ...cs,
        {
          id: nid("sg"),
          label,
          on: false,
          isNew: true,
          visible: true,
          conds: [{ id: nid("sgc"), kind: "raw", value: token }],
        },
      ]);
      setSugOn((v) => v.filter((x) => x !== token));
      say(`条件ボタン「${label}」に追加しました`);
      return null;
    },
    setChips,
    toggleChip: (id) =>
      setChips((cs) =>
        cs.map((c) => (c.id === id ? { ...c, on: !c.on, isNew: false } : c)),
      ),
    setChipOn: (id, on) =>
      setChips((cs) =>
        cs.map((c) => (c.id === id ? { ...c, on, isNew: false } : c)),
      ),
    setCondValue: (chipId, condId, value) =>
      setChips((cs) =>
        cs.map((c) =>
          c.id === chipId
            ? {
                ...c,
                isNew: false,
                conds: c.conds.map((x) =>
                  x.id === condId ? { ...x, value } : x,
                ),
              }
            : c,
        ),
      ),
    toggleVisible: (id) =>
      setChips((cs) =>
        cs.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
      ),
    saveChip: (chip) => {
      const exists = live.current.chips.some((c) => c.id === chip.id);
      if (!exists && live.current.chips.length >= LIMITS.chips)
        return `上限（${LIMITS.chips}件）です。不要なボタンを削除してください`;
      setChips((cs) =>
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
      setChips((cs) => cs.filter((c) => c.id !== id));
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
    addDefaultChips: () => {
      let added = 0;
      const have = live.current.chips.map((c) => c.id);
      const room = LIMITS.chips - live.current.chips.length;
      const add = defaultChips()
        .filter((c) => !have.includes(c.id))
        .slice(0, Math.max(room, 0));
      added = add.length;
      if (added) setChips((cs) => [...cs, ...add]);
      return added;
    },
    saveFav: (fav) => {
      const exists = live.current.favs.some((f) => f.id === fav.id);
      setFavs((fs) =>
        exists ? fs.map((f) => (f.id === fav.id ? fav : f)) : [...fs, fav],
      );
      say(`お気に入り「${fav.name}」を保存しました`);
    },
    deleteFav: (id) => {
      const index = live.current.favs.findIndex((f) => f.id === id);
      const fav = live.current.favs[index];
      if (!fav) return;
      // いつものエゴサはコピーを持っているので、何も連動しない
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
      say(`${engine} で開きました（ダミー）`);
    },
    runFav: (id, source) => {
      const f = live.current.favs.find((x) => x.id === id);
      if (!f) return;
      setHistory((h) =>
        [
          {
            id: nid("h"),
            at: NOW,
            word: "",
            query: savedText(f),
            engine: "X" as const,
            source: source ?? `お気に入り「${f.name}」`,
            chipLabels: [],
          },
          ...h,
        ].slice(0, LIMITS.history),
      );
      setFavs((fs) => fs.map((x) => (x.id === id ? { ...x, last: "今" } : x)));
      say(`「${f.name}」を開きました（ダミー）`);
    },
    runGroup: (id) => {
      const g = live.current.groups.find((x) => x.id === id);
      if (!g) return;
      g.items.forEach((item) => {
        setHistory((h) =>
          [
            {
              id: nid("h"),
              at: NOW,
              word: "",
              query: savedText(item),
              engine: "X" as const,
              source: `いつものエゴサ「${g.name}」`,
              chipLabels: [],
            },
            ...h,
          ].slice(0, LIMITS.history),
        );
      });
      setGroups((gs) =>
        gs.map((x) => (x.id === id ? { ...x, doneToday: true } : x)),
      );
      say(`「${g.name}」：${g.items.length}個のタブを開きました（ダミー）`);
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
    usedChips,
    query,
    interest,
    setInterest,
    startFresh,
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export { DEFAULT_LISTS };
