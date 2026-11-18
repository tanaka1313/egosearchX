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
