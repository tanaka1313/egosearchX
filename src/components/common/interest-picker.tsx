"use client";

import { Check, ChevronDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ApiError, DEFAULT_PREFS } from "@/api";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

/** 全角（半角の2文字ぶん）を考えた表示幅。ボタンの幅を一番長い名前に固定するために使う */
const displayWidth = (s: string) =>
  [...s].reduce((n, c) => n + (c.charCodeAt(0) > 255 ? 2 : 1), 0);

/**
 * 興味の対象の切替（ヘッダーのサイト名の一部：［ホロライブ▾］EgoSearch。画面仕様書 2.1）。
 * 一覧は `master.interests()`（JSON の並び）。選ぶと `prefs.interest` を保存し、条件ボタンの並びが切り替わる。
 * 幅は日英すべての名前の一番長いものに固定し、切り替えても動かない。モーダルにしない。
 */
export function InterestPicker() {
  const api = useApi();
  const { lang, t } = useI18n();
  const saved = useAppStore((s) => s.prefs?.interest);
  const prefsSet = useAppStore((s) => s.prefs_set);
  const interests = useMemo(() => [...api.master.interests().values()], [api]);
  const width = useMemo(
    () =>
      Math.max(
        ...interests.flatMap((i) => [
          displayWidth(i.label.ja),
          displayWidth(i.label.en),
        ]),
      ),
    [interests],
  );
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const current =
    interests.find((i) => i.id === (saved ?? DEFAULT_PREFS.interest)) ??
    interests[0];

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  const choose = (id: string) => {
    prefsSet({ interest: id }).catch((e: unknown) => {
      // CORRUPT は書かないのが正しい動作。それ以外（想定外）はコンソールに残す
      if (!(e instanceof ApiError && e.code === "CORRUPT")) console.error(e);
    });
    close();
  };

  if (!current) return null;
  return (
    <div
      className="relative shrink-0"
      onKeyDown={(ev) => {
        if (ev.key === "Escape" && open) {
          ev.stopPropagation();
          close();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.interest.button(current.label[lang])}
        onClick={() => setOpen((v) => !v)}
        style={{ minWidth: `calc(${width}ch + 2.5rem)` }}
        className="flex items-center justify-between gap-1 rounded-full border-2 border-primary/60 bg-primary/10 px-2.5 py-0.5 text-sm font-bold focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{current.label[lang]}</span>
        <ChevronDown className="size-4 shrink-0" aria-hidden />
      </button>

      {open && (
        <>
          {/* 外側を押すと閉じる（キーボードでは Esc） */}
          <button
            type="button"
            aria-label={t.interest.close}
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="menu"
            aria-label={t.interest.menu}
            className="absolute top-full left-0 z-40 mt-1 w-56 rounded-lg border bg-background p-1 shadow-lg"
          >
            {interests.map((i) => {
              const on = i.id === current.id;
              return (
                <button
                  key={i.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  autoFocus={on}
                  onClick={() => choose(i.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {on && <Check className="size-4" aria-hidden />}
                  </span>
                  <span className={on ? "font-bold" : ""}>{i.label[lang]}</span>
                </button>
              );
            })}
            <p className="px-2 pt-1 pb-1 text-xs text-muted-foreground">
              {t.interest.note}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
