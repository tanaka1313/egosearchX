"use client";

import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { useCallback } from "react";
import { useState } from "react";
import { ApiError, DEFAULT_PREFS, LIMITS, type Chip } from "@/api";
import { EmptyState } from "@/components/common/empty-state";
import { PageHead } from "@/components/common/page-head";
import { useToast } from "@/components/common/toast";
import {
  HomeScopeProvider,
  useSearchScope,
} from "@/components/search/search-scope";
import { Button } from "@/components/ui/button";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { ChipEditorSheet } from "./chip-editor";

/**
 * S2：条件ボタン（画面仕様書 5.1）。今の興味の対象の条件ボタンを全件並べ、並べ替え・表示の切替・編集（D1）・
 * コピー・削除（削除済みへ。トーストの［元に戻す］で元の位置へ）ができる。一覧の下にサジェストを出す。
 * 検索の組み立ての文脈（`HomeScopeProvider`）から、条件ボタンとサジェストの候補をホームと同じものとして読む。
 */
export function ChipsPage() {
  return (
    <HomeScopeProvider>
      <ChipsBody />
    </HomeScopeProvider>
  );
}

/** 失敗は、壊れたデータなら黙り（書かないのが正しい）、それ以外はトーストで知らせる */
function useGuard() {
  const toast = useToast();
  const { t } = useI18n();
  return useCallback(
    (p: Promise<unknown>) => {
      p.catch((e: unknown) => {
        if (e instanceof ApiError && e.code === "CORRUPT") return;
        if (e instanceof ApiError && e.code === "LIMIT")
          return toast.show(t.chips.full(LIMITS.chips));
        console.error(e);
        toast.show(t.chips.failed);
      });
    },
    [toast, t],
  );
}

function Row({ chip, index }: { chip: Chip; index: number }) {
  const { t } = useI18n();
  const c = t.chips;
  const api = useApi();
  const toast = useToast();
  const guard = useGuard();
  const isNew = useAppStore((s) => s.newChipIds.includes(chip.id));
  const setVisible = useAppStore((s) => s.chips_setVisible);
  const remove = useAppStore((s) => s.chips_remove);
  const restore = useAppStore((s) => s.trash_restore);
  const { ref, handleRef } = useSortable({ id: chip.id, index });
  const condCount = api.query.chipConds(chip).length;

  return (
    <li
      ref={ref}
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border p-2 text-sm"
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={c.reorder(chip.label)}
        className="cursor-grab touch-none p-1 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <div className="min-w-0 flex-1 basis-40">
        <div className="flex flex-wrap items-center gap-1 font-medium">
          <span className="break-all">{chip.label}</span>
          {chip.isPreset && (
            <span className="rounded border px-1 text-xs">{c.preset}</span>
          )}
          {isNew && (
            <span className="rounded bg-amber-300 px-1 text-xs font-bold text-amber-950">
              {c.newMark}
            </span>
          )}
          {!chip.visible && (
            <span className="rounded border px-1 text-xs">{c.hiddenMark}</span>
          )}
          <span className="text-xs font-normal text-muted-foreground">
            {c.conds(condCount)}
          </span>
        </div>
        <div
          title={chip.query}
          className="truncate font-mono text-xs text-muted-foreground"
        >
          {chip.query}
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <label
          className="flex items-center gap-1 text-xs"
          title={c.visibleTitle}
        >
          <input
            type="checkbox"
            checked={chip.visible}
            aria-label={`${c.visible}: ${chip.label}`}
            onChange={(ev) => guard(setVisible(chip.id, ev.target.checked))}
          />
          {c.visible}
        </label>
        <ChipEditorSheet
          chip={chip}
          trigger={
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={c.editLabel(chip.label)}
            >
              {c.edit}
            </Button>
          }
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          title={c.copyTitle}
          onClick={() => {
            const done = () => toast.show(c.copied(chip.label));
            Promise.resolve(navigator.clipboard?.writeText(chip.query)).then(
              done,
              () => toast.show(c.failed),
            );
          }}
        >
          {c.copy}
        </Button>
        <button
          type="button"
          aria-label={c.remove(chip.label)}
          onClick={() =>
            guard(
              remove(chip.id).then(() =>
                toast.show(c.removed(chip.label), () =>
                  guard(restore("chip", chip.id)),
                ),
              ),
            )
          }
          className="rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          ×
        </button>
      </div>
    </li>
  );
}

function ChipsBody() {
  const api = useApi();
  const { t, lang } = useI18n();
  const c = t.chips;
  const toast = useToast();
  const guard = useGuard();
  const { chips, suggestions } = useSearchScope();
  const interest = useAppStore(
    (s) => s.prefs?.interest ?? DEFAULT_PREFS.interest,
  );
  const reorder = useAppStore((s) => s.chips_reorder);
  const addPresets = useAppStore((s) => s.chips_addPresets);
  const adopt = useAppStore((s) => s.chips_adoptSuggestion);

  // 並べ替えの直後は、保存と読み直しが済むまで、落とした並びをこの画面で持つ（行が元に戻って見えないように）。
  // 条件ボタンが読み直されると（`chips` の参照が変わると）捨てる
  const [local, setLocal] = useState<{ base: Chip[]; ids: string[] } | null>(
    null,
  );
  const shown =
    local && local.base === chips
      ? local.ids
          .map((id) => chips.find((x) => x.id === id))
          .filter((x): x is Chip => x !== undefined)
      : chips;

  const interestLabel = api.master.interests().get(interest)?.label[lang] ?? "";
  const full = chips.length >= LIMITS.chips;

  const addPresetsAndTell = () =>
    guard(
      addPresets(interest).then((added) =>
        toast.show(
          added.length ? c.presetsAdded(added.length) : c.presetsAllAdded,
        ),
      ),
    );

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead
        title={c.title}
        right={
          <>
            <span className="text-sm" aria-label={c.countLabel}>
              {c.count(chips.length, LIMITS.chips)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addPresetsAndTell}
            >
              {c.addPresets}
            </Button>
            <ChipEditorSheet
              chip={null}
              trigger={
                <Button type="button" size="sm" disabled={full}>
                  {c.add}
                </Button>
              }
            />
          </>
        }
      />
      <p className="text-sm text-muted-foreground">
        {c.description(interestLabel)}
      </p>
      {full && <p className="text-sm">{c.full(LIMITS.chips)}</p>}

      {chips.length === 0 ? (
        <EmptyState text={c.empty}>
          <Button type="button" size="sm" onClick={addPresetsAndTell}>
            {c.addPresetsFor(interestLabel)}
          </Button>
        </EmptyState>
      ) : (
        <DragDropProvider
          onDragEnd={(ev) => {
            if (ev.canceled) return;
            const ids = move(shown, ev).map((x) => x.id);
            setLocal({ base: chips, ids });
            reorder(interest, ids).catch((e: unknown) => {
              setLocal(null);
              guard(Promise.reject(e));
            });
          }}
        >
          <ul aria-label={c.list} className="space-y-2">
            {shown.map((chip, i) => (
              <Row key={chip.id} chip={chip} index={i} />
            ))}
          </ul>
        </DragDropProvider>
      )}

      <section aria-label={c.suggest.title} className="space-y-2 pt-2">
        <h2 className="font-bold">{c.suggest.title}</h2>
        <p className="text-sm text-muted-foreground">
          {c.suggest.note(LIMITS.suggest)}
        </p>
        {suggestions.length === 0 ? (
          <EmptyState text={c.suggest.empty} />
        ) : (
          <ul className="space-y-1">
            {suggestions.map((token) => (
              <li
                key={token}
                className="flex items-center gap-2 rounded-lg border border-dashed p-2 text-sm"
              >
                <code className="min-w-0 flex-1 truncate font-mono text-xs">
                  {token}
                </code>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={full}
                  aria-label={c.suggest.adoptLabel(token)}
                  onClick={() => guard(adopt(interest, token))}
                >
                  {c.suggest.adopt}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {full && <p className="text-xs">{c.suggest.full(LIMITS.chips)}</p>}
      </section>
    </main>
  );
}
