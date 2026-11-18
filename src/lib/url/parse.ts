/**
 * 貼った URL → 保存形（X の構文）（docs/requirements.md F4、docs/api-spec.md 4.3 `url.parse`）。純粋関数。
 *
 * - X（`x.com`・`twitter.com`）は `q`、Yahoo!リアルタイム検索は `p` を、`parseX` で木にして `serializeX` で戻す。
 *   解析できない演算子は `raw` のまま残る（往復を壊さない）。
 * - Yahoo は F4 の逆変換表で X の構文に直す：括弧（根以外の AND グループ）→ OR、`ID:x`→`from:x`、`@x`→`to:x`、
 *   `lts`→`since:`、`uts`→`until:`（`uts` の日付の1日前＝終了日を含む）。表に無い演算子は `raw` にする。
 *   数字でない `lts`／`uts` は無視する（2026-11-19 決定）。
 * - ホスト・パス・接頭辞は、URL を作る側（`build.ts`）と演算子の定義（`operators.ts`）から導く（直書きしない）。
 */
import type { Issue, ParsedUrl, Result } from "@/api";
import type { AccountNode, GroupNode, Node } from "../query/ast";
import { localDate } from "../query/dates";
import { addDay } from "../query/model";
import { ACCOUNT_OPS, YAHOO_PERIOD_PARAMS } from "../query/operators";
import { parseX } from "../query/parse-x";
import { serializeX } from "../query/serialize-x";
import { X_SEARCH_URL, YAHOO_SEARCH_URL } from "./build";

const X_HOSTS = [new URL(X_SEARCH_URL).hostname, "twitter.com"];
const YAHOO_HOST = new URL(YAHOO_SEARCH_URL).hostname;
/** Yahoo!リアルタイム検索のパスの先頭（`/realtime`）。通常の検索（`/search`）と区別する */
const YAHOO_PATH = `/${new URL(YAHOO_SEARCH_URL).pathname.split("/")[1]}`;
const ID_PREFIX = ACCOUNT_OPS.from.yahoo.prefix;
const ACCOUNT_VALUE_RE = /^[^\s"():]+$/;
const UNIX_RE = /^\d+$/;

const fail = (code: Issue["code"]): Result<never> => ({
  ok: false,
  error: { code },
});

/** `www.`・`mobile.` を外したホスト名 */
const bareHost = (hostname: string): string =>
  hostname.replace(/^(www|mobile)\./, "");
export const isXHost = (hostname: string): boolean =>
  X_HOSTS.includes(bareHost(hostname));

const text = (n: Node): string =>
  serializeX({
    id: "t",
    kind: "group",
    join: "AND",
    enabled: true,
    negate: false,
    children: [n],
  }).text;
const hasRaw = (n: Node): boolean =>
  n.kind === "raw" || (n.kind === "group" && n.children.some(hasRaw));

/** Yahoo の構文で書かれた木を、保存形（X の構文）の木に直す。再帰で、括弧の中も直す */
function fromYahoo(n: Node, isRoot: boolean): Node {
  if (n.kind === "group") {
    // Yahoo の括弧は OR。parseX は括弧を AND グループにするので、根以外の AND を OR にする
    return {
      ...n,
      join: isRoot ? n.join : "OR",
      children: n.children.map((c) => fromYahoo(c, false)),
    };
  }
  if (n.kind === "raw" && !n.negate) {
    const i = n.text.indexOf(":");
    const value = n.text.slice(i + 1);
    if (
      i >= 0 &&
      n.text.slice(0, i + 1).toLowerCase() === ID_PREFIX.toLowerCase() &&
      ACCOUNT_VALUE_RE.test(value)
    )
      return { ...n, kind: "account", op: "from", value } as AccountNode;
    return n;
  }
  if (n.kind === "account" && n.op === "mention" && !n.negate)
    return { ...n, op: "to" };
  // 表に無い演算子（Yahoo での意味が確認できないもの）は、入力のまま保持する
  if (n.kind === "account" || n.kind === "filter" || n.kind === "variants")
    return {
      id: n.id,
      kind: "raw",
      text: text(n),
      enabled: true,
      negate: false,
    };
  return n;
}

function period(
  params: URLSearchParams,
  param: string,
  name: "since" | "until",
  id: string,
): Node[] {
  const v = params.get(param)?.trim() ?? "";
  if (!UNIX_RE.test(v)) return [];
  const d = localDate(new Date(Number(v) * 1000));
  return [
    {
      id,
      kind: "filter",
      name,
      value: name === "until" ? addDay(d, -1) : d,
      enabled: true,
      negate: false,
    },
  ];
}

export function parseUrl(input: string): Result<ParsedUrl> {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return fail("url.unreadable");
  }
  const isX = isXHost(u.hostname);
  const isYahoo =
    bareHost(u.hostname) === YAHOO_HOST && u.pathname.startsWith(YAHOO_PATH);
  if (!isX && !isYahoo) return fail("url.unsupportedHost");

  const q = u.searchParams.get(isX ? "q" : "p") ?? "";
  if (!q.trim()) return fail("url.noQuery");

  let root: GroupNode = parseX(q);
  if (isYahoo) {
    const converted = fromYahoo(root, true) as GroupNode;
    root = {
      ...converted,
      children: [
        ...converted.children,
        ...period(u.searchParams, YAHOO_PERIOD_PARAMS.from, "since", "lts"),
        ...period(u.searchParams, YAHOO_PERIOD_PARAMS.to, "until", "uts"),
      ],
    };
  }
  return {
    ok: true,
    value: {
      engine: isX ? "x" : "yahoo",
      query: serializeX(root).text,
      tokens: root.children
        .map((c) => ({ text: text(c), raw: hasRaw(c) }))
        .filter((t) => t.text !== ""),
    },
  };
}
