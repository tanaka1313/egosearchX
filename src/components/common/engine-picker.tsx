"use client";

import { useId } from "react";
import type { Engine } from "@/api";
import { ENGINE_LABEL } from "@/messages";
import { useI18n } from "@/store/i18n-context";

/**
 * 保存する検索の検索先（▶ 実行・いつものエゴサで開く先。画面仕様書 3.10）。初期値は呼び出し側が X にする。
 * お気に入りを作る・直すすべての画面（保存シート、S3-E、S4-E の②）で、この部品を使う。
 * 選択肢なので正式名で書く（短縮はお気に入りの行の検索先バッジだけ）。
 */
export function EnginePicker({
  value,
  onChange,
}: {
  value: Engine;
  onChange: (e: Engine) => void;
}) {
  const { t } = useI18n();
  const name = useId();
  const options: [Engine, string][] = [
    ["x", ENGINE_LABEL.x],
    ["yahoo", ENGINE_LABEL.yahoo],
    ["both", t.enginePicker.both],
  ];
  return (
    <fieldset className="space-y-1 text-sm">
      <legend className="font-medium">{t.enginePicker.legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map(([v, label]) => (
          <label key={v} className="flex items-center gap-2">
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
