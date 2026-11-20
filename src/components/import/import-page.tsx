"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DEFAULT_PREFS, LIMITS } from "@/api";
import { searchAutoName } from "@/components/common/auto-name";
import { FavoriteSaveForm } from "@/components/common/favorite-save-form";
import { PageHead } from "@/components/common/page-head";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { PAGE_MAIN } from "@/components/common/layout";

/**
 * S7：URL解析（画面仕様書 5.8）。貼った URL を保存形のトークンに分けて見せ、
 * ［ホームで編集する］でホームの組み立てに展開する／［新規お気に入りとして保存］で新規に保存する。
 * 既存のデータは上書きしない。
 */
export function ImportPage() {
  const { t } = useI18n();
  const p = t.importPage;
  const api = useApi();
  const router = useRouter();
  const [text, setText] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const interest = useAppStore(
    (s) => s.prefs?.interest ?? DEFAULT_PREFS.interest,
  );
  const allChips = useAppStore((s) => s.chips);
  const home_set = useAppStore((s) => s.home_set);

  const input = text.trim();
  const parsed = useMemo(
    () => (input ? api.url.parse(input) : null),
    [api, input],
  );
  const ok = parsed?.ok ? parsed.value : null;

  const editInHome = () => {
    if (!ok) return;
    // 照合するのは「表示」の条件ボタンだけ（要件定義書 11.4 ①。`query.parse` が見る）。
    // 照合されなかった条件は詳細条件へ回る。ON の条件ボタンもホームの状態として渡す
    const chips = allChips.get(interest) ?? [];
    const scope = api.query.parse(ok.query, chips);
    home_set({
      word: scope.word,
      exact: scope.exact,
      onChipIds: scope.onChipIds,
      detail: scope.detail,
      period: scope.period,
      suggestionTokens: [],
    });
    router.push("/");
  };

  const defaultName = ok
    ? (() => {
        const chips = allChips.get(interest) ?? [];
        const parsed = api.query.parse(ok.query, chips);
        const on = new Set(parsed.onChipIds);
        return (
          searchAutoName(
            parsed.word,
            chips.filter((c) => on.has(c.id)).map((c) => c.label),
            LIMITS.autoName,
          ) || t.search.saveSheet.defaultNameEmpty
        );
      })()
    : "";

  return (
    <main className={`${PAGE_MAIN} space-y-3`}>
      <PageHead title={p.title} />
      <p className="text-sm text-muted-foreground">{p.description}</p>
      <textarea
        value={text}
        onChange={(ev) => setText(ev.target.value)}
        aria-label={p.inputLabel}
        placeholder={p.placeholder}
        className="h-24 w-full rounded-lg border bg-field px-3 py-2 font-mono text-xs"
      />
      {parsed && !parsed.ok && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {t.issues[parsed.error.code](parsed.error.params ?? {})}
        </p>
      )}
      {ok && (
        <ul aria-label={p.tokens} className="space-y-1 text-sm">
          {ok.tokens.map((tok, i) => (
            <li
              key={`${tok.text}-${i}`}
              className="flex flex-wrap items-center gap-x-2 rounded border px-2 py-1"
            >
              <code className="min-w-0 font-mono text-xs break-all">
                {tok.text}
              </code>
              <span className="text-xs text-muted-foreground">
                {tok.raw ? p.raw : p.cond}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!ok} onClick={editInHome}>
          {p.editInHome}
        </Button>
        <Sheet
          open={saveOpen && !!ok}
          onOpenChange={setSaveOpen}
          trigger={
            <Button variant="outline" disabled={!ok}>
              {p.saveAsFavorite}
            </Button>
          }
          title={p.sheetTitle}
          closeLabel={t.sheet.close}
        >
          {ok && (
            <FavoriteSaveForm
              key={ok.query}
              query={ok.query}
              engine={ok.engine}
              defaultName={defaultName}
              note={p.saveNote}
              onClose={() => setSaveOpen(false)}
            />
          )}
        </Sheet>
      </div>
    </main>
  );
}
