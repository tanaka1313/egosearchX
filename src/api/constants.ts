/**
 * 契約が持つ定数（docs/api-spec.md 3章）。operators.ts（エンジン別の対応と status）はこれを import して、
 * キーを1か所に揃える。ラベル・接尾語などの文言は辞書が持つ。
 */
import type { Detail, Period, Tri } from "./types";

/** 値付きの条件の演算子と、値の種類 */
export const PARAM_OP_TYPES = {
  min_faves: "number",
  min_retweets: "number",
  min_replies: "number",
  since: "date",
  until: "date",
} as const satisfies Record<string, "number" | "date">;
export type ParamOp = keyof typeof PARAM_OP_TYPES;

/**
 * 条件ボタン・検索ワードで値を入れられる演算子（`Cond.op`）。キーは条件の行の演算子名、`prefix` は検索文字列での書き方。
 * - `PARAM_OP_TYPES`（検索の木が持つ数値・日付の演算子）に、アカウント（from／メンション）とリストの ID、
 *   否定の `-from:`／`-@`／`-since:` を足したもの。接頭辞は `operators.ts` の定義と一致させる（テストで確認）。
 * - `-list:` は X でエラーになるので無い。`-since:` は実機で確かめていない（Yahoo!リアルタイム検索では解析できず警告になる）。
 * - `period`：画面の「期間」が指定されたとき、その期間に置き換わる演算子。
 * - `text` の値は X のユーザー名の形（1〜15 字の英数字と `_`）。
 */
export const VALUE_OPS = {
  min_faves: { prefix: "min_faves:", type: "number" },
  min_retweets: { prefix: "min_retweets:", type: "number" },
  min_replies: { prefix: "min_replies:", type: "number" },
  since: { prefix: "since:", type: "date", period: true },
  until: { prefix: "until:", type: "date", period: true },
  "-since": { prefix: "-since:", type: "date" },
  from: { prefix: "from:", type: "text" },
  "-from": { prefix: "-from:", type: "text" },
  mention: { prefix: "@", type: "text" },
  "-mention": { prefix: "-@", type: "text" },
  list: { prefix: "list:", type: "number" },
} as const satisfies Record<
  string,
  { prefix: string; type: "number" | "date" | "text"; period?: true }
>;
export type ValueOp = keyof typeof VALUE_OPS;
export type ValueType = (typeof VALUE_OPS)[ValueOp]["type"];

/** 画面の「期間」が指定されたとき、その期間に置き換わる演算子（開始日・終了日）か */
export const isPeriodOp = (op: ValueOp): boolean =>
  "period" in VALUE_OPS[op] && VALUE_OPS[op].period === true;

/** 値として保存してよい形か。数値・リスト ID は1以上の整数、日付は実在する YYYY-MM-DD、ユーザー名は X の形 */
export function isValidValue(type: ValueType, v: string): boolean {
  if (type === "number") return /^[1-9]\d*$/.test(v);
  if (type === "text") return /^\w{1,15}$/.test(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
}

/** 詳細条件のフィルタ（`filter:<key>`） */
export const FILTER_KEYS = [
  "replies",
  "retweets",
  "quote",
  "images",
  "videos",
  "links",
  "verified",
] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export const EMPTY_PERIOD: Period = { kind: "none", from: "", to: "" };

export const EMPTY_DETAIL: Detail = {
  exact: [],
  plain: [],
  variants: [],
  exclude: [],
  from: "",
  to: "",
  mention: "",
  list: "",
  exFrom: "",
  exTo: "",
  exMention: "",
  flt: Object.fromEntries(FILTER_KEYS.map((k) => [k, "any" as Tri])) as Record<
    FilterKey,
    Tri
  >,
  lang: "",
  minFaves: "",
  minRt: "",
  minReplies: "",
  disabledConds: [],
  raw: "",
};
