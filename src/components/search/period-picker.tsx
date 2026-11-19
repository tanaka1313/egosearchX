"use client";

import { Calendar, Check, Circle, X } from "lucide-react";
import { EMPTY_PERIOD, type Period } from "@/api";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { segmentClass } from "./styles";

type Kind = Exclude<Period["kind"], "none" | "date">;
const RELATIVE: Kind[] = ["d1", "d3", "d7"];

/**
 * 期間の入力（画面仕様書 3.4。制御コンポーネント）。ホーム・詳細条件・いつものエゴサの追加・お気に入りの編集で共通。
 * 昨日から／3日前から／1週間前から／日付（以降・以前・範囲）。押した状態をもう一度押すと解除（指定なし）。
 * 4つの中から1つだけ選べる。注記は高さを常に確保し、変わっても下の要素は動かない。
 * 出力の規則（相対期間は記号で保存、`until:` は終了日をそのまま出す）はバックエンドが持つ（`query.periodTokens`）。
 */
export function PeriodPicker({
  value,
  onChange,
  showOutput = false,
}: {
  value: Period;
  onChange: (p: Period) => void;
  /** 出力されるトークンも注記に出す（詳細条件用） */
  showOutput?: boolean;
}) {
  const api = useApi();
  const { t } = useI18n();
  const p = t.search.period;

  const pick = (kind: Period["kind"]) =>
    onChange(value.kind === kind ? EMPTY_PERIOD : { ...EMPTY_PERIOD, kind });
  const isDate = value.kind === "date";
  const inverted =
    isDate && !!value.from && !!value.to && value.from > value.to;

  // 保存する文字列（相対期間は記号のまま）と、開くときの文字列（日付に展開）
  const stored = api.query.periodTokens(value).join(" ");
  const opened = api.query.expand(stored);
  const range = !isDate
    ? ""
    : value.from && value.to
      ? p.range(value.from, value.to)
      : value.from
        ? p.since(value.from)
        : value.to
          ? p.until(value.to)
          : "";
  const note = inverted
    ? p.inverted
    : [range, showOutput && stored ? p.output(stored, opened) : ""]
        .filter(Boolean)
        .join("　");

  return (
    <div className="space-y-1" role="group" aria-label={p.label}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{p.label}</span>
        {/* 4つの選択肢を1つの枠にまとめ、条件ボタンとは別のまとまりに見せる（狭い幅では枠の中で折り返す） */}
        <div className="flex flex-wrap gap-1 rounded-2xl border bg-background p-1">
          {RELATIVE.map((kind) => {
            const on = value.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={on}
                onClick={() => pick(kind)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ${segmentClass(on)}`}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {on ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Circle className="size-3.5" aria-hidden />
                  )}
                </span>
                {p[kind]}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={isDate}
            aria-expanded={isDate}
            onClick={() => pick("date")}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ${segmentClass(isDate)}`}
          >
            <span className="flex size-4 shrink-0 items-center justify-center">
              {isDate ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Calendar className="size-3.5" aria-hidden />
              )}
            </span>
            {p.date}
          </button>
        </div>
      </div>
      {isDate && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label={p.from}
            value={value.from}
            max={value.to || undefined}
            onChange={(ev) => onChange({ ...value, from: ev.target.value })}
            className="min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm"
          />
          <span aria-hidden>〜</span>
          <input
            type="date"
            aria-label={p.to}
            value={value.to}
            min={value.from || undefined}
            onChange={(ev) => onChange({ ...value, to: ev.target.value })}
            className="min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm"
          />
          <button
            type="button"
            aria-label={p.clear}
            onClick={() => onChange(EMPTY_PERIOD)}
            className="rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
      {/* 注記は1行分の高さを常に確保する（空の行を増やさない） */}
      <p className="min-h-4 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
