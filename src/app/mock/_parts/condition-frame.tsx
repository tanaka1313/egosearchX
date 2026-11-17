"use client";
// MOCK: 破棄予定（#61）
import { ChipRow } from "./chips";
import { DetailPanel } from "./detail-panel";
import { WarningNote } from "./open-bar";
import { PeriodPicker } from "./period-picker";
import { useSearchScope } from "./search-scope";

/**
 * 「条件」の枠：完全一致・条件ボタン（もっと開く→サジェスト）・期間・詳細条件・注意（警告）。
 * 状態は SearchScope から読むので、ホームといつものエゴサの編集ページで同じ部品を使う。
 * 枠の背景はページより少しだけ明るくし（bg-muted/35）、入力欄（--field）よりは暗くする。
 * footer：詳細条件の末尾に置く操作（画面ごとに違う）。
 */
export function ConditionFrame({ footer }: { footer?: React.ReactNode }) {
  const { exact, setExact, period, setPeriod } = useSearchScope();
  return (
    <section
      aria-label="条件"
      className="space-y-3 rounded-xl border border-white/15 bg-muted/35 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">条件</h2>
        {/* ON/OFF の設定なので、ボタンではなくチェックボックス＋ラベル */}
        <label className="flex shrink-0 items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={exact}
            onChange={(ev) => setExact(ev.target.checked)}
            className="size-4"
          />
          完全一致
        </label>
      </div>

      <ChipRow />

      {/* 詳細条件の「期間」と同じ状態を共有する */}
      <PeriodPicker value={period} onChange={setPeriod} />

      <DetailPanel footer={footer} />

      {/* 注意（Yahoo で除外される条件など）。枠の一番下に小さく出す */}
      <WarningNote />
    </section>
  );
}
