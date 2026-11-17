"use client";
// MOCK: 破棄予定（#61）
import { useId } from "react";
import { ENGINE_LABEL, type Engine } from "./data";

const OPTIONS: [Engine, string][] = [
  ["x", ENGINE_LABEL.X],
  ["yahoo", ENGINE_LABEL.Yahoo],
  ["both", "両方"],
];

/**
 * 保存する検索の検索先（▶ 実行・いつものエゴサで開く先）。
 * お気に入りを作る・直す場所（☆ 保存、お気に入りの編集、いつものエゴサの追加②）で同じ部品を使う。
 * 選択肢なので正式名で書く（短縮はお気に入りの管理の行のバッジだけ）。
 */
export function EnginePicker({
  value,
  onChange,
}: {
  value: Engine;
  onChange: (e: Engine) => void;
}) {
  const name = useId();
  return (
    <fieldset className="space-y-1 text-sm">
      <legend className="font-medium">検索先（▶ 実行で開く先）</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {OPTIONS.map(([v, l]) => (
          <label key={v} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              checked={value === v}
              onChange={() => onChange(v)}
            />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
