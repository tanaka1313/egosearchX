"use client";

import { useI18n } from "@/store/i18n-context";
import { useSearchScope } from "./search-scope";

/**
 * 警告欄（画面仕様書 3.8）。「条件」の枠の一番下に、小さく薄い文字で出す（無いときは出さない）。
 * Yahoo!リアルタイム検索だけに関係する警告もあるので、クエリの横のような目立つ場所には置かない。
 * 操作を止めず、フォーカスも奪わない。出入りで動くのは枠より下だけ。
 */
export function WarningNote() {
  const { built } = useSearchScope();
  const { t } = useI18n();
  if (built.warnings.length === 0) return null;
  return (
    <ul
      role="note"
      aria-label={t.search.warnings}
      className="space-y-0.5 border-t pt-2 text-xs text-muted-foreground"
    >
      {built.warnings.map((w, i) => (
        <li key={`${w.code}:${i}`}>⚠ {t.issues[w.code](w.params ?? {})}</li>
      ))}
    </ul>
  );
}
