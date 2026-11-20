"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import type { OpenTarget } from "@/api";
import { Button } from "@/components/ui/button";
import { ENGINE_LABEL } from "@/messages";
import { useI18n } from "@/store/i18n-context";

/**
 * ポップアップがブロックされたときの表示（docs/api-spec.md 4.6、画面仕様書 2.2・5.4・6章）。
 * モーダルにせず、フォーカスも奪わない。開けなかった検索を、個別に開けるリンクで出す。
 * S4・S9 でも同じ部品を使う。
 *
 * 1回のタップで1つしかタブを開けない端末（iPhone の Safari。実機で確認、experimental）では、
 * 残りを［次を開く］で1タップ1件ずつ開く。開いた検索には印を付け、行は消さない（画面を動かさない）。
 * 履歴は最初の実行で全件を記録済みなので、ここでは記録しない。
 */
export function BlockedNotice({
  total,
  blocked,
  onClose,
  onOpen,
}: {
  /** 開こうとした検索の数 */
  total: number;
  /** 開けなかった検索 */
  blocked: OpenTarget[];
  onClose?: () => void;
  /** ［次を開く］や個別リンクで1件開いたとき（ランチャーが各行の印に使う） */
  onOpen?: (target: OpenTarget) => void;
}) {
  const { t } = useI18n();
  // 開いた検索の位置。一覧が新しくなったら（新しい実行）リセットする
  const [seen, setSeen] = useState(blocked);
  const [opened, setOpened] = useState<ReadonlySet<number>>(new Set());
  if (seen !== blocked) {
    setSeen(blocked);
    setOpened(new Set());
  }

  const mark = (i: number) => {
    setOpened((o) => new Set(o).add(i));
    onOpen?.(blocked[i]);
  };
  const remaining = blocked.length - opened.size;
  const openNext = () => {
    const i = blocked.findIndex((_, k) => !opened.has(k));
    if (i < 0) return;
    // `noopener` を features に渡すと戻り値が常に null になるので、開いた後で opener を切る（use-runner.ts と同じ）
    const w = window.open(blocked[i].url, "_blank");
    if (!w) return;
    w.opener = null;
    mark(i);
  };

  return (
    <div role="status" className="mx-auto max-w-3xl border-b px-4 py-2 text-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold">
            {t.blocked.summary(total, blocked.length)}
          </p>
          <p className="text-muted-foreground">{t.blocked.hint}</p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label={t.blocked.close}
            onClick={onClose}
            className="shrink-0 rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        className="mt-2 min-w-40"
        disabled={remaining === 0}
        onClick={openNext}
      >
        {remaining === 0
          ? t.blocked.allOpened
          : t.blocked.openNext(opened.size + 1, blocked.length)}
      </Button>
      <ul className="mt-2 space-y-1">
        {blocked.map((b, i) => (
          <li key={`${b.engine}:${b.url}:${i}`} className="flex min-w-0 gap-2">
            <a
              href={b.url}
              target="_blank"
              rel="noopener"
              onClick={() => mark(i)}
              className="min-w-0 truncate font-mono underline underline-offset-4"
            >
              {b.query}
            </a>
            <span className="shrink-0 text-muted-foreground">
              {ENGINE_LABEL[b.engine]}
            </span>
            {opened.has(i) && (
              <span className="flex shrink-0 items-center gap-0.5">
                <Check className="size-3.5" aria-hidden />
                {t.blocked.opened}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
