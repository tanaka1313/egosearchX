"use client";

import { useId, useMemo } from "react";
import { ApiError, DEFAULT_PREFS } from "@/api";
import { PageHead } from "@/components/common/page-head";
import { useToast } from "@/components/common/toast";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

/**
 * S11：設定（画面仕様書 5.10）。今は「興味の対象」の選択だけ（試験的）。
 * 選ぶと `prefs.interest` を保存し、条件ボタンの並びが切り替わる。一覧は `master.interests()`（JSON の並び）。
 */
export function SettingsPage() {
  const api = useApi();
  const { lang, t } = useI18n();
  const s = t.settings;
  const toast = useToast();
  const legendId = useId();
  const saved = useAppStore((st) => st.prefs?.interest);
  const prefsSet = useAppStore((st) => st.prefs_set);
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
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-muted"
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
