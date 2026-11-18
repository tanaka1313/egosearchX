/**
 * マスタ JSON の読み出し。読み込み時に検証し、不正なら例外にする（束ねは #85 の `master`）。
 * 関数の第2引数は、テストで別のマスタを渡すためのもの。
 */
import type { Interest, InterestId, WordGroup } from "@/api";
import type { SuggestRule } from "@/lib/query/model";
import interestsJson from "./interests.json";
import presetsJson from "./presets.json";
import suggestRulesJson from "./suggest-rules.json";
import wordSetJson from "./word-set.json";
import {
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

export function suggestRules(master: Master = MASTER): SuggestRule[] {
  return master.suggestRules;
}

/** 検索ワード集。対象が無い、または集が無ければ空配列 */
export function wordSet(id: InterestId, master: Master = MASTER): WordGroup[] {
  return master.wordSet[id] ?? [];
}
