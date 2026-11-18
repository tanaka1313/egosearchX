"use client";
// MOCK: 破棄予定（#61）
import { Button } from "@/components/ui/button";
import type { Favorite } from "./data";
import { buildQuery, runText } from "./query";
import { favNameFor } from "@/lib/query/model";
import { EMPTY_DETAIL, EMPTY_PERIOD, ENGINE_NAME, ENGINE_SHORT } from "./data";
import { useStore } from "./store";

/**
 * いつものエゴサの項目の表示名。項目は名前を持たないので、正規化した文字列が一致する
 * お気に入りの名前を出す（並び順で先のもの）。一致しなければ検索文字列そのもの。
 */
export function itemLabel(
  item: { query: string },
  favs: { name: string; query: string }[],
): string {
  return favNameFor(item.query, favs) ?? (item.query || "（条件なし）");
}

/** お気に入りの実行時の検索文字列（相対期間は日付に展開）と、Yahoo!リアルタイム検索での警告 */
export function favQuery(f: { query: string }) {
  const text = runText(f.query);
  const warnings = buildQuery({
    word: text,
    exact: false,
    chips: [],
    detail: EMPTY_DETAIL,
    period: EMPTY_PERIOD,
  }).warnings;
  return { text, warnings };
}

/**
 * お気に入りの1行。お気に入りは検索文字列を実体として持つので、
 * 条件ボタンや他のデータとは独立している（削除しても、いつものエゴサには影響しない）。
 */
export function FavoriteRow({
  fav,
  onEdit,
  onDelete,
}: {
  fav: Favorite;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const { runFav } = useStore();
  const q = favQuery(fav);
  return (
    <li className="space-y-1 rounded-lg border p-2 text-sm">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1 font-medium">
            {/* 長い名前は「…」で省略（全文は title）。バッジと⚠は縮めない */}
            <span className="min-w-0 truncate" title={fav.name}>
              {fav.name}
            </span>
            {/* 検索先はただの識別子なので短縮名（正式名は title と読み上げ） */}
            <span
              title={`検索先：${ENGINE_NAME[fav.engine]}`}
              aria-label={`検索先：${ENGINE_NAME[fav.engine]}`}
              className="shrink-0 rounded border px-1 text-xs whitespace-nowrap"
            >
              {ENGINE_SHORT[fav.engine]}
            </span>
            {q.warnings.length > 0 && (
              <span
                title={q.warnings.join(" / ")}
                aria-label="警告あり"
                className="shrink-0"
              >
                ⚠
              </span>
            )}
          </div>
          {/* 保存している文字列そのもの（since:yesterday などの記号は、開くときに日付になる） */}
          <div
            className="truncate font-mono text-xs text-muted-foreground"
            title={`開くとき：${q.text}`}
          >
            {fav.query || "（条件なし）"}
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => runFav(fav.id)}>
          ▶ 実行
        </Button>
        {onEdit && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            編集
          </Button>
        )}
        {onDelete && (
          <button
            aria-label={`${fav.name}を削除`}
            onClick={onDelete}
            className="rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            ×
          </button>
        )}
      </div>
    </li>
  );
}
