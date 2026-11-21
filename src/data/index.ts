/**
 * マスタ JSON の読み出し。読み込み時に検証し、不正なら例外にする（束ねは #85 の `master`）。
 * 関数の第2引数は、テストで別のマスタを渡すためのもの。
 */
import type { Generation, Interest, InterestId, WordGroup } from "@/api";
import type { SuggestRule } from "@/lib/query/model";
import generationsJson from "./generations.json";
import interestsJson from "./interests.json";
import presetsJson from "./presets.json";
import suggestRulesJson from "./suggest-rules.json";
import wordSetJson from "./word-set.json";
import {
  COMMON,
  expandPresets,
  MasterSchema,
  type Master,
  type Preset,
} from "./schema";

export type { Master, Preset };

/** 検証して返す。不正なら ZodError */
export function parseMaster(raw: unknown): Master {
  return MasterSchema.parse(raw);
}

const MASTER = parseMaster({
  interests: interestsJson,
  presets: presetsJson,
  suggestRules: suggestRulesJson,
  wordSet: wordSetJson,
  generations: generationsJson,
});

/** 興味の対象。JSON の並び（ヘッダーの切替の並び）で返す */
export function interests(master: Master = MASTER): Map<InterestId, Interest> {
  return new Map(
    Object.entries(master.interests).map(([id, v]) => [id, { id, ...v }]),
  );
}

/** 対象の条件ボタンのプリセット（共通＋その対象。既定リストは目印の位置） */
export function presetsFor(id: InterestId, master: Master = MASTER): Preset[] {
  return expandPresets(master.presets, master.interests, id);
}

/** 対象のサジェストの規則。規則が無ければ空配列 */
export function suggestRules(
  id: InterestId,
  master: Master = MASTER,
): SuggestRule[] {
  return master.suggestRules[id] ?? [];
}

/** 検索ワード集。共通のグループが先、続いて対象のグループ。どちらも無ければ空配列 */
export function wordSet(id: InterestId, master: Master = MASTER): WordGroup[] {
  return [...(master.wordSet[COMMON] ?? []), ...(master.wordSet[id] ?? [])];
}

/** 期の一覧（行順＝表示順・色の順）。検索ワード集のグループの `gens` は、ここの名前（日本語）を指す */
export function generations(master: Master = MASTER): Generation[] {
  return master.generations;
}

/**
 * マイ配信者（★）に選べるグループ＝その対象のグループ（共通のグループを除く）。配列の順が表示順。
 * 画面と保存の検証が同じ範囲を見るよう、ここ1か所で決める。
 */
export function streamerGroups(
  id: InterestId,
  master: Master = MASTER,
): WordGroup[] {
  return master.wordSet[id] ?? [];
}
