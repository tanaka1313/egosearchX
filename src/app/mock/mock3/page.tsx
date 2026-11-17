"use client";
// MOCK: 破棄予定（#61）
import { Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mono } from "../_components/mock-dialog";

type Chip = { id: string; label: string; token: string };
const CHIPS: Chip[] = [
  { id: "exact", label: "完全一致", token: "" },
  { id: "noRt", label: "RTを除く", token: "-filter:retweets" },
  { id: "reply", label: "返信のみ", token: "filter:replies" },
  { id: "media", label: "画像つき", token: "filter:images" },
  { id: "yday", label: "昨日から", token: "since:2026-11-16" },
];

type Fav = { id: number; name: string; word: string; chips: string[] };

function build(word: string, chips: string[]) {
  const w = word.trim() || "（語を入力）";
  const base = chips.includes("exact") ? `"${w}"` : w;
  const rest = CHIPS.filter((c) => c.token && chips.includes(c.id)).map(
    (c) => c.token,
  );
  return [base, ...rest].join(" ");
}

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export default function Mock3() {
  const [word, setWord] = useState("メンバーA");
  const [chips, setChips] = useState<string[]>(["noRt"]);
  const [favs, setFavs] = useState<Fav[]>([
    { id: 1, name: "名前エゴサ", word: "メンバーA", chips: ["exact", "noRt"] },
  ]);
  const [nextId, setNextId] = useState(2);
  const [edit, setEdit] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const q = build(word, chips);
  const editing = favs.find((f) => f.id === edit);
  const patch = (id: number, p: Partial<Fav>) =>
    setFavs(favs.map((f) => (f.id === id ? { ...f, ...p } : f)));

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-4">
      <section className="space-y-3">
        <input
          value={word}
          onChange={(ev) => setWord(ev.target.value)}
          aria-label="検索する語"
          placeholder="検索する語を入力"
          className="w-full rounded-full border-2 px-5 py-3 text-lg"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="条件">
          {CHIPS.map((c) => {
            const on = chips.includes(c.id);
            return (
              <button
                key={c.id}
                aria-pressed={on}
                onClick={() => setChips(toggle(chips, c.id))}
                className={`rounded-full border px-3 py-1 text-sm ${on ? "bg-foreground text-background" : ""}`}
              >
                {on ? "✓ " : ""}
                {c.label}
              </button>
            );
          })}
        </div>
        <Mono>{q}</Mono>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setMsg("X で開きました（ダミー）")}>
            X で開く
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFavs([
                ...favs,
                { id: nextId, name: `お気に入り ${nextId}`, word, chips },
              ]);
              setNextId(nextId + 1);
              setMsg("お気に入りに追加しました");
            }}
          >
            <Star className="size-4" /> お気に入りに追加
          </Button>
        </div>
        {msg && (
          <p
            role="status"
            className="rounded border bg-muted px-3 py-2 text-sm"
          >
            {msg}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">お気に入り</h2>
        {favs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            条件を触って気に入ったら ☆ で保存できます
          </p>
        )}
        <ul className="space-y-2">
          {favs.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-lg border p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">{f.name}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {build(f.word, f.chips)}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setMsg(`「${f.name}」を開きました（ダミー）`)}
              >
                実行
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEdit(f.id)}>
                編集
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {editing && (
        <section
          className="space-y-2 rounded-lg border p-3"
          aria-label="お気に入りの編集"
        >
          <h2 className="font-bold">編集：{editing.name}</h2>
          <input
            value={editing.name}
            aria-label="名前"
            onChange={(ev) => patch(editing.id, { name: ev.target.value })}
            className="w-full rounded border px-2 py-1 text-sm"
          />
          <ul className="space-y-1">
            <li className="flex items-center gap-2 rounded border px-2 py-1 text-sm">
              <input
                type="checkbox"
                defaultChecked
                aria-label="語を有効にする"
              />
              <span className="flex-1">語：{editing.word}</span>
            </li>
            {CHIPS.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded border px-2 py-1 text-sm"
              >
                <input
                  type="checkbox"
                  aria-label={`${c.label}を有効にする`}
                  checked={editing.chips.includes(c.id)}
                  onChange={() =>
                    patch(editing.id, { chips: toggle(editing.chips, c.id) })
                  }
                />
                <span className="flex-1">{c.label}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setEdit(null)}>
              閉じる
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFavs(favs.filter((f) => f.id !== editing.id));
                setEdit(null);
              }}
            >
              お気に入りから外す
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
