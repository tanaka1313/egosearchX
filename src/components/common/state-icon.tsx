"use client";

import { Ban, Check, Circle } from "lucide-react";
import { useI18n } from "@/store/i18n-context";

/**
 * ON/OFF のアイコン枠（固定サイズ。押しても幅が変わらない）。色だけで状態を示さないための✓／○／⊘。
 * `decorative` のときは読み上げの名前を付けない（`aria-pressed`／`aria-selected` が状態を伝えるボタン・タブ用。名前が変わらない）。
 */
export function StateIcon({
  on,
  blocked = false,
  decorative = false,
}: {
  on: boolean;
  blocked?: boolean;
  decorative?: boolean;
}) {
  const { t } = useI18n();
  const label = (name: string) =>
    decorative ? { "aria-hidden": true } : { "aria-label": name };
  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      {blocked ? (
        <Ban className="size-3.5" {...label(t.search.disabled)} />
      ) : on ? (
        <Check className="size-4" {...label(t.search.on)} />
      ) : (
        <Circle className="size-3.5" {...label(t.search.off)} />
      )}
    </span>
  );
}
