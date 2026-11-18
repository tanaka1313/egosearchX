// 条件ボタン編集（D1）の保存前の検証と、ラベルの作り方（docs/api-spec.md 4.2）。文言は持たず、コードで返す。
import { LIMITS, type Cond, type Issue, type Result } from "@/api";
import { condsToQuery, condToken } from "./model";

/** 検索文字列からラベルを作る。上限を超えたら先頭（上限−1）文字＋「…」 */
export function labelFromQuery(query: string): string {
  const q = query.trim();
  return q.length <= LIMITS.chipLabel
    ? q
    : `${q.slice(0, LIMITS.chipLabel - 1)}…`;
}

const fail = (code: Issue["code"], index?: number): Result<never> => ({
  ok: false,
  error: index === undefined ? { code } : { code, params: { index } },
});

/**
 * D1 の保存前の検証。値が空の行は無視する（`index` は元の行の位置）。
 * ラベルが空なら検索文字列から作る。条件の数の上限など、保存に関わる上限は見ない。
 */
export function validateChip(
  label: string,
  conds: Cond[],
): Result<{ label: string; query: string }> {
  const filled = conds
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => c.value.trim());
  if (!filled.length) return fail("chip.empty");
  for (const { c, index } of filled) {
    if ((c.kind === "number" || c.kind === "date") && !condToken(c))
      return fail(
        c.kind === "number" ? "chip.badNumber" : "chip.badDate",
        index,
      );
  }
  const query = condsToQuery(filled.map(({ c }) => c));
  const name = label.trim() || labelFromQuery(query);
  if (name.length > LIMITS.chipLabel) return fail("chip.labelTooLong");
  return { ok: true, value: { label: name, query } };
}
