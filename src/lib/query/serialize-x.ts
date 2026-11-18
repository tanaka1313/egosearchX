/**
 * AST → X のクエリ文字列（docs/implementation-plan.md 3章）。純粋関数で `{ text, warnings }` を返す。
 *
 * - 演算子の接頭辞は `operators.ts` の定義から出す（ここに直書きしない）。
 * - `enabled: false` のノードと、有効な子が無いグループは出さない（`()` を作らない）。
 * - 根以外のグループは、有効な子があれば常に `(…)`（否定は `-(…)`）で出す。子が 1 つでも外さない：
 *   `(A)` は AND グループに解析されるので往復が変わるうえ、`-(-A)` が `--A`、`-(list:x)` が `-list:x`（X でエラー。E6）になる。
 * - 期間は `since:`／`until:` のノードを日付のまま出す（終了日を翌日へ変えない）。`since_time:`／`until_time:` を
 *   新たに作る経路は持たない。貼り付けで得たノード（`PARSE_ONLY_OPS`）は、往復のために入力のまま出す。
 * - X では変換で失うものが無いので、警告は返さない。`query.tooLong` は検索の組み立て・URL 生成（#16・#18）が出す。
 */
import type { Issue } from "@/api";
import type { GroupNode, Node } from "./ast";
import {
  ACCOUNT_OPS,
  FILTER_OPS,
  LANG_OP,
  PARAM_OPS,
  PARSE_ONLY_OPS,
} from "./operators";

/** シリアライザーの結果（Yahoo 用の変換も同じ形で返す） */
export type Serialized = { text: string; warnings: Issue[] };

const count = (s: string, ch: string) => s.split(ch).length - 1;

/** 括弧で囲むと、引用符や括弧が閉じ記号を飲み込み、再解析で形が変わる raw */
const swallowsClose = (n: Node) =>
  n.kind === "raw" &&
  (count(n.text, '"') % 2 === 1 || count(n.text, "(") !== count(n.text, ")"));

function leaf(n: Exclude<Node, GroupNode>): string {
  switch (n.kind) {
    case "term":
      return n.mode === "exact" ? `"${n.value}"` : n.value;
    case "account":
      return ACCOUNT_OPS[n.op].x + n.value;
    case "raw":
      return n.text;
    case "variants":
      return n.values.length === 1 ? n.values[0] : `(${n.values.join(" OR ")})`;
    case "filter": {
      const def =
        n.name === "lang"
          ? LANG_OP
          : n.name in PARAM_OPS
            ? PARAM_OPS[n.name as keyof typeof PARAM_OPS]
            : n.name in PARSE_ONLY_OPS
              ? PARSE_ONLY_OPS[n.name as keyof typeof PARSE_ONLY_OPS]
              : FILTER_OPS[n.name as keyof typeof FILTER_OPS];
      return def.x + (n.value ?? "");
    }
  }
}

/** 空なら null（呼び出し側が出さない）。`topLevel` は根の直下か（括弧の外し方の例外に使う） */
function emit(n: Node, topLevel: boolean): string | null {
  if (!n.enabled) return null;
  if (n.kind === "raw") return n.text;
  if (n.kind !== "group") {
    // variants の値が 0 件のときは出さない
    if (n.kind === "variants" && n.values.length === 0) return null;
    const s = leaf(n);
    // 値が 2 つ以上の variants は `(…)` なので、否定は前に `-` を付ける。1 つのときは語の否定
    return n.negate ? `-${s}` : s;
  }
  const parts = n.children
    .map((c) => emit(c, false))
    .filter((s): s is string => s !== null);
  if (parts.length === 0) return null;
  const sep = n.join === "OR" ? " OR " : " ";
  const body = parts.join(sep);
  // 根の直下の OR で、閉じていない引用符・括弧を持つ raw を含むときだけ、括弧で囲まない。
  // 囲むと `(A OR "b)` の引用符が `)` を飲み込む。括弧なしでも OR は先に結ばれるので同じ木に戻る（E9）。
  if (
    topLevel &&
    n.join === "OR" &&
    !n.negate &&
    n.children.some((c) => c.enabled && swallowsClose(c))
  )
    return body;
  return `${n.negate ? "-" : ""}(${body})`;
}

export function serializeX(root: GroupNode): Serialized {
  const sep = root.join === "OR" ? " OR " : " ";
  const text = root.children
    .map((c) => emit(c, true))
    .filter((s): s is string => s !== null)
    .join(sep);
  return { text, warnings: [] };
}
