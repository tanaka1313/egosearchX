/** `query` の束ね（同期・純粋。保存を読まない）。「今日」は clock だけが決める。 */
import { LIMITS, type Clock, type QueryApi } from "@/api";
import { suggestRules } from "@/data";
import { validateChip } from "@/lib/query/chip";
import { buildQuery } from "@/lib/query/merge";
import {
  chipConds,
  condsToQuery,
  disabledKey,
  expandRelative,
  favNameFor,
  normalize,
  parseToScope,
  periodToTokens,
  tokenize,
} from "@/lib/query/model";
import { suggest } from "@/lib/query/suggest";

export function createQueryApi(clock: Clock): QueryApi {
  return {
    build: (state, chips) => buildQuery(state, chips, clock.today()),
    parse: parseToScope,
    expand: (stored) => expandRelative(stored, clock.today()),
    periodTokens: periodToTokens,
    tokenize,
    normalize,
    disabledKey,
    chipConds,
    condsToQuery,
    validateChip,
    favName: favNameFor,
    suggest: (input) =>
      suggest(input, suggestRules(input.interest), LIMITS.suggest),
  };
}
