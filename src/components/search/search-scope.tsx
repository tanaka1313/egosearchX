"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useShallow } from "zustand/react/shallow";
import {
  ApiError,
  DEFAULT_PREFS,
  EMPTY_DETAIL,
  EMPTY_PERIOD,
  type BuiltQuery,
  type Chip,
  type Detail,
  type ParsedScope,
  type Period,
  type RunSource,
  type SearchState,
  type WordGroup,
} from "@/api";
import { useReportBlocked } from "@/components/common/blocked-context";
import { useToast } from "@/components/common/toast";
import { useRunner } from "@/components/common/use-runner";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

/**
 * 検索の組み立ての状態と操作（画面仕様書 3.1）。部品（条件ボタンの並び・期間・詳細条件・クエリ表示・開くボタン）は
 * これだけを読むので、ホーム・お気に入りの編集・いつものエゴサの追加で同じ部品を使える。
 * 状態の置き場所は画面ごとに決める（ホームはストアの `home`。それ以外はページの中だけの状態を同じ形で渡す）。
 */
export type SearchScope = {
  word: string;
  setWord(v: string): void;
  exact: boolean;
  setExact(v: boolean): void;
  detail: Detail;
  setDetail(f: (d: Detail) => Detail): void;
  period: Period;
  setPeriod(p: Period): void;
  /** この検索だけ ON にしたサジェスト */
  suggestionTokens: string[];
  toggleSuggestion(token: string): void;
  /** 詳細条件と期間を空に戻す（トーストの［元に戻す］付き） */
  resetDetail(): void;

  /** この対象の条件ボタン（非表示も含む。order 順） */
  chips: Chip[];
  /** 「表示」にしたもの */
  visibleChips: Chip[];
  /** ON かつ「表示」のもの（クエリに使われる） */
  usedChips: Chip[];
  isOn(chipId: string): boolean;
  toggle(chipId: string): void;
  /** 値付きの条件の値をボタンに保存し、この検索では ON にする */
  setChipValue(chipId: string, condId: string, value: string): void;

  built: BuiltQuery;
  /** サジェストの候補（この検索に入っているもの・条件ボタンにあるものを除く） */
  suggestions: string[];
  /** 履歴が0件のときだけ、条件ボタンの続きに出す検索ワード集の検索文字列（条件ボタンにあるものを除く） */
  starters: string[];
  /** 今の興味の対象の検索ワード集（D4 のグループ。ON は `suggestionTokens`＝画面ごとの状態） */
  wordSet: WordGroup[];
  /** ストアの読み込みが済み、操作できる（読み込み中・壊れているときは false） */
  ready: boolean;
  /** この画面の検索を開く（ユーザーのクリックの中で呼ぶ） */
  run(engine: "x" | "yahoo"): void;
};

const Ctx = createContext<SearchScope | null>(null);

export function useSearchScope(): SearchScope {
  const s = useContext(Ctx);
  if (!s) throw new Error("SearchScope がありません");
  return s;
}

export function SearchScopeProvider({
  value,
  children,
}: {
  value: SearchScope;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** 検索の組み立ての入力。置き場所（ストアの `home`／ページの中の状態）は呼び出し側が決める */
type CoreInput = {
  word: string;
  exact: boolean;
  detail: Detail;
  period: Period;
  suggestionTokens: string[];
  /** ON の条件ボタンの ID。null は、保存している `chip.on`（ホーム） */
  onChipIds: string[] | null;
  /** 開いたときの履歴の出どころ */
  source: RunSource;
};

/**
 * ホームとページ内の組み立てで共通の計算：今の対象の条件ボタン、組み立てたクエリ、サジェスト、検索ワード集、開く処理。
 * 状態を変える操作（トグル・値・サジェストの ON）は置き場所で変わるので、呼び出し側が持つ。
 */
function useScopeCore(input: CoreInput) {
  const api = useApi();
  const toast = useToast();
  const { t } = useI18n();
  const runner = useRunner();
  const reportBlocked = useReportBlocked();

  const ready = useAppStore((s) => s.status === "ready");
  const interest = useAppStore(
    (s) => s.prefs?.interest ?? DEFAULT_PREFS.interest,
  );
  const allChips = useAppStore((s) => s.chips);
  const history = useAppStore((s) => s.history);

  const { word, exact, detail, period, suggestionTokens, onChipIds, source } =
    input;

  const chips = useMemo(
    () => allChips.get(interest) ?? [],
    [allChips, interest],
  );
  const visibleChips = useMemo(() => chips.filter((c) => c.visible), [chips]);
  const onIds = useMemo(
    () => onChipIds ?? chips.filter((c) => c.on).map((c) => c.id),
    [onChipIds, chips],
  );
  const usedChips = useMemo(
    () => visibleChips.filter((c) => onIds.includes(c.id)),
    [visibleChips, onIds],
  );

  const state = useMemo<SearchState>(
    () => ({
      word,
      exact,
      onChipIds: onIds,
      suggestionTokens,
      detail,
      period,
    }),
    [word, exact, onIds, suggestionTokens, detail, period],
  );
  const built = useMemo(
    () => api.query.build(state, chips),
    [api, state, chips],
  );
  // 候補は「この検索だけ ON にしたもの」を除いた検索から求める。ON にした候補が一覧から消えると、
  // 押した後に外せなくなり、並びも動いてしまう（押しても動かさない）
  const suggestions = useMemo(
    () =>
      api.query.suggest({
        text: api.query.build({ ...state, suggestionTokens: [] }, chips).stored,
        chips,
        history,
      }),
    [api, state, chips, history],
  );
  // 履歴0件のときだけ出る検索ワード集。サジェストの候補と同じ文字列は、ボタンが2つ並ばないようサジェスト側から除く
  const starters = useMemo(
    () => api.query.starters({ interest, chips, history }),
    [api, interest, chips, history],
  );
  const wordSet = useMemo(() => api.master.wordSet(interest), [api, interest]);
  const suggestionsWithoutStarters = useMemo(
    () => suggestions.filter((s) => !starters.includes(s)),
    [suggestions, starters],
  );

  /** 失敗は、壊れたデータなら黙り（書かないのが正しい）、それ以外はトーストで知らせる */
  const guard = useCallback(
    (p: Promise<unknown>) => {
      p.catch((e: unknown) => {
        if (e instanceof ApiError && e.code === "CORRUPT") return;
        console.error(e);
        toast.show(t.toast.saveFailed);
      });
    },
    [toast, t],
  );

  const run = (engine: "x" | "yahoo") => {
    // 開く・コピー・保存を止める理由（検索語も条件も無い、期間が逆）があるときは開かない
    if (built.blockers.length > 0) return;
    const { total, blocked } = runner(
      [{ query: built.stored, engine }],
      source,
    );
    if (blocked.length > 0) reportBlocked(total, blocked);
  };

  return {
    ready,
    chips,
    visibleChips,
    usedChips,
    isOn: (id: string) => onIds.includes(id),
    built,
    suggestions: suggestionsWithoutStarters,
    starters,
    wordSet,
    guard,
    run,
  };
}

/** サジェスト／検索ワード集のトークンの ON/OFF を反転した配列 */
function flip(tokens: string[], token: string): string[] {
  return tokens.includes(token)
    ? tokens.filter((x) => x !== token)
    : [...tokens, token];
}

/**
 * ホームの検索の組み立て：ストアの `home`（保存しない）と、条件ボタンの `on`（保存する）から作る。
 * 条件ボタンの ON は `chips.setOn`（async）。失敗はトーストで知らせ、壊れたデータ（CORRUPT）は書かない。
 */
export function HomeScopeProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const toast = useToast();

  const home = useAppStore(useShallow((s) => s.home));
  const setHome = useAppStore((s) => s.home_set);
  const chipsSetOn = useAppStore((s) => s.chips_setOn);
  const chipsSetValue = useAppStore((s) => s.chips_setValue);
  const chipSeen = useAppStore((s) => s.chip_seen);

  const core = useScopeCore({
    ...home,
    onChipIds: null,
    source: { kind: "home", label: home.word },
  });
  const { chips, ready, guard } = core;

  const scope: SearchScope = {
    word: home.word,
    setWord: (word) => setHome({ word }),
    exact: home.exact,
    setExact: (exact) => setHome({ exact }),
    detail: home.detail,
    setDetail: (f) => setHome({ detail: f(home.detail) }),
    period: home.period,
    setPeriod: (period) => setHome({ period }),
    suggestionTokens: home.suggestionTokens,
    toggleSuggestion: (token) =>
      setHome({ suggestionTokens: flip(home.suggestionTokens, token) }),
    resetDetail: () => {
      const prev = { detail: home.detail, period: home.period };
      setHome({ detail: EMPTY_DETAIL, period: EMPTY_PERIOD });
      toast.show(t.search.detail.resetDone, () => setHome(prev));
    },

    chips,
    visibleChips: core.visibleChips,
    usedChips: core.usedChips,
    isOn: core.isOn,
    toggle: (id) => {
      const chip = chips.find((c) => c.id === id);
      if (!chip || !ready) return;
      chipSeen(id); // 「新」印は、初めて押すと消える
      guard(chipsSetOn(id, !chip.on));
    },
    setChipValue: (id, condId, value) => {
      if (!ready) return;
      chipSeen(id);
      guard(chipsSetValue(id, condId, value));
    },

    built: core.built,
    suggestions: core.suggestions,
    starters: core.starters,
    wordSet: core.wordSet,
    ready,
    run: core.run,
  };
  return <Ctx.Provider value={scope}>{children}</Ctx.Provider>;
}

/**
 * ページの中だけの検索の組み立て（お気に入りの編集 S3-E。いつものエゴサの追加・編集 S4-E も同じ）。
 * 初期値は `initial`（開いたときに1回だけ作る。親が `key` で作り直す）。条件ボタンの ON・サジェスト・検索ワード集の ON・
 * 検索語・期間・詳細条件は、このページの中だけで持ち、**ホームにも保存済みの `chip.on` にも書かない**（画面仕様書 3.1）。
 * 例外は値付きの条件の値で、ボタン自体に保存されるのでどの画面で変えても共通になる。
 */
export function LocalScopeProvider({
  initial,
  children,
}: {
  initial: ParsedScope;
  children: ReactNode;
}) {
  const api = useApi();
  const toast = useToast();
  const { t } = useI18n();
  const chipSeen = useAppStore((s) => s.chip_seen);
  const chipsSave = useAppStore((s) => s.chips_save);

  const [word, setWord] = useState(initial.word);
  const [exact, setExact] = useState(initial.exact);
  const [detail, setDetail] = useState(initial.detail);
  const [period, setPeriod] = useState(initial.period);
  const [onChipIds, setOnChipIds] = useState(initial.onChipIds);
  const [suggestionTokens, setSuggestionTokens] = useState<string[]>([]);

  const core = useScopeCore({
    word,
    exact,
    detail,
    period,
    suggestionTokens,
    onChipIds,
    source: { kind: "other", label: word },
  });
  const { chips, ready, guard } = core;

  const scope: SearchScope = {
    word,
    setWord,
    exact,
    setExact,
    detail,
    setDetail: (f) => setDetail((d) => f(d)),
    period,
    setPeriod,
    suggestionTokens,
    toggleSuggestion: (token) =>
      setSuggestionTokens((tokens) => flip(tokens, token)),
    resetDetail: () => {
      const prev = { detail, period };
      setDetail(EMPTY_DETAIL);
      setPeriod(EMPTY_PERIOD);
      toast.show(t.search.detail.resetDone, () => {
        setDetail(prev.detail);
        setPeriod(prev.period);
      });
    },

    chips,
    visibleChips: core.visibleChips,
    usedChips: core.usedChips,
    isOn: core.isOn,
    toggle: (id) => {
      if (!chips.some((c) => c.id === id) || !ready) return;
      chipSeen(id);
      setOnChipIds((ids) => flip(ids, id));
    },
    setChipValue: (id, condId, value) => {
      const chip = chips.find((c) => c.id === id);
      if (!chip || !ready) return;
      chipSeen(id);
      // `chips.setValue` は保存済みの ON も true にする（ホームの ON を変えてしまう）ので使わない。
      // 値だけを差し替えて保存する（`on`・`visible` を省略すると既存の値が保たれる）
      const query = api.query.condsToQuery(
        api.query
          .chipConds(chip)
          .map((c) => (c.id === condId ? { ...c, value } : c)),
      );
      guard(
        chipsSave({
          id: chip.id,
          interestId: chip.interestId,
          label: chip.label,
          query,
        }),
      );
      setOnChipIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    },

    built: core.built,
    suggestions: core.suggestions,
    starters: core.starters,
    wordSet: core.wordSet,
    ready,
    run: core.run,
  };
  return <Ctx.Provider value={scope}>{children}</Ctx.Provider>;
}
