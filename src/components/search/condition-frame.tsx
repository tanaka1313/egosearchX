"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/store/i18n-context";
import { ChipRow } from "./chip-row";
import { DetailPanel } from "./detail-panel";
import { PeriodPicker } from "./period-picker";
import { useSearchScope } from "./search-scope";
import { WarningNote } from "./warning-note";

/**
 * 「条件」の枠（画面仕様書 3.8）：見出し＋完全一致・条件ボタンの並び・期間・詳細条件・警告欄を1つの枠に入れる。
 * 状態は SearchScope から読むので、ホームとほかの検索の組み立て画面で同じ部品を使う。
 * 枠の背景はページより少しだけ明るくし、入力欄（--field）よりは暗くする。
 * footer：詳細条件の末尾に置く操作（画面ごとに違う）。
 */
export function ConditionFrame({ footer }: { footer?: ReactNode }) {
  const { t } = useI18n();
  const { exact, setExact, period, setPeriod } = useSearchScope();
  return (
    <section
      aria-label={t.search.condition}
      className="space-y-3 rounded-xl border border-white/15 bg-muted/35 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">{t.search.condition}</h2>
        {/* ON/OFF の設定なので、ボタンではなくチェックボックス＋ラベル */}
        <label className="flex shrink-0 items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={exact}
            onChange={(ev) => setExact(ev.target.checked)}
            className="size-4"
          />
          {t.search.exact}
        </label>
      </div>

      <ChipRow />

      {/* 詳細条件の「期間」と同じ状態を共有する */}
      <PeriodPicker value={period} onChange={setPeriod} />

      <DetailPanel footer={footer} />

      {/* Yahoo!リアルタイム検索で除外される条件など。枠の一番下に小さく出す */}
      <WarningNote />
    </section>
  );
}
