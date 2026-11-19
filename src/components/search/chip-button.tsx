"use client";

import { Ban, Check, Circle } from "lucide-react";
import { useMemo, useState } from "react";
import { PARAM_OP_TYPES, type Chip, type Cond, type ParamOp } from "@/api";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useSearchScope } from "./search-scope";
import { toggleClass } from "./styles";

/** ON/OFF のアイコン枠（固定サイズ。押しても幅が変わらない） */
function StateIcon({
  on,
  blocked = false,
}: {
  on: boolean;
  blocked?: boolean;
}) {
  const { t } = useI18n();
  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      {blocked ? (
        <Ban className="size-3.5" aria-label={t.search.disabled} />
      ) : on ? (
        <Check className="size-4" aria-label={t.search.on} />
      ) : (
        <Circle className="size-3.5" aria-label={t.search.off} />
      )}
    </span>
  );
}

/** 「新」バッジ。ボタンの右上に重ねて置き、幅には含めない（出どころ＝サジェストの採用は条件ボタンのページ。#74） */
function NewBadge() {
  const { t } = useI18n();
  return (
    <span className="absolute -top-1.5 right-2 rounded bg-amber-300 px-1 text-[10px] leading-4 font-bold text-amber-950">
      {t.search.newBadge}
    </span>
  );
}

const isParam = (c: Cond): c is Cond & { op: ParamOp } =>
  (c.kind === "number" || c.kind === "date") && c.op !== undefined;

/** 値として保存してよいか（数値は1以上の整数、日付は実在する YYYY-MM-DD）。入力の途中の値は保存しない */
function validValue(op: ParamOp, v: string): boolean {
  if (PARAM_OP_TYPES[op] === "number") return /^[1-9]\d*$/.test(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
}

/**
 * 条件ボタン（画面仕様書 3.2）。押すと ON/OFF が切り替わるだけ（編集などは S2）。
 * 値付きの条件（数値・日付）を持つものは `ParamChip` で描く。
 * `isNew`：サジェストから追加したボタンの「新」印（今は表示の口だけ。#74 が出どころを作る）。
 */
export function ChipButton({
  chip,
  isNew = false,
}: {
  chip: Chip;
  isNew?: boolean;
}) {
  const api = useApi();
  const conds = useMemo(() => api.query.chipConds(chip), [api, chip]);
  if (conds.some(isParam))
    return <ParamChip chip={chip} conds={conds} isNew={isNew} />;
  return <PlainChip chip={chip} isNew={isNew} />;
}

function PlainChip({ chip, isNew }: { chip: Chip; isNew: boolean }) {
  const { isOn, toggle } = useSearchScope();
  const on = isOn(chip.id);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => toggle(chip.id)}
      title={chip.query}
      className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${toggleClass(on)}`}
    >
      <StateIcon on={on} />
      {chip.label}
      {isNew && <NewBadge />}
    </button>
  );
}

/**
 * 値付きの条件ボタン（例：［✓ ファボ [50] 件以上］）。`<button>` の中に入力欄は置けないので、
 * 外枠を `role="group"` にして「切替ボタン＋入力欄＋接尾語」を並べる（画面仕様書 3.2）。
 * - 入力中の値はこの部品が持つ。正しい値になったときだけ保存し（保存して ON にする）、途中の値は保存しない。
 *   フォーカスを外すと、保存済みの値に戻る。
 * - 入力欄の幅は固定（値の桁数や ON/OFF で幅を変えない）。
 * - 期間を指定中は、日付の条件を持つボタンを無効にする（期間を優先。ON/OFF の状態は残す）。
 */
function ParamChip({
  chip,
  conds,
  isNew,
}: {
  chip: Chip;
  conds: Cond[];
  isNew: boolean;
}) {
  const { t } = useI18n();
  const { isOn, toggle, period, setChipValue } = useSearchScope();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const on = isOn(chip.id);
  const periodActive = period.kind !== "none";
  const blocked = periodActive && conds.some((c) => c.kind === "date");
  const reasonId = `chip-${chip.id}-reason`;

  return (
    <span
      role="group"
      aria-label={chip.label}
      title={blocked ? t.search.periodBlockedTitle(chip.query) : chip.query}
      className={`relative inline-flex items-center gap-1 rounded-full py-1.5 pr-3 pl-1 text-sm ${toggleClass(on)} ${blocked ? "opacity-60" : ""}`}
    >
      <button
        type="button"
        aria-pressed={on}
        aria-describedby={blocked ? reasonId : undefined}
        onClick={() => toggle(chip.id)}
        className="inline-flex items-center gap-1.5 rounded-full pl-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <StateIcon on={on} blocked={blocked} />
        {chip.label}
      </button>
      {conds.filter(isParam).map((c) => {
        const type = PARAM_OP_TYPES[c.op];
        const disabled = blocked && c.kind === "date";
        const shown = drafts[c.id] ?? c.value;
        return (
          <span key={c.id} className="inline-flex items-center gap-0.5">
            <input
              type={type === "number" ? "number" : "date"}
              inputMode={type === "number" ? "numeric" : undefined}
              min={type === "number" ? 1 : undefined}
              value={shown}
              disabled={disabled}
              aria-label={`${chip.label}の${t.search.paramLabel[c.op]}`}
              onChange={(ev) => {
                const v = ev.target.value;
                setDrafts((d) => ({ ...d, [c.id]: v }));
                if (validValue(c.op, v)) setChipValue(chip.id, c.id, v);
              }}
              onBlur={() =>
                setDrafts((d) => {
                  const rest = { ...d };
                  delete rest[c.id];
                  return rest;
                })
              }
              className={`h-5 rounded border px-0.5 text-center font-mono text-xs text-foreground tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed ${type === "number" ? "w-[5ch]" : "w-[6.75rem]"}`}
            />
            {/* 接尾語は押すと ON/OFF（マウス用。キーボードは切替ボタンで操作する） */}
            <span
              aria-hidden
              onClick={() => toggle(chip.id)}
              className="cursor-pointer select-none"
            >
              {t.search.paramSuffix[c.op]}
            </span>
          </span>
        );
      })}
      {blocked && (
        <span id={reasonId} className="sr-only">
          {t.search.periodBlocked}
        </span>
      )}
      {isNew && <NewBadge />}
    </span>
  );
}

/** サジェストの候補（条件ボタンと同じ大きさ・破線の枠）。押すと、この検索にだけ ON/OFF する */
export function SuggestChip({ token }: { token: string }) {
  const { suggestionTokens, toggleSuggestion } = useSearchScope();
  const on = suggestionTokens.includes(token);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => toggleSuggestion(token)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm ${toggleClass(on)} ${on ? "" : "border-dashed"}`}
    >
      <StateIcon on={on} />
      {token}
    </button>
  );
}
