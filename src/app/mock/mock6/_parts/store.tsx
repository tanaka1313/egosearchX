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
} from "react";
import {
  DEFAULT_LISTS,
  EMPTY_DETAIL,
  EMPTY_PERIOD,
  INITIAL_CHIPS,
  INITIAL_FAVORITES,
  INITIAL_GROUPS,
  INITIAL_HISTORY,
  LIMITS,
  defaultChips,
  type Chip,
  type Detail,
  type Favorite,
  type Group,
  type HistoryItem,
  type Period,
  type TrashItem,
} from "./data";
import { buildQuery, chipTokens, detailTokens } from "./query";

type Toast = { id: string; msg: string; undo?: () => void };

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
  autoAdd: boolean;
  recordHistory: boolean;
  toast: Toast | null;
  notice: string;
  setWord: (v: string) => void;
  setExact: (v: boolean) => void;
  setDetail: (f: (d: Detail) => Detail) => void;
  setPeriod: (p: Period) => void;
  setAutoAdd: (v: boolean) => void;
  setRecordHistory: (v: boolean) => void;
  setChips: (c: Chip[]) => void;
  toggleChip: (id: string) => void;
  saveChip: (chip: Chip) => string | null;
  deleteChip: (id: string) => void;
  addDefaultChips: () => number;
  saveFav: (fav: Favorite) => void;
  deleteFav: (id: string) => void;
  saveGroup: (g: Group) => void;
  deleteGroup: (id: string) => void;
  restore: (tid: string) => string | null;
  purge: (tid: string) => void;
  purgeAll: () => void;
  run: (engine: "X" | "Yahoo", source: string) => void;
  runFav: (id: string, source?: string) => void;
  runGroup: (id: string) => void;
  clearHistory: () => void;
  resetAll: () => void;
  resetDetail: () => void;
  say: (msg: string, undo?: () => void) => void;
  setNotice: (m: string) => void;
  usedChips: Chip[];
  query: ReturnType<typeof buildQuery>;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider がありません");
  return s;
}

let seq = 100;
const nid = (p: string) => `${p}${++seq}`;
const NOW = "今";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [chips, setChips] = useState<Chip[]>(INITIAL_CHIPS);
  const [favs, setFavs] = useState<Favorite[]>(INITIAL_FAVORITES);
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [history, setHistory] = useState<HistoryItem[]>(INITIAL_HISTORY);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [word, setWord] = useState("メンバーA");
  const [exact, setExact] = useState(true);
  const [detail, setDetailState] = useState<Detail>(EMPTY_DETAIL);
  const [period, setPeriod] = useState<Period>(EMPTY_PERIOD);
  const [autoAdd, setAutoAdd] = useState(true);
  const [recordHistory, setRecordHistory] = useState(true);
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

  const pushTrash = useCallback((item: TrashItem) => {
    // 新しい順。上限を超えたら古いものから完全削除
    setTrash((t) => [item, ...t].slice(0, LIMITS.trash));
  }, []);

  const query = useMemo(
    () => buildQuery({ word, exact, chips, detail, period }),
    [word, exact, chips, detail, period],
  );
  const usedChips = useMemo(() => chips.filter((c) => c.on), [chips]);

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
    autoAdd,
    recordHistory,
    toast,
    notice,
    setWord,
    setExact,
    setDetail: (f) => setDetailState(f),
    setPeriod,
    setAutoAdd,
    setRecordHistory,
    setChips,
    toggleChip: (id) =>
      setChips((cs) =>
        cs.map((c) => (c.id === id ? { ...c, on: !c.on, isNew: false } : c)),
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
      say(`グループ「${g.name}」を保存しました`);
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
    purgeAll: () => setTrash([]),
    run: (engine, source) => {
      const q = buildQuery({ word, exact, chips, detail, period });
      const labels = chips.filter((c) => c.on).map((c) => c.label);
      let note: string | undefined;
      // 履歴から条件ボタンへ自動追加（詳細設定＝個別で使った条件）
      const dTokens = detailTokens(detail).filter(
        (x) => !detail.offTokens.includes(x),
      );
      if (autoAdd && dTokens.length) {
        const key = dTokens.join(" ");
        const dup = chips.some((c) => chipTokens(c).join(" ") === key);
        if (!dup) {
          if (chips.length >= LIMITS.chips) {
            note = `上限（${LIMITS.chips}件）のため条件ボタンに追加しませんでした`;
          } else {
            const label =
              dTokens.length > 1
                ? `${dTokens[0]} ほか${dTokens.length - 1}`
                : dTokens[0];
            setChips((cs) => [
              ...cs,
              {
                id: nid("auto"),
                label,
                on: false,
                isNew: true,
                conds: dTokens.map((v, i) => ({
                  id: nid(`ac${i}`),
                  kind: "raw",
                  value: v,
                })),
              },
            ]);
            note = `自動追加：「${label}」`;
          }
        }
      }
      if (recordHistory)
        setHistory((h) =>
          [
            {
              id: nid("h"),
              at: NOW,
              word,
              query: q.text,
              engine,
              source,
              chipLabels: labels,
              note,
            },
            ...h,
          ].slice(0, LIMITS.history),
        );
      say(`${engine} で開きました（ダミー）${note ? `／${note}` : ""}`);
    },
    runFav: (id, source) => {
      const f = live.current.favs.find((x) => x.id === id);
      if (!f) return;
      const missing = f.chipIds.filter(
        (cid) => !live.current.chips.some((c) => c.id === cid),
      );
      const q = buildQuery({
        word: f.word,
        exact: f.exact,
        chips: live.current.chips,
        detail: EMPTY_DETAIL,
        period: { ...EMPTY_PERIOD, kind: f.period },
        onlyChipIds: f.chipIds,
        extra: f.extra,
      });
      if (recordHistory)
        setHistory((h) =>
          [
            {
              id: nid("h"),
              at: NOW,
              word: f.word,
              query: q.text,
              engine: "X" as const,
              source: source ?? `お気に入り「${f.name}」`,
              chipLabels: live.current.chips
                .filter((c) => f.chipIds.includes(c.id))
                .map((c) => c.label),
            },
            ...h,
          ].slice(0, LIMITS.history),
        );
      setFavs((fs) => fs.map((x) => (x.id === id ? { ...x, last: "今" } : x)));
      say(
        missing.length
          ? `「${f.name}」を開きました（削除済みの条件ボタン ${missing.length} 件は適用していません）`
          : `「${f.name}」を開きました（ダミー）`,
      );
    },
    runGroup: (id) => {
      const g = live.current.groups.find((x) => x.id === id);
      if (!g) return;
      g.favIds.forEach((fid) => {
        const f = live.current.favs.find((x) => x.id === fid);
        if (!f) return;
        const q = buildQuery({
          word: f.word,
          exact: f.exact,
          chips: live.current.chips,
          detail: EMPTY_DETAIL,
          period: { ...EMPTY_PERIOD, kind: f.period },
          onlyChipIds: f.chipIds,
          extra: f.extra,
        });
        if (recordHistory)
          setHistory((h) =>
            [
              {
                id: nid("h"),
                at: NOW,
                word: f.word,
                query: q.text,
                engine: "X" as const,
                source: `グループ「${g.name}」`,
                chipLabels: [],
              },
              ...h,
            ].slice(0, LIMITS.history),
          );
      });
      setGroups((gs) =>
        gs.map((x) => (x.id === id ? { ...x, doneToday: true } : x)),
      );
      say(`「${g.name}」：${g.favIds.length}個のタブを開きました（ダミー）`);
    },
    clearHistory: () => setHistory([]),
    resetAll: () => {
      setChips(defaultChips());
      setFavs([]);
      setGroups([]);
      setHistory([]);
      setTrash([]);
      setDetailState(EMPTY_DETAIL);
      setPeriod(EMPTY_PERIOD);
    },
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
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export { DEFAULT_LISTS };
