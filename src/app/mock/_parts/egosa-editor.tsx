"use client";
// MOCK: 破棄予定（#61）
// いつものエゴサの追加・編集シート。名前の入力は「いつものエゴサの名前」1つだけ。
// 中身（検索）の入れ方は2つ：①お気に入りから追加（コピー）②条件を指定して新しく作る
// （作った検索はお気に入りにも保存され、名前は「<いつものエゴサ名>：<検索語または1つ目のボタン名>」を自動で付ける）。
// ②の「検索の組み立て」は、モックでは直書き。本実装ではホームの検索の組み立てと共通のコンポーネントにする
// （docs/implementation-plan.md「実装時の注意」）。
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  EMPTY_DETAIL,
  EMPTY_PERIOD,
  favToItem,
  type Group,
  type Period,
  type SavedSearch,
} from "./data";
import { PeriodPicker } from "./period-picker";
import { buildQuery, periodInverted, savedText } from "./query";
import { nid, useStore } from "./store";
import { Sheet, toggleClass } from "./ui";

export function EgosaEditor({
  group,
  onClose,
}: {
  group: Group | null;
  onClose: () => void;
}) {
  const s = useStore();
  const [name, setName] = useState(group?.name ?? "");
  const [items, setItems] = useState<SavedSearch[]>(group?.items ?? []);
  const [err, setErr] = useState("");

  // ②条件を指定して新しく作る
  const [making, setMaking] = useState(false);
  const [mWord, setMWord] = useState("");
  const [mExact, setMExact] = useState(false);
  const [mChips, setMChips] = useState<string[]>([]);
  const [mPeriod, setMPeriod] = useState<Period>(EMPTY_PERIOD);
  const [mErr, setMErr] = useState("");

  const built = buildQuery({
    word: mWord,
    exact: mExact,
    chips: s.chips,
    detail: EMPTY_DETAIL,
    period: EMPTY_PERIOD,
    onlyChipIds: mChips,
  });
  const firstChip = s.chips.find((c) => mChips.includes(c.id))?.label ?? "";
  const baseName = mWord.trim() || firstChip;
  const autoName = [name.trim(), baseName].filter(Boolean).join("：");

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    setItems(n);
  };

  const makeItem = () => {
    if (!built.text)
      return setMErr("検索語か条件ボタンを1つ以上選んでください");
    if (periodInverted(mPeriod)) return setMErr("開始日が終了日より後です");
    const fav = {
      id: nid("f"),
      name: autoName,
      query: built.text,
      period: mPeriod,
      engine: "x" as const,
      last: "未実行",
    };
    s.saveFav(fav);
    setItems((v) => [...v, favToItem(fav)]);
    setMaking(false);
    setMWord("");
    setMExact(false);
    setMChips([]);
    setMPeriod(EMPTY_PERIOD);
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
          className="w-full rounded-lg border bg-background px-3 py-2"
        />
      </label>

      <div className="space-y-1 text-sm">
        <div className="font-medium">
          中身の検索（{items.length}個。順に開きます）
        </div>
        {items.length === 0 && (
          <p className="text-muted-foreground">
            まだありません。下の方法で追加してください。
          </p>
        )}
        <ol className="space-y-1">
          {items.map((it, i) => (
            <li
              key={`${it.label}${i}`}
              className="flex items-center gap-1 rounded border px-2 py-1"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  {i + 1}. {it.label}
                </span>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {savedText(it) || "（条件なし）"}
                </span>
              </span>
              <button
                aria-label={`${it.label}を上へ`}
                onClick={() => move(i, -1)}
                className="px-1 focus-visible:ring-2 focus-visible:ring-ring"
              >
                ↑
              </button>
              <button
                aria-label={`${it.label}を下へ`}
                onClick={() => move(i, 1)}
                className="px-1 focus-visible:ring-2 focus-visible:ring-ring"
              >
                ↓
              </button>
              <button
                aria-label={`${it.label}を外す`}
                onClick={() => setItems(items.filter((_, j) => j !== i))}
                className="px-1 focus-visible:ring-2 focus-visible:ring-ring"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      </div>

      <fieldset className="space-y-1 text-sm">
        <legend className="font-medium">
          ①お気に入りから追加（コピーします）
        </legend>
        {s.favs.length === 0 && (
          <p className="text-muted-foreground">
            お気に入りがありません。下の［条件を指定して新しく作る］で作れます。
          </p>
        )}
        {s.favs.map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setItems((v) => [...v, favToItem(f)])}
            >
              ＋ 追加
            </Button>
          </div>
        ))}
      </fieldset>

      {!making ? (
        <Button size="sm" variant="outline" onClick={() => setMaking(true)}>
          ②＋ 条件を指定して新しく作る
        </Button>
      ) : (
        <section
          aria-label="条件を指定して新しく作る"
          className="space-y-2 rounded-lg border p-3 text-sm"
        >
          <p className="font-medium">②条件を指定して新しく作る</p>
          <p className="text-xs text-muted-foreground">
            作った検索はお気に入りにも保存され、このいつものエゴサに入ります。名前は自動で付きます：
            <span className="font-medium">
              {autoName || "（検索語を入れると決まります）"}
            </span>
          </p>
          <div className="flex items-center gap-3">
            <input
              value={mWord}
              onChange={(ev) => setMWord(ev.target.value)}
              aria-label="検索する語"
              placeholder="検索する語"
              className="min-w-0 flex-1 rounded-full border bg-background px-3 py-1.5"
            />
            <label className="flex shrink-0 items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={mExact}
                onChange={(ev) => setMExact(ev.target.checked)}
              />
              完全一致
            </label>
          </div>
          <div
            role="group"
            aria-label="条件ボタン"
            className="flex flex-wrap gap-1.5"
          >
            {s.chips
              .filter((c) => c.visible)
              .map((c) => {
                const on = mChips.includes(c.id);
                return (
                  <button
                    key={c.id}
                    aria-pressed={on}
                    onClick={() =>
                      setMChips(
                        on
                          ? mChips.filter((x) => x !== c.id)
                          : [...mChips, c.id],
                      )
                    }
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${toggleClass(on)}`}
                  >
                    <span className="w-3 text-center">{on ? "✓" : "○"}</span>
                    {c.label}
                  </button>
                );
              })}
          </div>
          <PeriodPicker value={mPeriod} onChange={setMPeriod} />
          <code
            tabIndex={0}
            aria-label="組み立てた検索クエリ"
            className="block h-8 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs whitespace-nowrap"
          >
            {savedText({ query: built.text, period: mPeriod }) ||
              "（検索語か条件ボタンを選んでください）"}
          </code>
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
            <Button size="sm" onClick={makeItem}>
              お気に入りに保存して追加
            </Button>
          </div>
        </section>
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
            if (!items.length) return setErr("検索を1つ以上入れてください");
            s.saveGroup({
              id: group?.id ?? nid("g"),
              name: name.trim(),
              items,
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
