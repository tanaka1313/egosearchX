"use client";
// MOCK: 破棄予定（#61）
import { Calendar, Check, Circle, X } from "lucide-react";
import { EMPTY_PERIOD, type Period, type PeriodKind } from "./data";
import {
  REL_PERIODS,
  addDay,
  periodInverted,
  periodText,
  periodTokens,
} from "./query";
import { toggleClass } from "./ui";

/**
 * 期間の入力（制御コンポーネント）。ホーム・詳細条件・いつものエゴサの追加・お気に入りの編集で共通。
 * 昨日から／3日前から／1週間前から／日付（以降・以前・範囲）。押した状態をもう一度押すと解除（指定なし）。
 * ボタンと日付は同時に使えない（排他）。注記は高さを確保し、押しても下の要素が動かない。
 */
export function PeriodPicker({
  value,
  onChange,
  label = "期間",
  showOutput = false,
}: {
  value: Period;
  onChange: (p: Period) => void;
  label?: string;
  /** 出力されるトークンも注記に出す（詳細条件用） */
  showOutput?: boolean;
}) {
  const pick = (kind: PeriodKind) =>
    onChange(value.kind === kind ? EMPTY_PERIOD : { ...EMPTY_PERIOD, kind });
  const isDate = value.kind === "date";
  const inverted = periodInverted(value);
  const note = inverted
    ? "⚠ 開始日が終了日より後です"
    : [
        periodText(value),
        showOutput && periodTokens(value).length > 0
          ? `出力：${periodTokens(value).join(" ")}${value.to ? `（until は終了日の翌日 ${addDay(value.to, 1)} に変換）` : ""}`
          : "",
      ]
        .filter(Boolean)
        .join("　");

  return (
    <div className="space-y-1" role="group" aria-label={label}>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-sm font-medium">{label}</span>
        {REL_PERIODS.map((r) => {
          const on = value.kind === r.kind;
          return (
            <button
              key={r.kind}
              aria-pressed={on}
              onClick={() => pick(r.kind)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ${toggleClass(on)}`}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {on ? (
                  <Check className="size-4" />
                ) : (
                  <Circle className="size-3.5" />
                )}
              </span>
              {r.label}
            </button>
          );
        })}
        <button
          aria-pressed={isDate}
          aria-expanded={isDate}
          onClick={() => pick("date")}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ${toggleClass(isDate)}`}
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            {isDate ? (
              <Check className="size-4" />
            ) : (
              <Calendar className="size-3.5" />
            )}
          </span>
          日付
        </button>
      </div>
      {isDate && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="開始日（この日以降）"
            value={value.from}
            max={value.to || undefined}
            onChange={(ev) => onChange({ ...value, from: ev.target.value })}
            className="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1 text-sm"
          />
          <span aria-hidden>〜</span>
          <input
            type="date"
            aria-label="終了日（この日を含む）"
            value={value.to}
            min={value.from || undefined}
            onChange={(ev) => onChange({ ...value, to: ev.target.value })}
            className="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1 text-sm"
          />
          <button
            aria-label="日付の指定を解除"
            onClick={() => onChange(EMPTY_PERIOD)}
            className="rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      {/* 注記は2行分の高さを常に確保する */}
      <p className="min-h-8 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
