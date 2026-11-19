"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ApiError, DEFAULT_PREFS } from "@/api";
import { FavoriteSaveForm } from "@/components/common/favorite-save-form";
import { PageHead } from "@/components/common/page-head";
import { useToast } from "@/components/common/toast";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

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
  const toast = useToast();
  const [text, setText] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const interest = useAppStore(
    (s) => s.prefs?.interest ?? DEFAULT_PREFS.interest,
  );
  const allChips = useAppStore((s) => s.chips);
  const home_set = useAppStore((s) => s.home_set);
  const chips_setOn = useAppStore((s) => s.chips_setOn);

  const input = text.trim();
  const parsed = useMemo(
    () => (input ? api.url.parse(input) : null),
    [api, input],
  );
  const ok = parsed?.ok ? parsed.value : null;

  const editInHome = async () => {
    if (!ok) return;
    // 照合するのは「表示」の条件ボタンだけ（要件定義書 11.4 ①。`query.parse` が見る）。
    // ON/OFF は非表示も含む全件を合わせる（照合されなかった非表示の ON は OFF にし、詳細条件へ回る）
    const chips = allChips.get(interest) ?? [];
    const scope = api.query.parse(ok.query, chips);
    try {
      for (const c of chips) {
        const on = scope.onChipIds.includes(c.id);
        if (c.on !== on) await chips_setOn(c.id, on);
      }
    } catch (e) {
      // 壊れたデータでは何も書かない（黙る）。それ以外は知らせる
      if (!(e instanceof ApiError && e.code === "CORRUPT")) {
        console.error(e);
        toast.show(p.failed);
        return;
      }
    }
    home_set({
      word: scope.word,
      exact: scope.exact,
      detail: scope.detail,
      period: scope.period,
      suggestionTokens: [],
    });
    router.push("/");
  };

  const defaultName = ok
    ? (() => {
        const chips = allChips.get(interest) ?? [];
        const { word } = api.query.parse(ok.query, chips);
        return word.trim()
          ? t.search.saveSheet.defaultName(word.trim())
          : t.search.saveSheet.defaultNameEmpty;
      })()
    : "";

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
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
