"use client";

import { Check } from "lucide-react";
import { Dialog } from "radix-ui";
import { useMemo, useState } from "react";
import { DEFAULT_PREFS, LIMITS } from "@/api";
import {
  DIALOG_OVERLAY,
  DIALOG_PANEL,
} from "@/components/common/dialog-styles";
import { toneOfGens } from "@/components/common/gen-tone";
import { useToast } from "@/components/common/toast";
import { Button } from "@/components/ui/button";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

/**
 * 初回の案内（D5。画面仕様書 3.12）：マイ配信者（★）を選ぶ。ホームを初めて開いたときだけ出る
 * （`prefs.setup` が pending のあいだ。完了かスキップで done になり、二度と出ない）。
 * - 配信者を期ごとに見出しで分けて並べる（画像は出さない）。複数選べる（上限 `LIMITS.myStreamers`）。0人でもよい。
 * - ［決定］は選んだ配信者の語を条件ボタンにして先頭に並べる。［スキップ］・［×］・Esc・外側は、何も足さずに閉じる。
 * - 選べる配信者が無い興味の対象では出さない（pending のまま。選べる対象に切り替えたときに出る）。
 */
export function MyStreamersDialog() {
  const { t, lang } = useI18n();
  const api = useApi();
  const toast = useToast();
  const ready = useAppStore((s) => s.status === "ready");
  const prefs = useAppStore((s) => s.prefs);
  const finish = useAppStore((s) => s.setup_finish);
  const interest = prefs?.interest ?? DEFAULT_PREFS.interest;
  const streamers = useMemo(
    () => api.master.streamers(interest),
    [api, interest],
  );
  const gens = useMemo(() => api.master.generations(), [api]);
  const genNames = useMemo(() => gens.map((g) => g.name.ja), [gens]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const open =
    ready && prefs?.setup === "pending" && streamers.length > 0 && !busy;

  const submit = (names: string[]) => {
    setBusy(true);
    finish(interest, names, lang)
      .catch((e: unknown) => {
        console.error(e);
        toast.show(t.toast.saveFailed);
      })
      .finally(() => setBusy(false));
  };

  const toggle = (name: string) =>
    setPicked((p) =>
      p.includes(name) ? p.filter((n) => n !== name) : [...p, name],
    );
  const atLimit = picked.length >= LIMITS.myStreamers;

  // 期ごとの見出し（先頭の期でまとめる。期の並び順）
  const sections = genNames
    .map((ja, i) => ({
      ja,
      label: gens[i].name[lang],
      members: streamers.filter((g) => g.gens[0] === ja),
    }))
    .filter((s) => s.members.length > 0);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && submit([])}>
      <Dialog.Portal>
        <Dialog.Overlay className={DIALOG_OVERLAY} />
        <Dialog.Content
          className={`fixed top-1/2 left-1/2 z-[60] flex max-h-[85vh] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl p-3 ${DIALOG_PANEL}`}
        >
          <Dialog.Title className="font-bold">{t.setup.title}</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            {t.setup.lead(LIMITS.myStreamers)}
          </Dialog.Description>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {t.setup.count(picked.length, LIMITS.myStreamers)}
          </p>
          <div className="min-h-0 flex-1 space-y-3 overflow-auto">
            {sections.map((s) => {
              const tone = toneOfGens([s.ja], genNames);
              return (
                <section
                  key={s.ja}
                  aria-label={s.label}
                  className={`overflow-hidden rounded-lg border border-l-[6px] border-border ${tone.bar}`}
                >
                  <h3 className={`px-3 py-1.5 text-sm font-bold ${tone.head}`}>
                    {s.label}
                  </h3>
                  <div className="flex flex-wrap gap-2 p-2">
                    {s.members.map((g) => {
                      const on = picked.includes(g.name.ja);
                      return (
                        <label
                          key={g.name.ja}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 ${
                            on
                              ? "border-primary bg-primary/20 text-foreground"
                              : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            disabled={atLimit && !on}
                            onChange={() => toggle(g.name.ja)}
                          />
                          <span className="flex size-4 shrink-0 items-center justify-center">
                            {on ? (
                              <Check className="size-4" aria-hidden />
                            ) : (
                              <span
                                className="size-3.5 rounded-sm border border-current"
                                aria-hidden
                              />
                            )}
                          </span>
                          {g.name[lang]}
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => submit([])}>
              {t.setup.skip}
            </Button>
            <Button onClick={() => submit(picked)}>
              {t.setup.done(picked.length)}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
