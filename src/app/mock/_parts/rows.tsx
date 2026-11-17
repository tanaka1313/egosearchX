"use client";
// MOCK: 破棄予定（#61）
import { Button } from "@/components/ui/button";
import type { Favorite } from "./data";
import { buildQuery, periodText, savedText } from "./query";
import { EMPTY_DETAIL, EMPTY_PERIOD, ENGINE_LABEL } from "./data";
import { useStore } from "./store";

/** お気に入りの実行時の検索文字列と、Yahoo!リアルタイム検索での警告 */
export function favQuery(f: Favorite) {
  const text = savedText(f);
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
  const when = periodText(fav.period);
  return (
    <li className="space-y-1 rounded-lg border p-2 text-sm">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 font-medium">
            {fav.name}
            <span className="rounded border px-1 text-xs whitespace-nowrap">
              {fav.engine === "both"
                ? `X／${ENGINE_LABEL.Yahoo}`
                : fav.engine === "x"
                  ? ENGINE_LABEL.X
                  : ENGINE_LABEL.Yahoo}
            </span>
            {q.warnings.length > 0 && (
              <span title={q.warnings.join(" / ")} aria-label="警告あり">
                ⚠
              </span>
            )}
          </div>
          <div className="truncate font-mono text-xs text-muted-foreground">
            {fav.query || "（条件なし）"}
            {when && `　［${when}］`}
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
