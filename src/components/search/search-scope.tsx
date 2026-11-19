"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
  type Period,
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

/**
 * ホームの検索の組み立て：ストアの `home`（保存しない）と、条件ボタンの `on`（保存する）から作る。
 * 条件ボタンの ON は `chips.setOn`（async）。失敗はトーストで知らせ、壊れたデータ（CORRUPT）は書かない。
 */
export function HomeScopeProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const { t } = useI18n();
  const toast = useToast();
  const runner = useRunner();
  const reportBlocked = useReportBlocked();

  const ready = useAppStore((s) => s.status === "ready");
  const interest = useAppStore(
    (s) => s.prefs?.interest ?? DEFAULT_PREFS.interest,
  );
  const allChips = useAppStore((s) => s.chips);
  const history = useAppStore((s) => s.history);
  const home = useAppStore(useShallow((s) => s.home));
  const setHome = useAppStore((s) => s.home_set);
  const chipsSetOn = useAppStore((s) => s.chips_setOn);
  const chipsSetValue = useAppStore((s) => s.chips_setValue);
  const chipSeen = useAppStore((s) => s.chip_seen);

  const chips = useMemo(
    () => allChips.get(interest) ?? [],
    [allChips, interest],
  );
  const visibleChips = useMemo(() => chips.filter((c) => c.visible), [chips]);
  const usedChips = useMemo(
    () => visibleChips.filter((c) => c.on),
    [visibleChips],
  );

  const state = useMemo<SearchState>(
    () => ({
      word: home.word,
      exact: home.exact,
      onChipIds: chips.filter((c) => c.on).map((c) => c.id),
      suggestionTokens: home.suggestionTokens,
      detail: home.detail,
      period: home.period,
    }),
    [home, chips],
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
      setHome({
        suggestionTokens: home.suggestionTokens.includes(token)
          ? home.suggestionTokens.filter((x) => x !== token)
          : [...home.suggestionTokens, token],
      }),
    resetDetail: () => {
      const prev = { detail: home.detail, period: home.period };
      setHome({ detail: EMPTY_DETAIL, period: EMPTY_PERIOD });
      toast.show(t.search.detail.resetDone, () => setHome(prev));
    },

    chips,
    visibleChips,
    usedChips,
    isOn: (id) => chips.some((c) => c.id === id && c.on),
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

    built,
    suggestions: suggestionsWithoutStarters,
    starters,
    wordSet,
    ready,
    run: (engine) => {
      // 開く・コピー・保存を止める理由（検索語も条件も無い、期間が逆）があるときは開かない
      if (built.blockers.length > 0) return;
      const { total, blocked } = runner([{ query: built.stored, engine }], {
        kind: "home",
        label: home.word,
      });
      if (blocked.length > 0) reportBlocked(total, blocked);
    },
  };
  return <Ctx.Provider value={scope}>{children}</Ctx.Provider>;
}
