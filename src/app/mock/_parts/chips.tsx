"use client";
// MOCK: 破棄予定（#61）
import { Ban, Check, Circle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  LIMITS,
  PARAM_OPS,
  isParamCond,
  type Chip,
  type ParamOp,
} from "./data";
import { chipTokens, periodActive } from "./query";
import { useStore } from "./store";
import { toggleClass } from "./ui";

/**
 * 条件ボタン。押すと ON/OFF が切り替わるだけ（編集・コピー・削除・並べ替え・表示の切替は「条件ボタン」ページ）。
 * ON/OFF でボタンの大きさが変わらないよう、アイコン枠・枠線の太さ・文字の太さを揃える（見た目は toggleClass に集約）。
 * 「新」バッジは重ねて置き、幅に含めない。
 */
export function ToggleChip({ chip }: { chip: Chip }) {
  const { toggleChip } = useStore();
  if (chip.conds.some(isParamCond)) return <ParamChip chip={chip} />;
  return (
    <button
      data-chip={chip.id}
      aria-pressed={chip.on}
      onClick={() => toggleChip(chip.id)}
      title={chipTokens(chip).join(" ")}
      className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${toggleClass(chip.on)}`}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {chip.on ? (
          <Check className="size-4" aria-label="ON" />
        ) : (
          <Circle className="size-3.5" aria-label="OFF" />
        )}
      </span>
      {chip.label}
      {chip.isNew && (
        <span className="absolute -top-1.5 right-2 rounded bg-amber-300 px-1 text-[10px] leading-4 font-bold text-amber-950">
          新
        </span>
      )}
    </button>
  );
}

/**
 * 値付きの条件ボタン（例：［✓ ファボ [50] 件以上］［○ 日付 [2026-11-07] 以降］）。
 * `<button>` の中に入力欄は置けないので、外枠を span にして「切替ボタン＋入力欄＋接尾語」を並べる。
 * - 切替ボタン（アイコン枠＋ラベル）と接尾語を押すと ON/OFF。
 * - 入力欄で値を変えると、値をボタンに保存して自動で ON にする。
 * - 入力欄の幅は固定（値の桁数や ON/OFF でボタンの幅を変えない）。
 * - 期間を指定中は、日付の条件を持つボタンを無効の表示にする（期間を優先。ON/OFF の状態は残す）。
 */
function ParamChip({ chip }: { chip: Chip }) {
  const { toggleChip, setCondValue, period } = useStore();
  const blocked =
    periodActive(period) && chip.conds.some((c) => c.kind === "date");
  const reasonId = `chip-${chip.id}-reason`;
  const tokens = chipTokens(chip).join(" ");
  return (
    <span
      role="group"
      aria-label={chip.label}
      data-chip={chip.id}
      title={blocked ? `期間を指定中のため無効（${tokens}）` : tokens}
      className={`relative inline-flex items-center gap-1 rounded-full py-1 pr-3 pl-1 text-sm ${toggleClass(chip.on)} ${blocked ? "opacity-60" : ""}`}
    >
      <button
        aria-pressed={chip.on}
        aria-describedby={blocked ? reasonId : undefined}
        onClick={() => toggleChip(chip.id)}
        className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          {blocked ? (
            <Ban className="size-3.5" aria-label="無効" />
          ) : chip.on ? (
            <Check className="size-4" aria-label="ON" />
          ) : (
            <Circle className="size-3.5" aria-label="OFF" />
          )}
        </span>
        {chip.label}
      </button>
      {chip.conds.filter(isParamCond).map((c) => {
        const op = c.op as ParamOp;
        const def = PARAM_OPS[op];
        const disabled = blocked && c.kind === "date";
        return (
          <span key={c.id} className="inline-flex items-center gap-1">
            <input
              type={def.type}
              inputMode={def.type === "number" ? "numeric" : undefined}
              min={def.type === "number" ? 1 : undefined}
              value={c.value}
              disabled={disabled}
              aria-label={`${chip.label}の${def.label}`}
              onChange={(ev) => setCondValue(chip.id, c.id, ev.target.value)}
              className={`h-6 rounded border border-border bg-background px-1 font-mono text-sm text-foreground tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed ${def.type === "number" ? "w-[6ch] text-right" : "w-[8.75rem]"}`}
            />
            {/* 接尾語は押すと ON/OFF（マウス用。キーボードは切替ボタンで操作する） */}
            <span
              aria-hidden
              onClick={() => toggleChip(chip.id)}
              className="cursor-pointer select-none"
            >
              {def.suffix}
            </span>
          </span>
        );
      })}
      {blocked && (
        <span id={reasonId} className="sr-only">
          期間を指定中のため無効です（期間を優先します）
        </span>
      )}
      {chip.isNew && (
        <span className="absolute -top-1.5 right-2 rounded bg-amber-300 px-1 text-[10px] leading-4 font-bold text-amber-950">
          新
        </span>
      )}
    </span>
  );
}

/** サジェスト検索条件。条件ボタンと同じ大きさで ON/OFF（この検索にだけ足す。破線枠で区別する） */
function SuggestChip({ token }: { token: string }) {
  const { sugOn, toggleSuggestion } = useStore();
  const on = sugOn.includes(token);
  return (
    <button
      aria-pressed={on}
      onClick={() => toggleSuggestion(token)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm ${toggleClass(on)} ${on ? "" : "border-dashed"}`}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {on ? (
          <Check className="size-4" aria-label="ON" />
        ) : (
          <Circle className="size-3.5" aria-label="OFF" />
        )}
      </span>
      {token}
    </button>
  );
}

/**
 * 条件ボタン列。「表示」にしたボタンだけを並べ、先頭 LIMITS.foldChips 個を超える分は［もっと開く（+N）］で隠す
 * （隠したボタンは描画しないのでフォーカスも当たらない）。
 * 開いた後は［閉じる］を出さず、サジェスト検索条件を下に出す。「ボタンを編集 →」は並びの最後の行の右端に置く。
 */
export function ChipRow() {
  const { chips, suggestions } = useStore();
  const [expanded, setExpanded] = useState(false);
  const visible = chips.filter((c) => c.visible);
  const shown = expanded ? visible : visible.slice(0, LIMITS.foldChips);
  const hidden = visible.length - shown.length;

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label="条件ボタン"
        className="relative flex flex-wrap items-center gap-2 pt-2"
      >
        {shown.map((c) => (
          <ToggleChip key={c.id} chip={c} />
        ))}
        {hidden > 0 && (
          <button
            aria-expanded={expanded}
            onClick={() => setExpanded(true)}
            className="rounded-full border border-dashed px-3 py-1 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            もっと開く（+{hidden}）
          </button>
        )}
        <Link
          href="/mock/buttons"
          className="ml-auto text-sm text-muted-foreground underline underline-offset-4"
        >
          ボタンを編集 →
        </Link>
      </div>
      {expanded && (
        <section aria-label="サジェスト検索条件" className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            サジェスト（直近の検索から・この検索にだけ足せます）
          </p>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              検索するとここに候補が出ます
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((t) => (
                <SuggestChip key={t} token={t} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
