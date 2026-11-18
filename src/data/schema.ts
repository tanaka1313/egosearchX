/**
 * マスタ JSON（開発者が決める値。ユーザーは変えない）の zod スキーマ。
 * 不正な値はテスト（`schema.test.ts`）と、`npm run build` の前段（prebuild）で検出する。
 * 画面が読むのは `@/api` 経由（束ねは #85）。ここはバックエンドの内部。
 */
import { z } from "zod";
import { ChipSchema, InterestIdSchema, WordGroupSchema } from "@/api";
import { normalize } from "@/lib/query/model";

/** プリセットの対象に使う予約語。「すべての対象に共通」の意味なので、興味の対象の ID には使えない */
export const COMMON = "common";

const text = z.string().min(1);

const InterestSchema = z.object({
  label: z.object({ ja: text, en: text }),
  /** 既定リスト。無ければ null（その他） */
  list: z
    .object({
      label: ChipSchema.shape.label,
      listId: z.string().regex(/^\d+$/),
    })
    .nullable(),
});
export type MasterInterest = z.infer<typeof InterestSchema>;

/** 興味の対象。ID をキーにした Record（値に id を二重に持たない）。JSON の並びが切替の並び */
export const InterestsSchema = z.record(
  InterestIdSchema.refine((id) => id !== COMMON, {
    message: `"${COMMON}" は予約語で、対象の ID に使えない`,
  }),
  InterestSchema,
);

const PresetRowSchema = z.object({
  /** `common`（すべての対象）か、興味の対象の ID */
  interest: text,
  label: ChipSchema.shape.label,
  query: text,
  on: z.boolean(),
  visible: z.boolean(),
});
/** 既定リスト（interests の list）を入れる位置の目印 */
const DefaultListMarkSchema = z.object({ defaultList: z.literal(true) });

/** 条件ボタンのプリセット。1本の並びで、各対象の並びは「共通＋その対象」の行を順に取り出したもの */
export const PresetsSchema = z.array(
  z.union([PresetRowSchema, DefaultListMarkSchema]),
);
export type PresetRow = z.infer<typeof PresetRowSchema>;

export type Preset = {
  label: string;
  query: string;
  on: boolean;
  visible: boolean;
};

/** 対象 ID のプリセットの並び。目印の位置には、その対象の既定リストを入れる（無ければ飛ばす） */
export function expandPresets(
  rows: z.infer<typeof PresetsSchema>,
  interests: Record<string, MasterInterest>,
  id: string,
): Preset[] {
  return rows.flatMap((row): Preset[] => {
    if ("defaultList" in row) {
      const list = interests[id]?.list;
      return list
        ? [
            {
              label: list.label,
              query: `list:${list.listId}`,
              on: false,
              visible: true,
            },
          ]
        : [];
    }
    if (row.interest !== COMMON && row.interest !== id) return [];
    return [
      { label: row.label, query: row.query, on: row.on, visible: row.visible },
    ];
  });
}

/** サジェストの規則。検索文字列に `when` のどれかが含まれていれば `suggest` を出す（`SuggestRule`・`lib/query/model.ts`） */
export const SuggestRulesSchema = z.array(
  z.object({ when: z.array(text).min(1), suggest: z.array(text).min(1) }),
);

/** 検索ワード集。興味の対象の ID をキーにした Record。グループ内のワードは1件以上 */
export const WordSetSchema = z.record(
  InterestIdSchema,
  z.array(WordGroupSchema),
);

export const MasterSchema = z
  .object({
    interests: InterestsSchema,
    presets: PresetsSchema,
    suggestRules: SuggestRulesSchema,
    wordSet: WordSetSchema,
  })
  .superRefine((m, ctx) => {
    const ids = Object.keys(m.interests);
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    // プリセット：対象が実在する、既定リストの目印は1つまで
    let marks = 0;
    m.presets.forEach((row, i) => {
      if ("defaultList" in row) {
        if (++marks > 1)
          issue(["presets", i], "既定リストの目印は1つだけ置ける");
      } else if (row.interest !== COMMON && !ids.includes(row.interest)) {
        issue(
          ["presets", i, "interest"],
          `存在しない興味の対象: ${row.interest}`,
        );
      }
    });
    // プリセット：対象ごとに、正規化した query が重複しない（［プリセットを追加］は query の一致で「無いもの」を判定する）
    for (const id of ids) {
      const seen = new Set<string>();
      for (const p of expandPresets(m.presets, m.interests, id)) {
        const n = normalize(p.query);
        if (seen.has(n))
          issue(
            ["presets"],
            `${id} のプリセットの query が重複している: ${p.query}`,
          );
        seen.add(n);
      }
    }

    // 検索ワード集：対象が実在する（無い対象は可）、対象内で正規化した query が重複しない
    for (const [id, groups] of Object.entries(m.wordSet)) {
      if (!ids.includes(id))
        issue(["wordSet", id], `存在しない興味の対象: ${id}`);
      const seen = new Set<string>();
      for (const g of groups) {
        for (const w of g.words) {
          const n = normalize(w.query);
          if (seen.has(n))
            issue(
              ["wordSet", id],
              `${id} の検索ワードの query が重複している: ${w.query}`,
            );
          seen.add(n);
        }
      }
    }
  });
export type Master = z.infer<typeof MasterSchema>;
