"use client";
// MOCK: 破棄予定（#61）
import { Check, Circle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LISTS } from "./data";
import { useStore } from "./store";
import { TagInput, toggleClass } from "./ui";

/**
 * 初回カード：好みを自分で選ぶ（モーダルにしない。ホームの上にインラインで出す）。
 * 外部から何も取得せず、選んだ内容はこの端末にだけ保存する。［あとで］で閉じられる。
 */
export function Onboarding() {
  const { chips, applyOnboarding, setOnboardOpen } = useStore();
  // 再表示のときは、いまホームに出している既定リストを選択済みにする
  const [picks, setPicks] = useState<string[]>(
    chips.filter((c) => c.isDefault && c.visible).map((c) => c.id),
  );
  const [names, setNames] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <section
      aria-label="はじめに：好みを選ぶ"
      className="space-y-3 rounded-xl border border-primary/50 bg-primary/5 p-3"
    >
      <div>
        <h2 className="font-bold">はじめに：好みを選ぶと、すぐ使えます</h2>
        <p className="text-xs text-muted-foreground">
          選んだ内容はこの端末にだけ保存します。あとから変えられます。
        </p>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">興味のあるところ（複数可）</div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_LISTS.map((l) => {
            const on = picks.includes(l.id);
            return (
              <button
                key={l.id}
                aria-pressed={on}
                onClick={() => toggle(l.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${toggleClass(on)}`}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {on ? (
                    <Check className="size-4" />
                  ) : (
                    <Circle className="size-3.5" />
                  )}
                </span>
                {l.interest}
              </button>
            );
          })}
        </div>
      </div>
      <TagInput
        label="エゴサしたい名前・タグ（任意）"
        values={names}
        onChange={setNames}
        placeholder="例：推しの名前、#配信タグ（Enter）"
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setOnboardOpen(false)}>
          あとで
        </Button>
        <Button onClick={() => applyOnboarding(picks, names)}>はじめる</Button>
      </div>
    </section>
  );
}
