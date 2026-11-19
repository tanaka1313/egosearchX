import { en } from "./en";
import { ja, type Messages } from "./ja";

export { ENGINE_LABEL, ENGINE_SHORT } from "./engine";
export type { Messages } from "./ja";

export type Lang = "ja" | "en";

/** 言語ごとの辞書。`en` が `Messages` を満たさなければ型エラーになり、ビルドが止まる */
export const dictionaries: Record<Lang, Messages> = { ja, en };

/**
 * ブラウザの言語タグから表示言語を決める（日本語以外は英語）。
 * `navigator.languages[0]` などを渡す純粋関数。
 */
export function detectLang(tag: string | undefined): Lang {
  return /^ja(?:[-_]|$)/i.test(tag ?? "") ? "ja" : "en";
}
