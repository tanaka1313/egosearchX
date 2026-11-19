"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ApiError } from "@/api";
import { detectLang, dictionaries, type Lang, type Messages } from "@/messages";
import { useAppStore } from "./store-context";

export type I18nValue = {
  lang: Lang;
  /** 今の言語の辞書 */
  t: Messages;
  /** 言語を切り替えて保存する（保存データが壊れているときは、この画面だけ切り替わり、何も書かない） */
  setLang(lang: Lang): void;
};

const browserLang = (): Lang =>
  detectLang(navigator.languages?.[0] ?? navigator.language);
const subscribeBrowserLang = (onChange: () => void) => {
  window.addEventListener("languagechange", onChange);
  return () => window.removeEventListener("languagechange", onChange);
};

/** Provider が無いときは日本語（部品の単体テスト用。アプリでは `I18nProvider` が値を渡す） */
export const I18nContext = createContext<I18nValue>({
  lang: "ja",
  t: dictionaries.ja,
  setLang: () => {},
});

/**
 * 表示言語を決めて辞書を配る（`StoreProvider` の内側に置く）。
 * - 事前描画と最初の描画は日本語（ハイドレーションを一致させる）。読み込み中も日本語のまま。
 * - 読み込み後は、保存した言語 → ブラウザの言語（日本語以外は英語）の順。
 *   保存データが壊れて prefs が無いときも、ブラウザの言語で出す。
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const status = useAppStore((s) => s.status);
  const saved = useAppStore((s) => s.prefs?.lang ?? null);
  const prefsSet = useAppStore((s) => s.prefs_set);
  // ブラウザの言語。サーバー側・ハイドレーション時は ja、その後に本当の値へ切り替わる
  const browser = useSyncExternalStore(
    subscribeBrowserLang,
    browserLang,
    (): Lang => "ja",
  );
  // 保存できない（壊れたデータ）間の切替を、この画面だけに効かせる
  const [local, setLocal] = useState<Lang | null>(null);

  const lang: Lang =
    local ?? (status === "loading" ? "ja" : (saved ?? browser));

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // 壊れたデータの初期化（corrupt → ready）のとき、壊れている間に切り替えた言語を保存する
  // （画面の言語と保存値を食い違わせない）
  const prevStatus = useRef(status);
  useEffect(() => {
    const wasCorrupt = prevStatus.current === "corrupt";
    prevStatus.current = status;
    if (wasCorrupt && status === "ready" && local)
      prefsSet({ lang: local }).catch(console.error);
  }, [status, local, prefsSet]);

  const setLang = useCallback(
    (next: Lang) => {
      setLocal(next);
      prefsSet({ lang: next }).catch((e: unknown) => {
        // CORRUPT は書けないのが正しい動作。それ以外（想定外）はコンソールに残す
        if (!(e instanceof ApiError && e.code === "CORRUPT")) console.error(e);
      });
    },
    [prefsSet],
  );

  const value = useMemo(
    () => ({ lang, t: dictionaries[lang], setLang }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
