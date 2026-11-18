/**
 * 保存形の検索 → 開く URL と警告（docs/requirements.md F5、docs/api-spec.md 4.3 `url.plan`・5章）。
 * 純粋関数。基準日 `today` は引数で受け取る（`Date` は読まない。#85 のバックエンドが clock から渡す）。
 *
 * - X：`q` は相対期間を展開した文字列をそのまま入れる（組み直さない。履歴の `query` と URL を一致させる）。
 *   常に「最新」タブ（`f=live`。値は `X_TAB` の1か所）。
 * - Yahoo!リアルタイム検索：`serializeYahoo` の結果を `p`、期間を `lts`／`uts` にする。`ei=UTF-8` を付け、
 *   `rkf`・`ifr`・`utm_*` は付けない。
 * - クエリ長の警告は、展開後の文字数を `LIMITS.urlWarn` と比べる（URL エンコード後の長さではない）。
 * - `RunPlan.warnings` は、target の警告を重複なしでまとめたもの。
 */
import {
  LIMITS,
  type Issue,
  type OpenTarget,
  type PlanItem,
  type RunPlan,
} from "@/api";
import { expandRelative } from "../query/model";
import { parseX } from "../query/parse-x";
import { serializeYahoo } from "../query/serialize-yahoo";

export const X_SEARCH_URL = "https://x.com/search";
export const YAHOO_SEARCH_URL = "https://search.yahoo.co.jp/realtime/search";
/** X は常に「最新」タブで開く。変えるときはここだけ */
export const X_TAB = "live";

const tooLong = (query: string): Issue[] =>
  query.length > LIMITS.urlWarn
    ? [
        {
          code: "query.tooLong",
          params: { length: query.length, limit: LIMITS.urlWarn },
        },
      ]
    : [];

function xTarget(stored: string, query: string): OpenTarget {
  return {
    engine: "x",
    url: `${X_SEARCH_URL}?q=${encodeURIComponent(query)}&f=${X_TAB}`,
    query,
    stored,
    warnings: tooLong(query),
  };
}

function yahooTarget(stored: string, query: string): OpenTarget {
  const y = serializeYahoo(parseX(query));
  let url = `${YAHOO_SEARCH_URL}?p=${encodeURIComponent(y.text)}&ei=UTF-8`;
  if (y.lts !== undefined) url += `&lts=${y.lts}`;
  if (y.uts !== undefined) url += `&uts=${y.uts}`;
  return {
    engine: "yahoo",
    url,
    query,
    stored,
    warnings: [...y.warnings, ...tooLong(query)],
  };
}

export function planRun(items: PlanItem[], today: string): RunPlan {
  const targets: OpenTarget[] = [];
  for (const item of items) {
    const query = expandRelative(item.query, today);
    if (item.engine !== "yahoo") targets.push(xTarget(item.query, query));
    if (item.engine !== "x") targets.push(yahooTarget(item.query, query));
  }
  const warnings: Issue[] = [];
  const seen = new Set<string>();
  for (const w of targets.flatMap((t) => t.warnings)) {
    const key = JSON.stringify(w);
    if (!seen.has(key)) {
      seen.add(key);
      warnings.push(w);
    }
  }
  return { targets, warnings };
}
