"use client";
// MOCK: 破棄予定（#61）
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LIMITS, type TrashItem } from "../_parts/data";
import { useStore } from "../_parts/store";
import { Confirm, EmptyState, PageHead } from "../_parts/ui";

const KIND = {
  chip: "条件ボタン",
  fav: "お気に入り",
  group: "グループ",
} as const;

export default function TrashPage() {
  const s = useStore();
  const [target, setTarget] = useState<TrashItem | "all" | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const chipFull = s.chips.length >= LIMITS.chips;

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead
        title="削除済み"
        right={
          <>
            <span className="text-sm">
              {s.trash.length}/{LIMITS.trash}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={s.trash.length === 0}
              onClick={() => setTarget("all")}
            >
              すべて完全削除
            </Button>
          </>
        }
      />
      <p className="rounded border p-2 text-sm">
        {LIMITS.trash}
        件を超えると、古いものから自動で完全に削除されます。復元はいつでもできます。
      </p>
      {s.trash.length === 0 ? (
        <EmptyState text="削除したものはここに入ります" />
      ) : (
        <ul className="space-y-2">
          {s.trash.map((t) => {
            const blocked = t.kind === "chip" && chipFull;
            return (
              <li
                key={t.tid}
                className="space-y-1 rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border px-1 text-xs">
                    {KIND[t.kind]}
                  </span>
                  <span className="min-w-0 flex-1 font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    削除 {t.at}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    size="xs"
                    disabled={blocked}
                    onClick={() => {
                      const e = s.restore(t.tid);
                      if (e) setErrs({ ...errs, [t.tid]: e });
                      else s.say(`「${t.name}」を復元しました`);
                    }}
                  >
                    復元
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setTarget(t)}
                  >
                    完全に削除
                  </Button>
                  {blocked && (
                    <span className="text-xs">
                      ⚠ 条件ボタンが上限（{LIMITS.chips}件）のため復元できません
                    </span>
                  )}
                  {errs[t.tid] && (
                    <span className="text-xs">⚠ {errs[t.tid]}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {target && (
        <Confirm
          title={
            target === "all"
              ? "削除済みをすべて完全削除しますか？"
              : `「${target.name}」を完全に削除しますか？`
          }
          body="元に戻せません。"
          action="完全に削除"
          onYes={() => (target === "all" ? s.purgeAll() : s.purge(target.tid))}
          onClose={() => setTarget(null)}
        />
      )}
    </main>
  );
}
