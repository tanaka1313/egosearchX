"use client";

import { Copy } from "lucide-react";
import { useToast } from "@/components/common/toast";
import { useI18n } from "@/store/i18n-context";
import { useSearchScope } from "./search-scope";

/**
 * クエリ表示（画面仕様書 3.5）。組み立てた X 用の検索文字列（開くときの日付に展開したもの）を、等幅で1行に出す。
 * 折り返さず、長いときは横にスクロールする（キーボードでも操作できる）。高さは一定で、［コピー］の場所は常に確保する。
 * 実験的な演算子を含むときは「実験的」バッジを付ける（implementation-plan 4章）。
 */
export function QueryPreview() {
  const { built } = useSearchScope();
  const { t } = useI18n();
  const toast = useToast();
  const text = built.text;
  const canCopy = text !== "" && built.blockers.length === 0;

  return (
    <div className="flex items-start gap-2">
      <code
        tabIndex={0}
        aria-label={t.search.preview.label}
        className="scroll-x block min-w-0 flex-1 rounded bg-muted font-mono text-xs focus-visible:ring-2 focus-visible:ring-ring"
      >
        {text || t.search.preview.empty}
      </code>
      {built.experimental && (
        <span
          title={t.search.preview.experimentalTitle}
          className="shrink-0 rounded border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground"
        >
          {t.search.preview.experimental}
        </span>
      )}
      <button
        type="button"
        aria-label={t.search.preview.copy}
        title={t.search.preview.copy}
        disabled={!canCopy}
        onClick={() => {
          void navigator.clipboard?.writeText(text);
          toast.show(t.search.preview.copied);
        }}
        className="flex h-10 w-12 shrink-0 items-center justify-center rounded border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Copy className="size-4" aria-hidden />
      </button>
    </div>
  );
}
