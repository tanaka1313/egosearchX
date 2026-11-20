"use client";

import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ChevronDown, ChevronRight, GripVertical, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  ApiError,
  DEFAULT_PREFS,
  LIMITS,
  PARAM_OP_TYPES,
  type Chip,
  type Cond,
  type CondKind,
  type ParamOp,
} from "@/api";
import { truncateName } from "@/components/common/auto-name";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";

const KINDS: CondKind[] = [
  "word",
  "exact",
  "exclude",
  "list",
  "account",
  "filter",
  "raw",
  "number",
  "date",
];

/** 種類（数値・日付）に対応する演算子。キーは契約の定数から導く */
const opsOf = (type: "number" | "date"): ParamOp[] =>
  (Object.keys(PARAM_OP_TYPES) as ParamOp[]).filter(
    (op) => PARAM_OP_TYPES[op] === type,
  );

let seq = 0;
const newCondId = () => `ce${++seq}`;
const blankCond = (): Cond => ({ id: newCondId(), kind: "word", value: "" });

const inputClass =
  "rounded-lg border border-input bg-field px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring";

/**
 * D1：条件ボタンの編集シート（画面仕様書 D1）。`trigger` を押すと開き、閉じるとフォーカスが戻る。
 * `chip` が null なら追加。本体は検索文字列で、編集の間だけ条件の行に分けて表示し、保存で文字列に戻す。
 */
export function ChipEditorSheet({
  chip,
  trigger,
}: {
  chip: Chip | null;
  trigger: ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={chip ? t.chips.editor.editTitle : t.chips.editor.addTitle}
      closeLabel={t.sheet.close}
    >
      {/* 閉じると中身ごと消えるので、開き直すと入力は保存済みの値に戻る */}
      <EditorForm chip={chip} onClose={() => setOpen(false)} />
    </Sheet>
  );
}

function CondRow({
  cond,
  index,
  onChange,
  onRemove,
}: {
  cond: Cond;
  index: number;
  onChange: (c: Cond) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const e = t.chips.editor;
  const { ref, handleRef } = useSortable({ id: cond.id, index });
  const paramType =
    cond.kind === "number" || cond.kind === "date" ? cond.kind : null;
  return (
    <li
      ref={ref}
      className="flex flex-wrap items-center gap-1 rounded-lg border p-1"
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={e.reorder}
        className="cursor-grab touch-none p-1 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <select
        value={cond.kind}
        aria-label={e.kind}
        onChange={(ev) => {
          const kind = ev.target.value as CondKind;
          // 数値／日付に変えたら演算子の先頭を選び、値は空にする（形式が違うため）
          if (kind === "number" || kind === "date")
            onChange({ id: cond.id, kind, op: opsOf(kind)[0], value: "" });
          else onChange({ id: cond.id, kind, value: cond.value });
        }}
        className={inputClass}
      >
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {e.kinds[k]}
          </option>
        ))}
      </select>
      {paramType && (
        <select
          value={cond.op}
          aria-label={e.op}
          onChange={(ev) =>
            onChange({ ...cond, op: ev.target.value as ParamOp })
          }
          className={inputClass}
        >
          {opsOf(paramType).map((op) => (
            <option key={op} value={op}>
              {t.search.paramLabel[op]}（{op}）
            </option>
          ))}
        </select>
      )}
      <input
        type={paramType ?? "text"}
        min={paramType === "number" ? 1 : undefined}
        value={cond.value}
        aria-label={paramType ? e.paramValue : e.value}
        placeholder={e.hints[cond.kind]}
        onChange={(ev) => onChange({ ...cond, value: ev.target.value })}
        className={`${inputClass} min-w-0 flex-1 font-mono`}
      />
      {cond.op && paramType && (
        <span className="shrink-0 text-sm">
          {t.search.paramSuffix[cond.op]}
        </span>
      )}
      <button
        type="button"
        aria-label={e.remove}
        onClick={onRemove}
        className="rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </li>
  );
}

function EditorForm({
  chip,
  onClose,
}: {
  chip: Chip | null;
  onClose: () => void;
}) {
  const api = useApi();
  const { t } = useI18n();
  const e = t.chips.editor;
  const interest = useAppStore(
    (s) => s.prefs?.interest ?? DEFAULT_PREFS.interest,
  );
  const count = useAppStore((s) => s.chips.get(interest)?.length ?? 0);
  const chipsSave = useAppStore((s) => s.chips_save);

  const [label, setLabel] = useState(chip?.label ?? "");
  const [conds, setConds] = useState<Cond[]>(() =>
    chip ? api.query.chipConds(chip) : [blankCond()],
  );
  const [listInput, setListInput] = useState("");
  // 初期は閉じる。リストの条件を持つボタンを編集するときは開く
  const [listOpen, setListOpen] = useState(() =>
    conds.some((c) => c.kind === "list"),
  );
  const [error, setError] = useState("");

  const preview = useMemo(() => api.query.condsToQuery(conds), [api, conds]);
  // Yahoo!リアルタイム検索で使えない演算子の注意は、URL 生成の警告をそのまま出す（演算子の定義は1か所）
  const yahooWarnings = useMemo(
    () =>
      preview
        ? api.url
            .plan([{ query: preview, engine: "yahoo" }])
            .warnings.filter((w) => w.code.startsWith("yahoo."))
        : [],
    [api, preview],
  );

  const autoLabel = truncateName(preview, LIMITS.chipLabel);

  const addList = () => {
    const r = api.url.listId(listInput);
    if (!r.ok) return setError(t.issues[r.error.code](r.error.params ?? {}));
    setError("");
    setConds([
      ...conds.filter((c) => c.value.trim()),
      { id: newCondId(), kind: "list", value: r.value },
    ]);
    if (!label.trim()) setLabel(e.listName(r.value));
    setListInput("");
  };

  const save = async () => {
    // ラベルが空なら、中身の条件の文字列から作った名前（プレースホルダーに出している）を使う
    const r = api.query.validateChip(label.trim() || autoLabel, conds);
    if (!r.ok) return setError(t.issues[r.error.code](r.error.params ?? {}));
    try {
      await chipsSave({
        id: chip?.id,
        interestId: chip?.interestId ?? interest,
        label: r.value.label,
        query: r.value.query,
      });
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "LIMIT")
        return setError(e.limit(LIMITS.chips));
      if (!(err instanceof ApiError && err.code === "CORRUPT"))
        console.error(err);
      setError(e.saveFailed);
    }
  };

  return (
    <>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{e.label}</span>
        <input
          value={label}
          onChange={(ev) => setLabel(ev.target.value)}
          placeholder={autoLabel || e.labelPlaceholder}
          className={`${inputClass} w-full py-2`}
        />
      </label>

      <div className="space-y-1">
        <div className="text-sm font-medium">{e.body}</div>
        <DragDropProvider
          onDragEnd={(ev) => {
            if (ev.canceled) return;
            setConds(move(conds, ev));
          }}
        >
          <ul aria-label={e.conds} className="space-y-1">
            {conds.map((c, i) => (
              <CondRow
                key={c.id}
                cond={c}
                index={i}
                onChange={(n) =>
                  setConds(conds.map((x) => (x.id === c.id ? n : x)))
                }
                onRemove={() => setConds(conds.filter((x) => x.id !== c.id))}
              />
            ))}
          </ul>
        </DragDropProvider>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setConds([...conds, blankCond()])}
        >
          {e.addCond}
        </Button>
      </div>

      <div className="space-y-1 rounded-lg border p-2">
        <button
          type="button"
          aria-expanded={listOpen}
          aria-controls="chip-list-register"
          onClick={() => setListOpen((v) => !v)}
          className="flex items-center gap-1 rounded text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"
        >
          {listOpen ? (
            <ChevronDown className="size-4" aria-hidden />
          ) : (
            <ChevronRight className="size-4" aria-hidden />
          )}
          {e.listSection}
        </button>
        {listOpen && (
          <div id="chip-list-register" className="flex gap-1">
            <input
              value={listInput}
              onChange={(ev) => setListInput(ev.target.value)}
              aria-label={e.listInput}
              placeholder={e.listPlaceholder}
              className={`${inputClass} min-w-0 flex-1`}
            />
            <Button type="button" size="sm" variant="outline" onClick={addList}>
              {e.listExtract}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-sm font-medium">{e.preview}</div>
        <code
          aria-label={e.preview}
          className="block rounded bg-muted p-2 font-mono text-xs break-all"
        >
          {preview || e.previewEmpty}
        </code>
        {yahooWarnings.map((w) => (
          <p key={w.code} role="note" className="text-xs text-muted-foreground">
            ⚠ {t.issues[w.code](w.params ?? {})}
          </p>
        ))}
      </div>

      {chip && <p className="text-sm text-muted-foreground">{e.editNote}</p>}
      {!chip && count >= LIMITS.chips && (
        <p className="text-sm">⚠ {e.limit(LIMITS.chips)}</p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {e.cancel}
        </Button>
        <Button type="button" onClick={save}>
          {e.save}
        </Button>
      </div>
    </>
  );
}
