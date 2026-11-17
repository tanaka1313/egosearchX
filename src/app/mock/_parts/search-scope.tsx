"use client";
// MOCK: 破棄予定（#61）
// 検索の組み立て（検索語・完全一致・条件ボタンの ON・サジェスト・期間・詳細条件）の状態を、
// 画面ごとに差し替えられるようにするコンテキスト。
// 部品（ChipRow・DetailPanel・QueryPreview など）は useSearchScope() だけを読むので、
// ホームといつものエゴサの編集ページで、同じ部品・同じ処理を使える（UI の置き場所は画面ごとに決める）。
// - ホーム：ストアの状態（条件ボタンの on、s.period など）をそのまま使う
// - それ以外：ページの中だけの状態。条件ボタンの ON は ID の配列で持ち、ホームの ON/OFF には影響しない
// 条件ボタンの一覧・値（値付きの条件）・サジェストの候補は、どの画面でも同じストアのものを使う。
import { createContext, useContext, useMemo, useState } from "react";
import {
  EMPTY_DETAIL,
  EMPTY_PERIOD,
  type Chip,
  type Detail,
  type Period,
} from "./data";
import { buildQuery } from "./query";
import { useStore } from "./store";

export type SearchScope = {
  word: string;
  setWord: (v: string) => void;
  exact: boolean;
  setExact: (v: boolean) => void;
  isOn: (chipId: string) => boolean;
  toggle: (chipId: string) => void;
  setOn: (chipId: string, on: boolean) => void;
  detail: Detail;
  setDetail: (f: (d: Detail) => Detail) => void;
  /** 詳細条件と期間を空に戻す */
  resetDetail: () => void;
  period: Period;
  setPeriod: (p: Period) => void;
  sugOn: string[];
  toggleSuggestion: (token: string) => void;
  /** 組み立てた検索（期間を含む） */
  query: ReturnType<typeof buildQuery>;
  /** ON かつ「表示」の条件ボタン */
  usedChips: Chip[];
  /** この画面の検索を開く（ダミー。履歴に残す） */
  run: (engine: "X" | "Yahoo") => void;
};

const Ctx = createContext<SearchScope | null>(null);

export function useSearchScope(): SearchScope {
  const s = useContext(Ctx);
  if (!s) throw new Error("SearchScope がありません");
  return s;
}

/** ホーム：ストアの状態をそのまま使う */
export function HomeScopeProvider({ children }: { children: React.ReactNode }) {
  const s = useStore();
  const scope: SearchScope = {
    word: s.word,
    setWord: s.setWord,
    exact: s.exact,
    setExact: s.setExact,
    isOn: (id) => s.chips.some((c) => c.id === id && c.on),
    toggle: s.toggleChip,
    setOn: s.setChipOn,
    detail: s.detail,
    setDetail: s.setDetail,
    resetDetail: s.resetDetail,
    period: s.period,
    setPeriod: s.setPeriod,
    sugOn: s.sugOn,
    toggleSuggestion: s.toggleSuggestion,
    query: s.query,
    usedChips: s.usedChips,
    run: (engine) => s.run(engine, "ホーム"),
  };
  return <Ctx.Provider value={scope}>{children}</Ctx.Provider>;
}

/** ページの中だけの検索の組み立て（初期値は空。ホームの状態はコピーしない） */
export function LocalScopeProvider({
  source,
  children,
}: {
  /** 開いたときに履歴に残す出どころ（例：いつものエゴサの編集） */
  source: string;
  children: React.ReactNode;
}) {
  const { chips, say, run } = useStore();
  const [word, setWord] = useState("");
  const [exact, setExact] = useState(false);
  const [onIds, setOnIds] = useState<string[]>([]);
  const [detail, setDetailState] = useState<Detail>(EMPTY_DETAIL);
  const [period, setPeriod] = useState<Period>(EMPTY_PERIOD);
  const [sugOn, setSugOn] = useState<string[]>([]);

  const query = useMemo(
    () =>
      buildQuery({
        word,
        exact,
        chips,
        detail,
        period,
        onlyChipIds: onIds,
        extra: sugOn,
      }),
    [word, exact, chips, detail, period, onIds, sugOn],
  );
  const usedChips = useMemo(
    () => chips.filter((c) => c.visible && onIds.includes(c.id)),
    [chips, onIds],
  );

  const setOn = (id: string, on: boolean) =>
    setOnIds((v) =>
      on ? (v.includes(id) ? v : [...v, id]) : v.filter((x) => x !== id),
    );

  const scope: SearchScope = {
    word,
    setWord,
    exact,
    setExact,
    isOn: (id) => onIds.includes(id),
    toggle: (id) => setOn(id, !onIds.includes(id)),
    setOn,
    detail,
    setDetail: (f) => setDetailState(f),
    resetDetail: () => {
      const prev = detail;
      const prevPeriod = period;
      setDetailState(EMPTY_DETAIL);
      setPeriod(EMPTY_PERIOD);
      say("個別設定をリセットしました", () => {
        setDetailState(prev);
        setPeriod(prevPeriod);
      });
    },
    period,
    setPeriod,
    sugOn,
    toggleSuggestion: (token) =>
      setSugOn((v) =>
        v.includes(token) ? v.filter((x) => x !== token) : [...v, token],
      ),
    query,
    usedChips,
    run: (engine) =>
      run(engine, source, {
        word,
        text: query.text,
        chipLabels: usedChips.map((c) => c.label),
      }),
  };
  return <Ctx.Provider value={scope}>{children}</Ctx.Provider>;
}
