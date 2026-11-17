"use client";
// MOCK: 破棄予定（#61）
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Favorite } from "./data";
import { buildQuery } from "./query";
import { EMPTY_DETAIL, EMPTY_PERIOD } from "./data";
import { useStore } from "./store";
import { Confirm } from "./ui";

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

/**
 * お気に入りの削除。いつものエゴサに使われていれば、影響するものを列挙して確認し、
 * 2件以上なら再確認する。OK なら、お気に入りと一緒に削除済みへ移す（削除済みから戻せる）。
 */
export function useDeleteFav() {
  const s = useStore();
  const [target, setTarget] = useState<Favorite | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const advancing = useRef(false);
  const users = target ? s.groupsUsing(target.id) : [];

  const request = (f: Favorite) => {
    if (s.groupsUsing(f.id).length === 0) return s.deleteFav(f.id);
    setStep(1);
    setTarget(f);
  };
  const close = () => {
    // 1回目の OK で再確認へ進むときは、閉じない
    if (advancing.current) {
      advancing.current = false;
      return;
    }
    setTarget(null);
  };

  const dialog = target ? (
    step === 1 ? (
      <Confirm
        title={`「${target.name}」を削除しますか？`}
        body={
          <>
            <p>次のいつものエゴサで使われています。</p>
            <ul className="list-inside list-disc font-medium">
              {users.map((g) => (
                <li key={g.id}>{g.name}</li>
              ))}
            </ul>
            <p>
              削除すると、これらのいつものエゴサも一緒に削除済みへ移ります（削除済みから戻せます）。
            </p>
          </>
        }
        action={users.length > 1 ? "次へ" : "一緒に削除済みへ移す"}
        onYes={() => {
          if (users.length > 1) {
            advancing.current = true;
            setStep(2);
          } else s.deleteFav(target.id);
        }}
        onClose={close}
      />
    ) : (
      <Confirm
        title={`いつものエゴサ ${users.length} 件も削除済みへ移します`}
        body={
          <p>
            影響するいつものエゴサが複数あります（
            {users.map((g) => g.name).join("、")}
            ）。本当に一緒に削除済みへ移しますか？
          </p>
        }
        action="まとめて削除済みへ移す"
        onYes={() => s.deleteFav(target.id)}
        onClose={close}
      />
    )
  ) : null;
  return { request, dialog };
}

export function FavoriteRow({
  fav,
  onEdit,
}: {
  fav: Favorite;
  onEdit?: () => void;
}) {
  const { chips, trash, runFav, restore, say } = useStore();
  const { request, dialog } = useDeleteFav();
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
          onClick={() => request(fav)}
          className="rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          ×
        </button>
      </div>
      {dialog}
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
