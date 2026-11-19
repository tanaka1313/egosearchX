"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useState, type RefObject } from "react";
import { useShallow } from "zustand/react/shallow";
import type { OpenTarget } from "@/api";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { MENU_ITEMS } from "./menu-items";
import { useRunner } from "./use-runner";

type Entry = { key: string; label: string; run: () => void };

/**
 * コマンドパレット（画面仕様書 2.6）。Ctrl/⌘+K かメニューの項目で開く（開く操作は AppShell）。
 * 並びは「いつものエゴサ」→「お気に入り」→「ページへ移動」。入力した文字を含むものだけに絞る。
 * - Enter（日本語入力の変換中を除く）で先頭を実行する。Esc・外側で閉じる。開くと入力欄にフォーカスする。
 * - 実行は、クリック・キー入力の中で同期的に行う（`window.open` の前に await や状態更新を挟まない。
 *   挟むとブロックされる）。ブロックされたら、帯の下の表示（`onBlocked`）へ渡す。
 * - 閉じたら、開く前にフォーカスのあった要素へ戻す（`returnRef`。無くなっていれば何もしない）。
 * - 枠は上から固定の位置に置き、絞り込みで一覧が縮んでも動かない。
 */
export function CommandPalette({
  open,
  onClose,
  returnRef,
  onBlocked,
}: {
  open: boolean;
  onClose: () => void;
  returnRef: RefObject<HTMLElement | null>;
  onBlocked: (total: number, blocked: OpenTarget[]) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const run = useRunner();
  const groups = useAppStore(useShallow((s) => s.groups));
  const favorites = useAppStore(useShallow((s) => s.favorites));
  const [q, setQ] = useState("");

  const report = (r: { total: number; blocked: OpenTarget[] }) => {
    if (r.blocked.length > 0) onBlocked(r.total, r.blocked);
  };
  const entries: Entry[] = [
    ...groups.map((g) => ({
      key: `g:${g.id}`,
      label: t.palette.group(g.name, g.items.length),
      run: () =>
        report(run(g.items, { kind: "group", label: g.name, groupId: g.id })),
    })),
    ...favorites.map((f) => ({
      key: `f:${f.id}`,
      label: t.palette.favorite(f.name),
      run: () =>
        report(
          run([{ query: f.query, engine: f.engine }], {
            kind: "favorite",
            label: f.name,
          }),
        ),
    })),
    ...MENU_ITEMS.map((m) => ({
      key: `m:${m.href}`,
      label: t.palette.page(t.menu.items[m.key]),
      run: () => router.push(m.href),
    })),
  ];
  const needle = q.toLowerCase();
  const shown = entries.filter((e) => e.label.toLowerCase().includes(needle));

  const close = () => {
    setQ("");
    onClose();
  };
  const go = (e: Entry) => {
    e.run();
    close();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(ev) => {
            // トリガーを持たないので、放っておくとフォーカスが body に落ちる
            ev.preventDefault();
            const el = returnRef.current;
            if (el?.isConnected) el.focus();
          }}
          className="fixed top-24 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border bg-background p-3 shadow-xl outline-none"
        >
          <Dialog.Title className="sr-only">{t.palette.title}</Dialog.Title>
          <input
            value={q}
            onChange={(ev) => setQ(ev.target.value)}
            onKeyDown={(ev) => {
              if (
                ev.key === "Enter" &&
                !ev.nativeEvent.isComposing &&
                shown[0]
              ) {
                ev.preventDefault();
                go(shown[0]);
              }
            }}
            aria-label={t.palette.filterLabel}
            placeholder={t.palette.placeholder}
            className="w-full rounded-lg border bg-field px-3 py-2"
          />
          <ul className="mt-2 max-h-80 space-y-1 overflow-auto">
            {shown.map((e) => (
              <li key={e.key}>
                <button
                  type="button"
                  onClick={() => go(e)}
                  className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {e.label}
                </button>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-2 py-1 text-sm text-muted-foreground">
                {t.palette.empty}
              </li>
            )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
