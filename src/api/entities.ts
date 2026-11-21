/**
 * 保存データのエンティティ（docs/requirements.md 11章）。契約が定義を持ち、lib/storage がこれを import する。
 * - 条件ボタン・お気に入り・いつものエゴサの本体は検索文字列（query）。相対期間は since:yesterday などの記号のまま持つ。
 * - 互いを ID で参照しない（関係は正規化した文字列から導く）。
 * - RDB にそのまま載る形にする：ID は文字列（新規は UUID。プリセットから作る条件ボタンも UUID）、
 *   日時は ISO 形式、並び順は order 列、削除済みは deletedAt（論理削除）。
 */
import { z } from "zod";
import { LIMITS } from "./limits";

const id = z.string().min(1);
const isoDate = z.iso.datetime();
const order = z.number().int().nonnegative();

export const EngineSchema = z.enum(["x", "yahoo", "both"]);
export type Engine = z.infer<typeof EngineSchema>;

/** 興味の対象の ID（ホロライブ／にじさんじ／その他…。マスタは JSON で持ち、増える前提で文字列にする） */
export const InterestIdSchema = z.string().min(1);
export type InterestId = z.infer<typeof InterestIdSchema>;

/** 検索文字列。空文字も許す（条件の無い検索は画面側で止める） */
const query = z.string();

const timestamps = {
  createdAt: isoDate,
  updatedAt: isoDate,
  /** 削除済みへ移した日時。null なら有効 */
  deletedAt: isoDate.nullable(),
};

export const ChipSchema = z.object({
  id,
  interestId: InterestIdSchema,
  label: z.string().min(1).max(LIMITS.chipLabel),
  /** 本体の検索文字列（例：`-ネタバレ語A -ネタバレ語B`、`min_faves:50`） */
  query,
  /** ホームで押されている状態 */
  on: z.boolean(),
  /** ホームに出すか */
  visible: z.boolean(),
  /** プリセットから作ったか */
  isPreset: z.boolean(),
  order,
  ...timestamps,
});
export type Chip = z.infer<typeof ChipSchema>;

export const FavoriteSchema = z.object({
  id,
  name: z.string().min(1),
  /** 例：`"メンバーA" -filter:retweets since:yesterday` */
  query,
  engine: EngineSchema,
  order,
  lastRunAt: isoDate.nullable(),
  ...timestamps,
});
export type Favorite = z.infer<typeof FavoriteSchema>;

/** いつものエゴサの1項目。名前は持たない（一致するお気に入りの名前を表示する） */
export const GroupItemSchema = z.object({ query, engine: EngineSchema });
export type GroupItem = z.infer<typeof GroupItemSchema>;

export const GroupSchema = z.object({
  id,
  name: z.string().min(1),
  /** 開く順（RDB では group_items テーブルの position 列） */
  items: z.array(GroupItemSchema),
  order,
  /** 最後に一括実行した日時。「今日は実行済み」の判定に使う（履歴は見ない）。版2で追加 */
  lastRunAt: isoDate.nullable(),
  ...timestamps,
});
export type Group = z.infer<typeof GroupSchema>;

export const HistorySchema = z.object({
  id,
  at: isoDate,
  /** 開いた時点の文字列（相対期間は日付に展開済み） */
  query,
  /** 実際に開いた検索先（両方は2件に分けて記録する） */
  engine: z.enum(["x", "yahoo"]),
  source: z.object({
    kind: z.enum(["home", "favorite", "group", "launch", "other"]),
    /** 表示用（例：お気に入りの名前）。参照ではない */
    label: z.string(),
  }),
});
export type HistoryItem = z.infer<typeof HistorySchema>;

export const PrefsSchema = z.object({
  interest: InterestIdSchema,
  /** 表示言語。null は「選んでいない」＝ブラウザの言語に従う（ほかの設定を保存しても ja に固定されない） */
  lang: z.enum(["ja", "en"]).nullable(),
  /** ホームのお気に入りの開閉 */
  favOpen: z.boolean(),
  /** マイ配信者（★）。興味の対象 → 検索ワード集のグループ名（日本語）。選んだ順 */
  stars: z.record(InterestIdSchema, z.array(z.string())),
  /** 初回の案内（マイ配信者の選択）。pending のあいだだけ D5 を出す。既存のデータは done 扱い */
  setup: z.enum(["pending", "done"]),
});
export type Prefs = z.infer<typeof PrefsSchema>;

export const DEFAULT_PREFS: Prefs = {
  interest: "hololive",
  lang: null,
  favOpen: false,
  stars: {},
  setup: "done",
};

/** 削除済みに出す種類 */
export type TrashKind = "chip" | "favorite" | "group";
export type TrashEntry = {
  kind: TrashKind;
  id: string;
  name: string;
  deletedAt: string;
  /** 条件ボタンだけ：削除したときの興味の対象（復元先の並びと上限の判定に使う） */
  interestId?: InterestId;
};
