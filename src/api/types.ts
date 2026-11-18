/** 境界で使う型（docs/api-spec.md 3章）。保存しない計算の入出力と、マスタ・ランチャーの形。 */
import { z } from "zod";
import {
  EngineSchema,
  type Engine,
  type HistoryItem,
  type InterestId,
} from "./entities";
import type { FilterKey, ParamOp } from "./constants";
import type { Issue } from "./issues";

export type Period = {
  kind: "none" | "d1" | "d3" | "d7" | "date";
  /** kind が date のときだけ使う（YYYY-MM-DD。空なら指定なし） */
  from: string;
  to: string;
};
export type Tri = "any" | "inc" | "exc";

/** 詳細条件。空の値は `EMPTY_DETAIL` */
export type Detail = {
  exact: string[];
  plain: string[];
  variants: string[];
  exclude: string[];
  from: string;
  to: string;
  mention: string;
  list: string;
  /** アカウントの除外（-from: -to: -@） */
  exFrom: string;
  exTo: string;
  exMention: string;
  flt: Record<FilterKey, Tri>;
  lang: string;
  minFaves: string;
  minRt: string;
  minReplies: string;
  /** `<ボタンID>::<トークン>`（disabledKey） */
  disabledConds: string[];
  /** 「テキストで追加」 */
  raw: string;
};

export type CondKind =
  | "word"
  | "exact"
  | "exclude"
  | "list"
  | "account"
  | "filter"
  | "raw"
  | "number"
  | "date";
export type Cond = { id: string; kind: CondKind; value: string; op?: ParamOp };

/** 検索の組み立ての状態（ホームもページ内の組み立ても同じ形） */
export type SearchState = {
  word: string;
  exact: boolean;
  /** ON の条件ボタンの ID */
  onChipIds: string[];
  /** この検索だけ ON にしたサジェスト・検索ワード集 */
  suggestionTokens: string[];
  detail: Detail;
  period: Period;
};

export type BuiltQuery = {
  /** 保存形（お気に入り・いつものエゴサの本体。相対期間は記号のまま） */
  stored: string;
  /** 開く時点の文字列（記号を日付に展開済み。クエリ表示・コピー） */
  text: string;
  /** 枠の下の警告欄に出す */
  warnings: Issue[];
  /** 保存・追加・開くを止める理由 */
  blockers: Issue[];
  /** 実験的な演算子を含む */
  experimental: boolean;
};

/** query.parse の結果 */
export type ParsedScope = {
  word: string;
  exact: boolean;
  onChipIds: string[];
  detail: Detail;
  period: Period;
};

/** = GroupItem */
export type PlanItem = { query: string; engine: Engine };
export type OpenTarget = {
  engine: "x" | "yahoo";
  url: string;
  /** 開く時点の文字列（記号を日付に展開済み）。履歴に残す */
  query: string;
  /** 展開前の保存形（PlanItem.query）。お気に入りの lastRunAt の照合に使う */
  stored: string;
  warnings: Issue[];
};
/** both は x・yahoo の2件。順番が開く順 */
export type RunPlan = { targets: OpenTarget[]; warnings: Issue[] };
/** groupId：いつものエゴサの lastRunAt を更新する（ランチャーは付けない） */
export type RunSource = HistoryItem["source"] & { groupId?: string };
export type ParsedUrl = {
  engine: "x" | "yahoo";
  query: string;
  tokens: { text: string; raw: boolean }[];
};

export type Interest = {
  id: InterestId;
  label: { ja: string; en: string };
  list: { label: string; listId: string } | null;
};

/** 検索ワード集の1件。query が本体（興味の対象の中での重複の検証は、マスタ全体のスキーマが行う） */
export const WordSchema = z.object({
  label: z.string().min(1),
  query: z.string().min(1),
  starter: z.boolean(),
});
export type Word = z.infer<typeof WordSchema>;

/** チャンネル単位。配列の順が表示順 */
export const WordGroupSchema = z.object({
  name: z.object({ ja: z.string().min(1), en: z.string().min(1) }),
  words: z.array(WordSchema),
});
export type WordGroup = z.infer<typeof WordGroupSchema>;

export const LauncherPayloadSchema = z.object({
  name: z.string().min(1),
  items: z.array(z.object({ query: z.string(), engine: EngineSchema })),
});
export type LauncherPayload = z.infer<typeof LauncherPayloadSchema>;
