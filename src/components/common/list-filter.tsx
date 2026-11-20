"use client";

import { useI18n } from "@/store/i18n-context";

/**
 * 絞り込みの一致（お気に入り・条件ボタン・いつものエゴサ・履歴で共通）。
 * 前後の空白を除いた入力が、どれかの欄（名前・検索文字列など）に含まれれば一致する。英字の大文字小文字は区別しない。
 */
export function matchesFilter(input: string, fields: string[]): boolean {
  const needle = input.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => f.toLowerCase().includes(needle));
}

/**
 * 一覧の絞り込み欄（画面仕様書 3.14）。入力欄の下に、該当なしと（並べ替えのある一覧だけ）並べ替えの注記を出す。
 * 注記は絞り込み中だけ出て、押す部品の位置は変えない。
 */
export function ListFilter({
  value,
  onChange,
  label,
  noMatch,
  sortable = false,
}: {
  value: string;
  onChange: (v: string) => void;
  /** 読み上げの名前と placeholder */
  label: string;
  /** 絞り込んだ結果が0件（一覧自体が空のときは false） */
  noMatch: boolean;
  /** 並べ替えのある一覧か（絞り込み中は並べ替えを反映しない旨を出す） */
  sortable?: boolean;
}) {
  const { t } = useI18n();
  const filtering = value.trim() !== "";
  return (
    <div className="space-y-1">
      <input
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        aria-label={label}
        placeholder={label}
        className="w-full rounded-lg border bg-field px-3 py-2 text-sm"
      />
      {noMatch && (
        <p className="text-sm text-muted-foreground">{t.listFilter.none}</p>
      )}
      {sortable && filtering && (
        <p className="text-xs text-muted-foreground">{t.listFilter.sortNote}</p>
      )}
    </div>
  );
}
