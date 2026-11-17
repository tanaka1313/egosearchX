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
  type Chip,
  type Cond,
  type CondKind,
} from "./data";
import { condToken, parseListId } from "./query";
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
  return (
    <li ref={ref} className="flex items-center gap-1 rounded-lg border p-1">
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
        onChange={(ev) =>
          onChange({ ...cond, kind: ev.target.value as CondKind })
        }
        className="rounded border px-1 py-1 text-sm"
      >
        {COND_KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>
            {k.label}
          </option>
        ))}
      </select>
      <input
        value={cond.value}
        aria-label="条件の値"
        placeholder={hint}
        onChange={(ev) => onChange({ ...cond, value: ev.target.value })}
        className="min-w-0 flex-1 rounded border px-2 py-1 font-mono text-sm"
      />
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

/** M1：条件ボタンの編集（ラベルと中身。1つのボタンに複数の条件） */
export function ChipEditor({
  chip,
  onClose,
}: {
  chip: Chip | null;
  onClose: () => void;
}) {
  const { saveChip, favs, chips } = useStore();
  const isNew = !chip;
  const [label, setLabel] = useState(chip?.label ?? "");
  const [conds, setConds] = useState<Cond[]>(
    chip?.conds ?? [{ id: cid(), kind: "word", value: "" }],
  );
  const [listInput, setListInput] = useState("");
  const [err, setErr] = useState("");

  const used = chip
    ? favs.filter((f) => f.chipIds.includes(chip.id)).length
    : 0;
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
    if (!label.trim()) return setErr("ラベルを入力してください");
    if (label.length > 20) return setErr("ラベルは20文字までです");
    if (!filled.length) return setErr("条件を1つ以上入力してください");
    const out: Chip = {
      id: chip?.id ?? `u${cid()}`,
      label: label.trim(),
      conds: filled,
      on: chip?.on ?? false,
      isNew: false,
      isDefault: chip?.isDefault,
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
            ⚠ list: / filter: は Yahoo では使えません（Yahoo では除外されます）
          </p>
        )}
      </div>

      {chip && (
        <p className="text-sm text-muted-foreground">
          {used}
          件のお気に入りがこのボタンを使っています。保存するとすべてに反映されます。
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
