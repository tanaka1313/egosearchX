"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { ApiError, type Engine } from "@/api";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { EnginePicker } from "./engine-picker";
import { useToast } from "./toast";
import { TONE } from "./tone";

/**
 * 文字列と検索先を、新しいお気に入りとして保存する小さなフォーム（シートの中身）。
 * S7（URL解析）と S5（履歴）が使う。既存のお気に入りは上書きしない。
 * 名前の初期値と検索先の初期値は呼び出し側が決める（画面仕様書 3.10）。
 */
export function FavoriteSaveForm({
  query,
  engine: initial,
  defaultName,
  note,
  onClose,
}: {
  query: string;
  engine: Engine;
  defaultName: string;
  note: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const s = t.search.saveSheet;
  const toast = useToast();
  const save = useAppStore((st) => st.favorites_save);
  // 名前は空から始め、入力が無ければ初期値（プレースホルダーに出している名前）で保存する
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<Engine>(initial);
  const [error, setError] = useState("");

  const submit = async () => {
    try {
      await save({ name: name.trim() || defaultName, query, engine });
      toast.show(s.saved);
      onClose();
    } catch (e) {
      if (!(e instanceof ApiError && e.code === "CORRUPT")) console.error(e);
      setError(s.failed);
    }
  };

  return (
    <>
      {/* 名前・文字列・検索先を1枚のカードにまとめる（お気に入りの色） */}
      <div className={`space-y-3 rounded-lg border p-3 ${TONE.fav.card}`}>
        <label className="block space-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <Star className={`size-4 ${TONE.fav.icon}`} aria-hidden />
            {s.name}
          </span>
          <input
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder={defaultName}
            className="w-full rounded-lg border bg-field px-3 py-2"
          />
        </label>
        <code className="block rounded bg-muted p-2 font-mono text-xs break-all">
          {query}
        </code>
        <p className="text-xs text-muted-foreground">{note}</p>
        <EnginePicker value={engine} onChange={setEngine} />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {s.cancel}
        </Button>
        <Button onClick={submit}>{s.save}</Button>
      </div>
    </>
  );
}
