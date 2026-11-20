"use client";

import { useId, useMemo, useState } from "react";
import { ApiError, DEFAULT_PREFS } from "@/api";
import { PageHead } from "@/components/common/page-head";
import { useToast } from "@/components/common/toast";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { focusMain } from "@/lib/focus";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

/**
 * S11：設定（画面仕様書 5.10）。「興味の対象」の選択（試験的）と、［データをすべて初期化］。
 * 選ぶと `prefs.interest` を保存し、条件ボタンの並びが切り替わる。一覧は `master.interests()`（JSON の並び）。
 * 初期化は確認ダイアログ（D3）を経て `data_reset` を呼ぶ（壊れたときの初期化と同じ処理。画面仕様書 2.7）。
 */
export function SettingsPage() {
  const api = useApi();
  const { lang, t } = useI18n();
  const s = t.settings;
  const toast = useToast();
  const legendId = useId();
  const saved = useAppStore((st) => st.prefs?.interest);
  const prefsSet = useAppStore((st) => st.prefs_set);
  const reset = useAppStore((st) => st.data_reset);
  const [confirming, setConfirming] = useState(false);
  const interests = useMemo(() => [...api.master.interests().values()], [api]);
  const current = saved ?? DEFAULT_PREFS.interest;

  const choose = (id: string) => {
    prefsSet({ interest: id }).catch((e: unknown) => {
      // CORRUPT は書かないのが正しい動作。それ以外は知らせる
      if (e instanceof ApiError && e.code === "CORRUPT") return;
      console.error(e);
      toast.show(s.failed);
    });
  };

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-3 md:p-4">
      <PageHead title={s.title} />
      <section className="space-y-2 rounded-lg border p-3 text-sm">
        <h2 className="font-medium">{s.dataLegend}</h2>
        <p className="text-xs text-muted-foreground">{s.dataNote}</p>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setConfirming(true)}
        >
          {s.resetButton}
        </Button>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={t.resetData.title}
          body={t.resetData.body}
          action={t.resetData.action}
          // 失敗しても画面はそのまま。成功したら本文へフォーカスを移し、トーストで知らせる
          onConfirm={() =>
            reset().then(
              () => {
                focusMain();
                toast.show(s.resetDone);
              },
              (e: unknown) => {
                console.error(e);
                toast.show(t.toast.resetFailed);
              },
            )
          }
        />
      </section>
      {/* 試験的な機能は、一番下に置く（主要な場所に置かない） */}
      <section className="space-y-2 rounded-lg border p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={legendId} className="font-medium">
            {s.interestLegend}
          </h2>
          <span className="rounded border border-primary/60 px-1.5 text-xs">
            {s.experimental}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{s.interestNote}</p>
        <div role="radiogroup" aria-labelledby={legendId} className="space-y-1">
          {interests.map((i) => (
            <label
              key={i.id}
              className="flex items-center gap-2 rounded px-2 py-2 hover:bg-muted"
            >
              <input
                type="radio"
                name="interest"
                value={i.id}
                checked={i.id === current}
                onChange={() => choose(i.id)}
                className="size-4 accent-primary"
              />
              <span className={i.id === current ? "font-bold" : ""}>
                {i.label[lang]}
              </span>
            </label>
          ))}
        </div>
      </section>
    </main>
  );
}
