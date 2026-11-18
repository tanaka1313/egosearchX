/**
 * 検索条件モデル（木構造）。検索文字列を解析・組み立て・変換（X／Yahoo）するときの内部表現で、保存しない。
 * 保存するのは検索文字列（docs/implementation-plan.md 3章）。
 * 期間（画面の状態）は契約の `Period`（@/api）を使う。ここでは重複して定義しない。
 * 除外は各ノードの `negate` で表す。
 */
import type { FilterKey, ParamOp } from "@/api";

type Base = { id: string; enabled: boolean; negate: boolean };

export type TermNode = Base & {
  kind: "term";
  mode: "exact" | "plain";
  value: string;
};
/** 表記ゆれの展開（手動入力。値を OR で結ぶ） */
export type VariantsNode = Base & { kind: "variants"; values: string[] };
export type AccountOp = "from" | "to" | "mention" | "list";
export type AccountNode = Base & {
  kind: "account";
  op: AccountOp;
  value: string;
};
/** 解析・保持だけで、生成には使わない演算子（operators.ts の `PARSE_ONLY_OPS`） */
export type ParseOnlyOp = "since_time" | "until_time";
/** `filter:<key>`、`lang:`、値付きの演算子（min_*／since／until／since_time／until_time） */
export type FilterNode = Base & {
  kind: "filter";
  name: FilterKey | ParamOp | ParseOnlyOp | "lang";
  value?: string;
};
export type GroupNode = Base & {
  kind: "group";
  join: "AND" | "OR";
  children: Node[];
};
/** 解析できない演算子。そのまま保持して往復を壊さない */
export type RawNode = Base & { kind: "raw"; text: string };

export type Node =
  TermNode | VariantsNode | AccountNode | FilterNode | GroupNode | RawNode;
