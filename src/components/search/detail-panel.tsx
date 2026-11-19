"use client";

import { useMemo, type ReactNode } from "react";
import { FILTER_KEYS, type Detail, type Tri } from "@/api";
import { Button } from "@/components/ui/button";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { Field, Section, TagInput } from "./detail-form";
import { PeriodPicker } from "./period-picker";
import { useSearchScope } from "./search-scope";
import { toggleClass } from "./styles";

const TRI: Tri[] = ["any", "inc", "exc"];
const LANGS = ["", "ja", "en", "id"] as const;

/** 個別に指定した項目の数（「個別 N」バッジ） */
function countDetail(d: Detail): number {
  const strings = [
    d.from,
    d.to,
    d.mention,
    d.list,
    d.exFrom,
    d.exTo,
    d.exMention,
    d.lang,
    d.minFaves,
    d.minRt,
    d.minReplies,
  ].filter((v) => v !== "").length;
  const lists =
    d.exact.length + d.plain.length + d.variants.length + d.exclude.length;
  const filters = FILTER_KEYS.filter((k) => d.flt[k] !== "any").length;
  return (
    strings + lists + filters + d.disabledConds.length + (d.raw.trim() ? 1 : 0)
  );
}

/**
 * 詳細条件（画面仕様書 3.9）。「条件」の枠の中の開閉エリア（初期は閉じる）。状態は SearchScope から読む。
 * 検索先と X の「最新」タブの設定は置かない（検索先は開くときのボタンと保存シートで選ぶ。X は常に「最新」で開く）。
 * footer：末尾に置く操作（ホームは開くボタン群など、画面ごとに違う）。
 */
export function DetailPanel({ footer }: { footer?: ReactNode }) {
  const api = useApi();
  const { t } = useI18n();
  const d = t.search.detail;
  const { detail, setDetail, period, setPeriod, usedChips, resetDetail } =
    useSearchScope();
  const patch = (p: Partial<Detail>) => setDetail((cur) => ({ ...cur, ...p }));
  const count = useMemo(() => countDetail(detail), [detail]);

  const toggleCond = (key: string) =>
    patch({
      disabledConds: detail.disabledConds.includes(key)
        ? detail.disabledConds.filter((x) => x !== key)
        : [...detail.disabledConds, key],
    });
  const digits = (v: string) => v.replace(/\D/g, "");

  return (
    <details className="group border-t pt-1">
      <summary className="cursor-pointer py-2 font-medium focus-visible:ring-2 focus-visible:ring-ring">
        {d.title}
        {count > 0 && (
          <span className="ml-2 rounded-full border px-2 text-xs">
            {d.individual(count)}
          </span>
        )}
      </summary>
      <div className="space-y-2 pt-2">
        <Section title={d.words}>
          <TagInput
            label={d.exact}
            values={detail.exact}
            onChange={(v) => patch({ exact: v })}
          />
          <TagInput
            label={d.plain}
            values={detail.plain}
            onChange={(v) => patch({ plain: v })}
          />
          <TagInput
            label={d.variants}
            values={detail.variants}
            onChange={(v) => patch({ variants: v })}
            placeholder={d.variantsPlaceholder}
          />
          <TagInput
            label={d.exclude}
            values={detail.exclude}
            onChange={(v) => patch({ exclude: v })}
          />
        </Section>

        <Section title={d.account}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label={d.from}
              value={detail.from}
              onChange={(v) => patch({ from: v })}
              placeholder="sample_id"
            />
            <Field
              label={d.to}
              value={detail.to}
              onChange={(v) => patch({ to: v })}
              placeholder="sample_id"
            />
            <Field
              label={d.mention}
              value={detail.mention}
              onChange={(v) => patch({ mention: v })}
              placeholder="sample_id"
            />
            <Field
              label={d.list}
              value={detail.list}
              onChange={(v) => patch({ list: v })}
              placeholder="1412278227767218179"
            />
          </div>
          {/* 除外は X の実機で確認済み（-list: は X で検索がエラーになるので置かない）。Yahoo!リアルタイム検索では効かないので警告欄で知らせる */}
          <div className="text-sm font-medium">{d.excludeAccount}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label={d.exFrom}
              value={detail.exFrom}
              onChange={(v) => patch({ exFrom: v })}
              placeholder="sample_id"
            />
            <Field
              label={d.exTo}
              value={detail.exTo}
              onChange={(v) => patch({ exTo: v })}
              placeholder="sample_id"
            />
            <Field
              label={d.exMention}
              value={detail.exMention}
              onChange={(v) => patch({ exMention: v })}
              placeholder="sample_id"
            />
          </div>
        </Section>

        <Section title={d.filters}>
          <div className="grid gap-2 sm:grid-cols-2">
            {FILTER_KEYS.map((key) => (
              <div
                key={key}
                role="group"
                aria-label={d.filter[key]}
                className="space-y-1"
              >
                <div className="text-sm font-medium">{d.filter[key]}</div>
                <div className="flex gap-1">
                  {TRI.map((v) => {
                    const on = detail.flt[key] === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          patch({ flt: { ...detail.flt, [key]: v } })
                        }
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${toggleClass(on)}`}
                      >
                        <span className="w-3 text-center" aria-hidden>
                          {on ? "✓" : "○"}
                        </span>
                        {d.tri[v]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{d.lang}</span>
              <select
                value={detail.lang}
                onChange={(ev) => patch({ lang: ev.target.value })}
                className="w-full rounded-lg border px-2 py-1.5"
              >
                {LANGS.map((v) => (
                  <option key={v} value={v}>
                    {d.langOptions[v]}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label={d.minFaves}
              value={detail.minFaves}
              onChange={(v) => patch({ minFaves: digits(v) })}
              placeholder="100"
            />
            <Field
              label={d.minRt}
              value={detail.minRt}
              onChange={(v) => patch({ minRt: digits(v) })}
              placeholder="10"
            />
            <Field
              label={d.minReplies}
              value={detail.minReplies}
              onChange={(v) => patch({ minReplies: digits(v) })}
              placeholder="5"
            />
          </div>
        </Section>

        <Section title={d.periodSection} defaultOpen>
          {/* ホームの期間と同じ部品・同じ状態（どちらで変えても同期する） */}
          <PeriodPicker value={period} onChange={setPeriod} showOutput />
        </Section>

        <Section title={d.disabledTitle(usedChips.length)}>
          {usedChips.length === 0 && (
            <p className="text-sm text-muted-foreground">{d.disabledNone}</p>
          )}
          {usedChips.map((chip) => (
            <fieldset key={chip.id} className="space-y-1">
              <legend className="text-sm font-medium">{chip.label}</legend>
              {/* 項目はトークンで指す（ボタンの本体が文字列のため。キーは `<ボタンID>::<トークン>`） */}
              {api.query.tokenize(chip.query).map((token) => {
                const key = api.query.disabledKey(chip.id, token);
                const off = detail.disabledConds.includes(key);
                return (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!off}
                      onChange={() => toggleCond(key)}
                      aria-label={token}
                    />
                    <code className="font-mono text-xs">{token}</code>
                    {off && <span className="text-xs">{d.disabledNote}</span>}
                  </label>
                );
              })}
            </fieldset>
          ))}
        </Section>

        <Section title={d.rawTitle}>
          <label className="block space-y-1 text-sm">
            <span>{d.rawNote}</span>
            <textarea
              value={detail.raw}
              onChange={(ev) => patch({ raw: ev.target.value })}
              aria-label={d.rawLabel}
              className="h-20 w-full rounded-lg border p-2 font-mono text-sm"
              placeholder={d.rawPlaceholder}
            />
          </label>
        </Section>

        {/* 詳細条件を触ったその場で次の操作ができるよう、末尾に画面ごとの操作を置く */}
        {footer}

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={resetDetail}
          >
            {d.reset}
          </Button>
        </div>
      </div>
    </details>
  );
}
