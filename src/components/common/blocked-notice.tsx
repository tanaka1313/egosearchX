"use client";

import { X } from "lucide-react";
import type { OpenTarget } from "@/api";
import { ENGINE_LABEL } from "@/messages";
import { useI18n } from "@/store/i18n-context";

/**
 * ポップアップがブロックされたときの表示（docs/api-spec.md 4.6、画面仕様書 2.2・5.4・6章）。
 * モーダルにせず、フォーカスも奪わない。開けなかった検索を、個別に開けるリンクで出す。
 * S4・S9 でも同じ部品を使う。
 */
export function BlockedNotice({
  total,
  blocked,
  onClose,
}: {
  /** 開こうとした検索の数 */
  total: number;
  /** 開けなかった検索 */
  blocked: OpenTarget[];
  onClose?: () => void;
}) {
  const { t } = useI18n();
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
      <ul className="mt-1 space-y-1">
        {blocked.map((b, i) => (
          <li key={`${b.engine}:${b.url}:${i}`} className="flex min-w-0 gap-2">
            <a
              href={b.url}
              target="_blank"
              rel="noopener"
              className="min-w-0 truncate font-mono underline underline-offset-4"
            >
              {b.query}
            </a>
            <span className="shrink-0 text-muted-foreground">
              {ENGINE_LABEL[b.engine]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
