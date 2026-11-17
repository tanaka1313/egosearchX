"use client";
// MOCK: 破棄予定（#61）
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChipEditor } from "./_parts/chip-editor";
import { ChipRow } from "./_parts/chips";
import { DetailPanel } from "./_parts/detail-panel";
import { LIMITS, type Chip, type Period } from "./_parts/data";
import { PERIOD_LABEL, detailTokens } from "./_parts/query";
import { FavoriteRow, GroupButton, HistoryRow } from "./_parts/rows";
import { useStore } from "./_parts/store";
import { EmptyState, Sheet } from "./_parts/ui";

const PERIODS: Period["kind"][] = ["none", "today", "yday", "last", "date"];

export default function Mock6Home() {
  const s = useStore();
  const [editing, setEditing] = useState<Chip | "new" | null>(null);
  const [warnOpen, setWarnOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [groupForm, setGroupForm] = useState(false);

  const full = s.chips.length >= LIMITS.chips;
  const q = s.query;

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-3 md:p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* 大タイル：検索の組み立て（PC）。スマホでは先頭のグループの下に続く */}
        <div className="order-2 space-y-3 md:order-1">
          <section
            aria-label="検索の組み立て"
            className="space-y-3 rounded-2xl border p-3"
          >
            <div className="flex gap-2">
              <input
                value={s.word}
                onChange={(ev) => s.setWord(ev.target.value)}
                aria-label="検索する語"
                placeholder="検索する語を入力"
                className="min-w-0 flex-1 rounded-full border-2 px-4 py-2.5 text-lg"
              />
              <button
                aria-pressed={s.exact}
                onClick={() => s.setExact(!s.exact)}
                className={`shrink-0 rounded-full border px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring ${s.exact ? "bg-foreground text-background" : ""}`}
              >
                {s.exact ? "✓ " : ""}完全一致
              </button>
            </div>

            <div className="space-y-2">
              <ChipRow onEdit={(c) => setEditing(c)} />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {s.chips.length}/{LIMITS.chips}
                </span>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={full}
                  onClick={() => setEditing("new")}
                >
                  ＋ ボタンを作る
                </Button>
                {full && <span>上限です。不要なボタンを削除してください</span>}
                <Link
                  href="/mock/mock6/buttons"
                  className="ml-auto underline underline-offset-4"
                >
                  すべて管理
                </Link>
              </div>
            </div>

            <div
              className="flex flex-wrap items-center gap-1"
              role="group"
              aria-label="期間"
            >
              <span className="mr-1 text-sm font-medium">期間</span>
              {PERIODS.map((k) => {
                const on = s.period.kind === k;
                return (
                  <button
                    key={k}
                    aria-pressed={on}
                    onClick={() => s.setPeriod({ ...s.period, kind: k })}
                    className={`rounded-full border px-2.5 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring ${on ? "bg-foreground text-background" : ""}`}
                  >
                    {on ? "✓ " : ""}
                    {k === "date" ? "日付…" : PERIOD_LABEL[k]}
                  </button>
                );
              })}
              {s.period.kind === "last" && (
                <span className="basis-full text-xs text-muted-foreground">
                  前回実行（昨日
                  22:30）からの新着だけを開きます。履歴が無い初回は「指定なし」です。
                </span>
              )}
              {s.period.kind === "date" && (
                <span className="basis-full text-xs text-muted-foreground">
                  日付は詳細設定の「期間」で指定します（終了日を含む）。
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <code className="block min-w-0 flex-1 rounded bg-muted p-2 font-mono text-xs break-all">
                  {q.text || "（検索語か条件ボタンを選んでください）"}
                </code>
                {q.warnings.length > 0 && (
                  <button
                    aria-expanded={warnOpen}
                    aria-label={`警告 ${q.warnings.length}件`}
                    onClick={() => setWarnOpen((v) => !v)}
                    className="shrink-0 rounded border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    ⚠ {q.warnings.length}
                  </button>
                )}
              </div>
              {warnOpen && q.warnings.length > 0 && (
                <ul className="space-y-1 rounded border p-2 text-xs">
                  {q.warnings.map((w) => (
                    <li key={w}>⚠ {w}</li>
                  ))}
                </ul>
              )}
              {q.text.length > LIMITS.urlWarn && (
                <p className="text-xs">
                  ⚠ クエリが{LIMITS.urlWarn}
                  文字を超えています（上限は未確認）
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => s.run("X", "ホーム")}>X で開く</Button>
              <Button
                variant="outline"
                onClick={() => s.run("Yahoo", "ホーム")}
              >
                Yahoo で開く
              </Button>
              <Button variant="outline" onClick={() => setSaveOpen(true)}>
                ☆ 保存
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard?.writeText(q.text);
                  s.say("クエリをコピーしました");
                }}
              >
                コピー
              </Button>
            </div>
            {s.notice && (
              <p role="status" className="text-xs">
                {s.notice}
              </p>
            )}
          </section>

          <DetailPanel />
        </div>

        {/* 小タイル：いつものエゴサ／お気に入り／履歴 */}
        <div className="order-1 space-y-3 md:order-2">
          <section className="space-y-2 rounded-2xl border p-3">
            <h2 className="font-bold">いつものエゴサ</h2>
            {s.groups.length === 0 ? (
              <EmptyState text="配信後などのまとめ実行を作れます">
                <Button size="sm" onClick={() => setGroupForm(true)}>
                  ＋ グループを作る
                </Button>
              </EmptyState>
            ) : (
              <div className="flex flex-wrap gap-2">
                {s.groups.map((g) => (
                  <GroupButton key={g.id} group={g} />
                ))}
                <button
                  aria-label="エゴサグループを作る"
                  onClick={() => setGroupForm(true)}
                  className="rounded-xl border-2 border-dashed px-3 py-2 text-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  ＋
                </button>
              </div>
            )}
          </section>

          <section className="space-y-2 rounded-2xl border p-3">
            <div className="flex items-center">
              <h2 className="font-bold">お気に入り</h2>
              <Link
                href="/mock/mock6/favorites"
                className="ml-auto text-sm underline underline-offset-4"
              >
                すべて見る
              </Link>
            </div>
            {s.favs.length === 0 && (
              <EmptyState text="条件を触って気に入ったら ☆ 保存 でここに入ります" />
            )}
            <ul className="space-y-2">
              {s.favs.slice(0, 4).map((f) => (
                <FavoriteRow key={f.id} fav={f} />
              ))}
            </ul>
          </section>

          <section className="space-y-2 rounded-2xl border p-3">
            <div className="flex items-center">
              <h2 className="font-bold">最近の履歴</h2>
              <Link
                href="/mock/mock6/history"
                className="ml-auto text-sm underline underline-offset-4"
              >
                すべて見る
              </Link>
            </div>
            {s.history.length === 0 && (
              <EmptyState text="実行するとここに残ります" />
            )}
            <ul className="space-y-2">
              {s.history.slice(0, 3).map((h) => (
                <HistoryRow key={h.id} h={h} />
              ))}
            </ul>
          </section>
        </div>
      </div>

      {editing && (
        <ChipEditor
          chip={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {saveOpen && <SaveSheet onClose={() => setSaveOpen(false)} />}
      {groupForm && <GroupSheet onClose={() => setGroupForm(false)} />}
    </main>
  );
}

/** ☆ 保存：お気に入りに保存し、同時にグループへ追加できる */
function SaveSheet({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [name, setName] = useState(s.word ? `${s.word} の検索` : "新しい検索");
  const [target, setTarget] = useState<string>("none");
  const [newGroup, setNewGroup] = useState("");
  const [err, setErr] = useState("");

  const save = () => {
    if (!name.trim()) return setErr("名前を入力してください");
    if (target === "new" && !newGroup.trim())
      return setErr("グループ名を入力してください");
    const id = `f${Date.now()}`;
    s.saveFav({
      id,
      name: name.trim(),
      word: s.word,
      exact: s.exact,
      chipIds: s.chips.filter((c) => c.on).map((c) => c.id),
      extra: detailTokens(s.detail).filter(
        (x) => !s.detail.offTokens.includes(x),
      ),
      period: s.period.kind,
      engine: s.detail.engine,
      last: "未実行",
    });
    if (target === "new") {
      s.saveGroup({
        id: `g${Date.now()}`,
        name: newGroup.trim(),
        favIds: [id],
        doneToday: false,
      });
    } else if (target !== "none") {
      const g = s.groups.find((x) => x.id === target);
      if (g) s.saveGroup({ ...g, favIds: [...g.favIds, id] });
    }
    onClose();
  };

  return (
    <Sheet title="この検索を保存" onClose={onClose}>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">お気に入りの名前</span>
        <input
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        />
      </label>
      <code className="block rounded bg-muted p-2 font-mono text-xs break-all">
        {s.query.text || "（条件なし）"}
      </code>
      <fieldset className="space-y-1 text-sm">
        <legend className="font-medium">
          グループに追加（まとめて実行できます）
        </legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="tg"
            checked={target === "none"}
            onChange={() => setTarget("none")}
          />
          追加しない
        </label>
        {s.groups.map((g) => (
          <label key={g.id} className="flex items-center gap-2">
            <input
              type="radio"
              name="tg"
              checked={target === g.id}
              onChange={() => setTarget(g.id)}
            />
            「{g.name}」に追加
          </label>
        ))}
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="tg"
            checked={target === "new"}
            onChange={() => setTarget("new")}
          />
          新しいグループを作る
        </label>
        {target === "new" && (
          <input
            value={newGroup}
            onChange={(ev) => setNewGroup(ev.target.value)}
            aria-label="新しいグループ名"
            placeholder="例：配信後エゴサ"
            className="w-full rounded-lg border px-3 py-2"
          />
        )}
      </fieldset>
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

/** エゴサグループの作成（ホームの［＋］） */
function GroupSheet({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [name, setName] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [err, setErr] = useState("");
  return (
    <Sheet title="エゴサグループを作る" onClose={onClose}>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">グループ名</span>
        <input
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          placeholder="例：配信後エゴサ"
          className="w-full rounded-lg border px-3 py-2"
        />
      </label>
      <fieldset className="space-y-1 text-sm">
        <legend className="font-medium">含めるお気に入り</legend>
        {s.favs.length === 0 && (
          <p className="text-muted-foreground">
            先に ☆ 保存 でお気に入りを作ってください
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
            if (!name.trim()) return setErr("グループ名を入力してください");
            if (!sel.length) return setErr("お気に入りを1つ以上選んでください");
            s.saveGroup({
              id: `g${Date.now()}`,
              name: name.trim(),
              favIds: sel,
              doneToday: false,
            });
            onClose();
          }}
        >
          作成
        </Button>
      </div>
    </Sheet>
  );
}
