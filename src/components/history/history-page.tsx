"use client";

import { useMemo, useState } from "react";
import { ApiError, DEFAULT_PREFS, LIMITS, type HistoryItem } from "@/api";
import { useReportBlocked } from "@/components/common/blocked-context";
import { EmptyState } from "@/components/common/empty-state";
import { FavoriteSaveForm } from "@/components/common/favorite-save-form";
import { PageHead } from "@/components/common/page-head";
import { useToast } from "@/components/common/toast";
import { useRunner } from "@/components/common/use-runner";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { focusMain } from "@/lib/focus";
import { formatRunAt } from "@/lib/format-date";
import { ENGINE_LABEL, type Messages } from "@/messages";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

/** 実行元の表示（履歴の `source.label` は表示用の文字列で、参照ではない） */
function sourceText(p: Messages["historyPage"], source: HistoryItem["source"]) {
  switch (source.kind) {
    case "home":
      return p.sourceHome;
    case "favorite":
      return p.sourceFavorite(source.label);
    case "group":
      return p.sourceGroup(source.label);
    case "launch":
      return p.sourceLaunch(source.label);
    default:
      return p.sourceOther;
  }
}

/**
 * S5：履歴（画面仕様書 5.6）。新しい順の一覧。行の操作は［再実行］と［☆ お気に入りに保存］だけ。
 * 「使った条件ボタン」は履歴に保存せず、開いた文字列を今の対象の条件ボタン（表示のもの）に当てはめて導く。
 */
export function HistoryPage() {
  const api = useApi();
  const { t } = useI18n();
  const p = t.historyPage;
  const toast = useToast();
  const history = useAppStore((s) => s.history);
  const clear = useAppStore((s) => s.history_clear);
  const allChips = useAppStore((s) => s.chips);
  const interest = useAppStore(
    (s) => s.prefs?.interest ?? DEFAULT_PREFS.interest,
  );
  const [confirm, setConfirm] = useState(false);

  // 全行の照合は、履歴か条件ボタンが変わったときだけ求める
  const derived = useMemo(() => {
    const chips = allChips.get(interest) ?? [];
    return history.map((h) => {
      const parsed = api.query.parse(h.query, chips);
      const on = new Set(parsed.onChipIds);
      return {
        word: parsed.word.trim(),
        chipNames: chips.filter((c) => on.has(c.id)).map((c) => c.label),
      };
    });
  }, [api, history, allChips, interest]);

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.code === "CORRUPT") return;
    console.error(e);
    toast.show(p.failed);
  };

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead
        title={p.title}
        right={
          <>
            <span className="text-sm">
              {history.length}/{LIMITS.history}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={history.length === 0}
              onClick={() => setConfirm(true)}
            >
              {p.clearAll}
            </Button>
          </>
        }
      />
      {history.length === 0 ? (
        <EmptyState text={p.empty} />
      ) : (
        <ul aria-label={p.list} className="space-y-2">
          {history.map((h, i) => (
            <HistoryRow
              key={h.id}
              item={h}
              word={derived[i].word}
              chipNames={derived[i].chipNames}
            />
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={p.confirmTitle}
        body={p.confirmBody}
        action={p.confirmAction}
        // 削除すると［全件削除］が押せなくなる（フォーカスの戻し先が無くなる）ので、成功したら本文へ移す
        onConfirm={() => clear().then(focusMain, fail)}
      />
    </main>
  );
}

function HistoryRow({
  item,
  word,
  chipNames,
}: {
  item: HistoryItem;
  word: string;
  chipNames: string[];
}) {
  const { t } = useI18n();
  const p = t.historyPage;
  const run = useRunner();
  const reportBlocked = useReportBlocked();
  const [saveOpen, setSaveOpen] = useState(false);

  const rerun = () => {
    // いつものエゴサの lastRunAt は動かさない（groupId を付けない）。フッターの［再実行］と同じ
    const { total, blocked } = run(
      [{ query: item.query, engine: item.engine }],
      item.source,
    );
    if (blocked.length > 0) reportBlocked(total, blocked);
  };

  const defaultName = word
    ? t.search.saveSheet.defaultName(word)
    : t.search.saveSheet.defaultNameEmpty;

  return (
    <li className="space-y-1 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {formatRunAt(item.at)}
        </span>
        <span className="rounded border px-1 text-xs whitespace-nowrap">
          {ENGINE_LABEL[item.engine]}
        </span>
        <span className="min-w-0 text-xs break-all text-muted-foreground">
          {sourceText(p, item.source)}
        </span>
      </div>
      <div className="font-mono text-xs break-all">{item.query}</div>
      {chipNames.length > 0 && (
        <div className="text-xs">
          {p.usedChips(chipNames.join(p.chipSeparator))}
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        <Button size="xs" onClick={rerun}>
          {p.rerun}
        </Button>
        <Sheet
          open={saveOpen}
          onOpenChange={setSaveOpen}
          trigger={
            <Button size="xs" variant="outline">
              {p.saveAsFavorite}
            </Button>
          }
          title={p.sheetTitle}
          closeLabel={t.sheet.close}
        >
          <FavoriteSaveForm
            query={item.query}
            engine={item.engine}
            defaultName={defaultName}
            note={p.saveNote}
            onClose={() => setSaveOpen(false)}
          />
        </Sheet>
      </div>
    </li>
  );
}
