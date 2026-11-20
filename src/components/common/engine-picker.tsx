"use client";

import { useId } from "react";
import type { Engine } from "@/api";
import { ENGINE_LABEL } from "@/messages";
import { useI18n } from "@/store/i18n-context";

/**
 * 保存する検索の検索先（▶ 実行・いつものエゴサで開く先。画面仕様書 3.10）。初期値は呼び出し側が X にする。
 * お気に入りを作る・直すすべての画面（保存シート、S3-E、S4-E の新しく作る）と、
 * いつものエゴサの項目ごとの検索先（S4-E の「中身」）で、この部品を使う。
 * 選択肢なので正式名で書く（短縮はお気に入りの行の検索先バッジだけ）。
 *
 * `legend` を渡すと見出しの文言を変える（行ごとに読み上げが区別できるように）。
 * `compact` は行の中に置く小さい表示で、見出しは読み上げだけにする。
 */
export function EnginePicker({
  value,
  onChange,
  legend,
  compact = false,
}: {
  value: Engine;
  onChange: (e: Engine) => void;
  legend?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const name = useId();
  const options: [Engine, string][] = [
    ["x", ENGINE_LABEL.x],
    ["yahoo", ENGINE_LABEL.yahoo],
    ["both", t.enginePicker.both],
  ];
  return (
    <fieldset className={compact ? "text-xs" : "space-y-1 text-sm"}>
      <legend className={compact ? "sr-only" : "font-medium"}>
        {legend ?? t.enginePicker.legend}
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map(([v, label]) => (
          <label key={v} className="flex items-center gap-1.5">
            <input
              type="radio"
              name={name}
              checked={value === v}
              onChange={() => onChange(v)}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
