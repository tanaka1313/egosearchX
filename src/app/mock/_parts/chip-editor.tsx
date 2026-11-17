"use client";
// MOCK: 破棄予定（#61）
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  COND_KINDS,
  LIMITS,
  PARAM_OPS,
  paramOpsOf,
  type Chip,
  type Cond,
  type CondKind,
  type ParamOp,
} from "./data";
import { condToken, parseListId } from "./query";
import { chipConds, condsToQuery } from "./query-model";
import { useStore } from "./store";
import { Sheet } from "./ui";

let cseq = 0;
const cid = () => `ce${++cseq}${Date.now()}`;

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
  const { ref, handleRef } = useSortable({ id: cond.id, index });
  const hint = COND_KINDS.find((k) => k.kind === cond.kind)?.hint;
  const paramType =
    cond.kind === "number" || cond.kind === "date" ? cond.kind : null;
  return (
    <li
      ref={ref}
      className="flex flex-wrap items-center gap-1 rounded-lg border p-1"
    >
      <button
        ref={handleRef}
        aria-label="条件を並べ替え"
        className="cursor-grab touch-none p-1 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <GripVertical className="size-4" />
      </button>
      <select
        value={cond.kind}
        aria-label="条件の種類"
        onChange={(ev) => {
          const kind = ev.target.value as CondKind;
          // 数値／日付に変えたら演算子の先頭を選び、値は空にする（形式が違うため）
          if (kind === "number" || kind === "date")
            onChange({ id: cond.id, kind, op: paramOpsOf(kind)[0], value: "" });
          else onChange({ id: cond.id, kind, value: cond.value });
        }}
        className="rounded border px-1 py-1 text-sm"
      >
        {COND_KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>
            {k.label}
          </option>
        ))}
      </select>
      {paramType && (
        <select
          value={cond.op}
          aria-label="演算子"
          onChange={(ev) =>
            onChange({ ...cond, op: ev.target.value as ParamOp })
          }
          className="rounded border px-1 py-1 text-sm"
        >
          {paramOpsOf(paramType).map((op) => (
            <option key={op} value={op}>
              {PARAM_OPS[op].label}（{op}）
            </option>
          ))}
        </select>
      )}
      <input
        type={paramType ?? "text"}
        min={paramType === "number" ? 1 : undefined}
        value={cond.value}
        aria-label={paramType ? "初期値（ホームで変えられます）" : "条件の値"}
        placeholder={hint}
        onChange={(ev) => onChange({ ...cond, value: ev.target.value })}
        className="min-w-0 flex-1 rounded border px-2 py-1 font-mono text-sm"
      />
      {cond.op && paramType && (
        <span className="shrink-0 text-sm">{PARAM_OPS[cond.op].suffix}</span>
      )}
      <button
        aria-label="条件を削除"
        onClick={onRemove}
        className="rounded p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" />
      </button>
    </li>
  );
}

/**
 * M1：条件ボタンの編集（ラベルと中身。1つのボタンに複数の条件）。
 * 本体は検索文字列。編集のときだけ条件の行に分け（chipConds）、保存で文字列に戻す（condsToQuery）。
 */
export function ChipEditor({
  chip,
  onClose,
}: {
  chip: Chip | null;
  onClose: () => void;
}) {
  const { saveChip, chips, interest } = useStore();
  const isNew = !chip;
  const [label, setLabel] = useState(chip?.label ?? "");
  const [conds, setConds] = useState<Cond[]>(() =>
    chip ? chipConds(chip) : [{ id: cid(), kind: "word", value: "" }],
  );
  const [listInput, setListInput] = useState("");
  const [err, setErr] = useState("");

  const preview = conds.map(condToken).filter(Boolean).join(" ");
  const yahooWarn = conds.some(
    (c) => c.kind === "list" || c.value.includes("filter:"),
  );

  const addList = () => {
    const id = parseListId(listInput);
    if (!id) {
      setErr(
        "リストの URL（https://x.com/i/lists/…）または数字の ID を入力してください",
      );
      return;
    }
    setErr("");
    setConds([
      ...conds.filter((c) => c.value),
      { id: cid(), kind: "list", value: id },
    ]);
    if (!label) setLabel(`リスト ${id.slice(0, 6)}…`);
    setListInput("");
  };

  const save = () => {
    const filled = conds.filter((c) => c.value.trim());
    // ラベルが空なら、値付きの条件の名前（例：ファボ数）を使う
    const paramOp = filled.find((c) => c.op)?.op;
    const name = label.trim() || (paramOp ? PARAM_OPS[paramOp].label : "");
    if (!name) return setErr("ラベルを入力してください");
    if (name.length > 20) return setErr("ラベルは20文字までです");
    if (!filled.length) return setErr("条件を1つ以上入力してください");
    const bad = filled.find(
      (c) => (c.kind === "number" || c.kind === "date") && !condToken(c),
    );
    if (bad)
      return setErr(
        bad.kind === "number"
          ? "数値は1以上の整数で入力してください"
          : "日付を YYYY-MM-DD で入力してください",
      );
    const out: Chip = {
      id: chip?.id ?? `u${cid()}`,
      interestId: chip?.interestId ?? interest,
      label: name,
      query: condsToQuery(filled),
      on: chip?.on ?? false,
      visible: chip?.visible ?? true,
      isNew: false,
      isPreset: chip?.isPreset,
    };
    const msg = saveChip(out);
    if (msg) return setErr(msg);
    onClose();
  };

  return (
    <Sheet
      title={isNew ? "条件ボタンを追加" : "条件ボタンを編集"}
      onClose={onClose}
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">ラベル（ボタンの表示名）</span>
        <input
          value={label}
          onChange={(ev) => setLabel(ev.target.value)}
          maxLength={30}
          className="w-full rounded-lg border px-3 py-2"
          placeholder="例：ネタバレ除外"
        />
      </label>

      <div className="space-y-1">
        <div className="text-sm font-medium">中身（複数の条件を持てます）</div>
        <DragDropProvider
          onDragEnd={(ev) => {
            if (ev.canceled) return;
            setConds(move(conds, ev));
          }}
        >
          <ul className="space-y-1">
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
          size="sm"
          variant="outline"
          onClick={() =>
            setConds([...conds, { id: cid(), kind: "word", value: "" }])
          }
        >
          ＋ 条件を追加
        </Button>
      </div>

      <div className="space-y-1 rounded-lg border p-2">
        <div className="text-sm font-medium">リストを登録</div>
        <div className="flex gap-1">
          <input
            value={listInput}
            onChange={(ev) => setListInput(ev.target.value)}
            aria-label="リストの URL または ID"
            placeholder="https://x.com/i/lists/… または ID"
            className="min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm"
          />
          <Button size="sm" variant="outline" onClick={addList}>
            取り出す
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-sm font-medium">プレビュー</div>
        <code className="block rounded bg-muted p-2 font-mono text-xs break-all">
          {preview || "（中身が空です）"}
        </code>
        {yahooWarn && (
          <p className="text-xs">
            ⚠ list: / filter: は
            Yahoo!リアルタイム検索では使えません（Yahoo!リアルタイム検索では除外されます）
          </p>
        )}
      </div>

      {chip && (
        <p className="text-sm text-muted-foreground">
          保存済みのお気に入り・いつものエゴサには反映されません（それぞれが検索文字列を持っているため）。
        </p>
      )}
      {isNew && chips.length >= LIMITS.chips && (
        <p className="text-sm">
          ⚠ 上限（{LIMITS.chips}件）です。不要なボタンを削除してください。
        </p>
      )}
      {err && (
        <p role="alert" className="text-sm font-medium">
          ⚠ {err}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          キャンセル
        </Button>
        <Button onClick={save}>保存</Button>
      </div>
    </Sheet>
  );
}
