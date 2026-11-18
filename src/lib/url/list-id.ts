/**
 * リストの URL または数字 → リスト ID（docs/api-spec.md 4.3 `url.listId`、画面仕様書 D1）。純粋関数。
 * `https://x.com/i/lists/<ID>`（twitter.com も可。後ろのパス・クエリは無視）か、数字だけの文字列を受け付ける。
 */
import type { Result } from "@/api";
import { isXHost } from "./parse";

const ID_RE = /^\d{5,}$/;
const PATH_RE = /^\/i\/lists\/(\d{5,})(?:\/|$)/;

export function parseListId(input: string): Result<string> {
  const s = input.trim();
  if (ID_RE.test(s)) return { ok: true, value: s };
  try {
    const u = new URL(s);
    const m = isXHost(u.hostname) ? PATH_RE.exec(u.pathname) : null;
    if (m) return { ok: true, value: m[1] };
  } catch {
    // URL として読めない
  }
  return { ok: false, error: { code: "list.invalid" } };
}
