"use client";
// MOCK: 破棄予定（#61）
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Favorite } from "./data";
import { buildQuery } from "./query";
import { EMPTY_DETAIL, EMPTY_PERIOD } from "./data";
import { useStore } from "./store";

export function favQuery(
  f: Favorite,
  chips: ReturnType<typeof useStore>["chips"],
) {
  return buildQuery({
    word: f.word,
    exact: f.exact,
    chips,
    detail: EMPTY_DETAIL,
    period: { ...EMPTY_PERIOD, kind: f.period },
    onlyChipIds: f.chipIds,
    extra: f.extra,
  });
}

export function missingChips(
  f: Favorite,
  chips: ReturnType<typeof useStore>["chips"],
  trash: ReturnType<typeof useStore>["trash"],
) {
  return f.chipIds
    .filter((id) => !chips.some((c) => c.id === id))
    .map((id) => ({
      id,
      tid: trash.find((t) => t.kind === "chip" && t.data.id === id)?.tid,
      name: trash.find((t) => t.kind === "chip" && t.data.id === id)?.name,
    }));
}

export function FavoriteRow({
  fav,
  onEdit,
}: {
  fav: Favorite;
  onEdit?: () => void;
}) {
  const { chips, trash, runFav, deleteFav, restore, say } = useStore();
  const q = favQuery(fav, chips);
  const miss = missingChips(fav, chips, trash);
  return (
    <li className="space-y-1 rounded-lg border p-2 text-sm">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 font-medium">
            {fav.name}
            <span className="rounded border px-1 text-xs">
              {fav.engine === "both"
                ? "X/Yahoo"
                : fav.engine === "x"
                  ? "X"
                  : "Yahoo"}
            </span>
            {(q.warnings.length > 0 || miss.length > 0) && (
              <span title={[...q.warnings].join(" / ")} aria-label="警告あり">
                ⚠
              </span>
            )}
          </div>
          <div className="truncate font-mono text-xs text-muted-foreground">
            {q.text || "（条件なし）"}
          </div>
        </div>
        <Button size="sm" onClick={() => runFav(fav.id)}>
          ▶ 実行
        </Button>
        {onEdit && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            編集
          </Button>
        )}
        <button
          aria-label={`${fav.name}を削除`}
          onClick={() => deleteFav(fav.id)}
          className="rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          ×
        </button>
      </div>
      {miss.map((m) => (
        <p key={m.id} className="text-xs">
          ⚠ 条件ボタン「{m.name ?? "不明"}」が削除済みのため適用していません{" "}
          {m.tid ? (
            <button
              className="underline"
              onClick={() => {
                const e = restore(m.tid!);
                say(e ?? `「${m.name}」を復元しました`);
              }}
            >
              復元
            </button>
          ) : (
            <Link href="/mock/mock6/trash" className="underline">
              削除済みを見る
            </Link>
          )}
        </p>
      ))}
    </li>
  );
}
