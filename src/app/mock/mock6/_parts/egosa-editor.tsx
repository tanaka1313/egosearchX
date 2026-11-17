"use client";
// MOCK: 破棄予定（#61）
// いつものエゴサの追加・編集シート。
// 追加の方法は2つ：①お気に入りを選んでまとめる ②条件を指定して新しく作る（作った条件はお気に入りに保存され、一覧に入る）。
// ②の「検索の組み立て」は、モックでは直書き。本実装ではホームの検索の組み立てと共通のコンポーネントにする
// （docs/implementation-plan.md「実装時の注意」）。
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EMPTY_DETAIL, EMPTY_PERIOD, type Group, type Period } from "./data";
import { PERIOD_LABEL, buildQuery } from "./query";
import { useStore } from "./store";
import { Sheet } from "./ui";

const PERIODS: Period["kind"][] = ["none", "today", "yday", "last"];

export function EgosaEditor({
  group,
  onClose,
}: {
  group: Group | null;
  onClose: () => void;
}) {
  const s = useStore();
  const [name, setName] = useState(group?.name ?? "");
  const [sel, setSel] = useState<string[]>(group?.favIds ?? []);
  const [err, setErr] = useState("");

  // ②条件を指定して新しく作る
  const [making, setMaking] = useState(false);
  const [mWord, setMWord] = useState("");
  const [mExact, setMExact] = useState(false);
  const [mChips, setMChips] = useState<string[]>([]);
  const [mPeriod, setMPeriod] = useState<Period["kind"]>("none");
  const [mName, setMName] = useState("");
  const [mErr, setMErr] = useState("");

  const preview = buildQuery({
    word: mWord,
    exact: mExact,
    chips: s.chips,
    detail: EMPTY_DETAIL,
    period: { ...EMPTY_PERIOD, kind: mPeriod },
    onlyChipIds: mChips,
  });

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= sel.length) return;
    const n = [...sel];
    [n[i], n[j]] = [n[j], n[i]];
    setSel(n);
  };

  const makeFav = () => {
    if (!mName.trim()) return setMErr("お気に入りの名前を入力してください");
    if (!mWord.trim() && mChips.length === 0)
      return setMErr("検索語か条件ボタンを1つ以上選んでください");
    const id = `f${Date.now()}`;
    s.saveFav({
      id,
      name: mName.trim(),
      word: mWord,
      exact: mExact,
      chipIds: mChips,
      extra: [],
      period: mPeriod,
      engine: "x",
      last: "未実行",
    });
    setSel((v) => [...v, id]);
    setMaking(false);
    setMWord("");
    setMExact(false);
    setMChips([]);
    setMPeriod("none");
    setMName("");
    setMErr("");
  };

  return (
    <Sheet
      title={group ? "いつものエゴサを編集" : "いつものエゴサを追加"}
      onClose={onClose}
    >
      <label className="block space-y-1 text-sm">
        <span className="font-medium">名前</span>
        <input
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          placeholder="例：配信後エゴサ"
          className="w-full rounded-lg border px-3 py-2"
        />
      </label>

      <fieldset className="space-y-1 text-sm">
        <legend className="font-medium">
          含めるお気に入り（選んでまとめます）
        </legend>
        {s.favs.length === 0 && (
          <p className="text-muted-foreground">
            お気に入りがありません。下の［条件を指定して新しく作る］で作れます。
          </p>
        )}
        {s.favs.map((f) => (
          <label key={f.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sel.includes(f.id)}
              onChange={() =>
                setSel(
                  sel.includes(f.id)
                    ? sel.filter((x) => x !== f.id)
                    : [...sel, f.id],
                )
              }
            />
            {f.name}
          </label>
        ))}
      </fieldset>

      {!making ? (
        <Button size="sm" variant="outline" onClick={() => setMaking(true)}>
          ＋ 条件を指定して新しく作る
        </Button>
      ) : (
        <section
          aria-label="条件を指定して新しく作る"
          className="space-y-2 rounded-lg border p-3 text-sm"
        >
          <p className="font-medium">条件を指定して新しく作る</p>
          <p className="text-xs text-muted-foreground">
            作った条件はお気に入りに保存され、このいつものエゴサに入ります。
          </p>
          <div className="flex gap-2">
            <input
              value={mWord}
              onChange={(ev) => setMWord(ev.target.value)}
              aria-label="検索する語"
              placeholder="検索する語"
              className="min-w-0 flex-1 rounded-full border px-3 py-1.5"
            />
            <button
              aria-pressed={mExact}
              onClick={() => setMExact(!mExact)}
              className={`shrink-0 rounded-full border px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring ${mExact ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
            >
              完全一致
            </button>
          </div>
          <div
            role="group"
            aria-label="条件ボタン"
            className="flex flex-wrap gap-1.5"
          >
            {s.chips.map((c) => {
              const on = mChips.includes(c.id);
              return (
                <button
                  key={c.id}
                  aria-pressed={on}
                  onClick={() =>
                    setMChips(
                      on ? mChips.filter((x) => x !== c.id) : [...mChips, c.id],
                    )
                  }
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs focus-visible:ring-2 focus-visible:ring-ring ${on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
                >
                  <span className="w-3 text-center">{on ? "✓" : "○"}</span>
                  {c.label}
                </button>
              );
            })}
          </div>
          <div
            role="group"
            aria-label="期間"
            className="flex flex-wrap items-center gap-1"
          >
            <span className="mr-1 font-medium">期間</span>
            {PERIODS.map((k) => (
              <button
                key={k}
                aria-pressed={mPeriod === k}
                onClick={() => setMPeriod(k)}
                className={`rounded-full border px-2.5 py-1 text-xs focus-visible:ring-2 focus-visible:ring-ring ${mPeriod === k ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
              >
                {PERIOD_LABEL[k]}
              </button>
            ))}
          </div>
          <code
            tabIndex={0}
            aria-label="組み立てた検索クエリ"
            className="block h-8 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs whitespace-nowrap"
          >
            {preview.text || "（検索語か条件ボタンを選んでください）"}
          </code>
          <label className="block space-y-1">
            <span className="font-medium">お気に入りの名前</span>
            <input
              value={mName}
              onChange={(ev) => setMName(ev.target.value)}
              placeholder="例：配信タグ"
              className="w-full rounded-lg border px-3 py-1.5"
            />
          </label>
          {mErr && (
            <p role="alert" className="text-xs font-medium">
              ⚠ {mErr}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMaking(false)}
            >
              やめる
            </Button>
            <Button size="sm" onClick={makeFav}>
              お気に入りに保存して追加
            </Button>
          </div>
        </section>
      )}

      {sel.length > 1 && (
        <div className="space-y-1 text-sm">
          <div className="font-medium">開く順</div>
          <ol className="space-y-1">
            {sel.map((id, i) => (
              <li
                key={id}
                className="flex items-center gap-1 rounded border px-2 py-1"
              >
                <span className="flex-1">
                  {i + 1}. {s.favs.find((f) => f.id === id)?.name}
                </span>
                <button
                  aria-label="上へ"
                  onClick={() => move(i, -1)}
                  className="px-1"
                >
                  ↑
                </button>
                <button
                  aria-label="下へ"
                  onClick={() => move(i, 1)}
                  className="px-1"
                >
                  ↓
                </button>
              </li>
            ))}
          </ol>
        </div>
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
        <Button
          onClick={() => {
            if (!name.trim()) return setErr("名前を入力してください");
            if (!sel.length) return setErr("お気に入りを1つ以上選んでください");
            s.saveGroup({
              id: group?.id ?? `g${Date.now()}`,
              name: name.trim(),
              favIds: sel,
              doneToday: group?.doneToday ?? false,
            });
            onClose();
          }}
        >
          保存
        </Button>
      </div>
    </Sheet>
  );
}
