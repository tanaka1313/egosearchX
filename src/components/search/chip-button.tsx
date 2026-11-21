"use client";

import { useMemo, useState } from "react";
import {
  VALUE_OPS,
  isPeriodOp,
  isValidValue,
  type Chip,
  type Cond,
  type ValueOp,
} from "@/api";
import { StateIcon } from "@/components/common/state-icon";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useSearchScope } from "./search-scope";
import { toggleClass } from "./styles";

/** 「新」バッジ。ボタンの右上に重ねて置き、幅には含めない（出どころ＝サジェストの採用は条件ボタンのページ。#74） */
function NewBadge() {
  const { t } = useI18n();
  return (
    <span className="absolute -top-1.5 right-2 rounded bg-amber-300 px-1 text-[10px] leading-4 font-bold text-amber-950">
      {t.search.newBadge}
    </span>
  );
}

const isParam = (c: Cond): c is Cond & { op: ValueOp } =>
  (c.kind === "number" || c.kind === "date" || c.kind === "text") &&
  c.op !== undefined;

/** 期間が指定されたとき、その期間に置き換わる条件（開始日・終了日） */
const isPeriodCond = (c: Cond) => c.op !== undefined && isPeriodOp(c.op);

/** 値として保存してよいか（数値は1以上の整数、日付は実在する YYYY-MM-DD、ユーザー名は X の形）。入力の途中の値は保存しない */
const validValue = (op: ValueOp, v: string) =>
  isValidValue(VALUE_OPS[op].type, v);

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
  // 既定リスト（［ホロメンから］など）は値を変えないボタンなので、入力欄を出さない
  const defaultListId = useMemo(
    () => api.master.interests().get(chip.interestId)?.list?.listId,
    [api, chip.interestId],
  );
  const conds = useMemo(
    () =>
      api.query
        .chipConds(chip)
        .filter((c) => !(c.op === "list" && c.value === defaultListId)),
    [api, chip, defaultListId],
  );
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
  const api = useApi();
  const { t } = useI18n();
  const { isOn, toggle, period, setChipValue } = useSearchScope();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const on = isOn(chip.id);
  // 期間が使われるかはバックエンドの判定に合わせる（［日付］を押しただけで日付が空なら、期間は出力されず、日付ボタンも使われる）
  const periodActive = api.query.periodTokens(period).length > 0;
  const blocked = periodActive && conds.some(isPeriodCond);
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
        const type = VALUE_OPS[c.op].type;
        const disabled = blocked && isPeriodCond(c);
        const shown = drafts[c.id] ?? c.value;
        return (
          <span key={c.id} className="inline-flex items-center gap-0.5">
            <input
              type={type}
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
              className={`h-5 rounded border px-0.5 text-center font-mono text-xs text-foreground tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed ${type === "number" ? "w-[5ch]" : type === "text" ? "w-[9ch]" : "w-[6.75rem]"}`}
            />
            {/* 接尾語は押すと ON/OFF（マウス用。キーボードは切替ボタンで操作する） */}
            {t.search.paramSuffix[c.op] && (
              <span
                aria-hidden
                onClick={() => toggle(chip.id)}
                className="cursor-pointer select-none"
              >
                {t.search.paramSuffix[c.op]}
              </span>
            )}
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

/**
 * 検索ワード集のボタン（ホームの履歴0件の並びと D4 で使う）。条件ボタンと同じ見た目・大きさで、
 * 押すと、この検索にだけ ON/OFF する（`suggestionTokens`＝画面ごとの状態。条件ボタンの ON は変えない）。
 * `label` は表示名（ホームの並びでは検索文字列）、`title` は検索文字列。
 */
export function WordChip({ label, query }: { label: string; query: string }) {
  const { suggestionTokens, toggleSuggestion } = useSearchScope();
  const on = suggestionTokens.includes(query);
  return (
    <button
      type="button"
      aria-pressed={on}
      title={query}
      onClick={() => toggleSuggestion(query)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${toggleClass(on)}`}
    >
      <StateIcon on={on} />
      {label}
    </button>
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
