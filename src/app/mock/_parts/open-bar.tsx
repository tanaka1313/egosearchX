"use client";
// MOCK: 破棄予定（#61）
import { Ellipsis, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EMPTY_PERIOD, LIMITS, favToItem, type Favorite } from "./data";
import { buildQuery, periodInverted } from "./query";
import { nid, useStore } from "./store";
import { Sheet } from "./ui";

/** ［⋯］：コピー系の操作。自前の小さなポップオーバー（Esc／外側クリックで閉じる） */
function MoreMenu() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      if (!boxRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";
  const text = s.query.text;
  const act = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };
  return (
    <div ref={boxRef} className="relative">
      <Button
        ref={btnRef}
        variant="outline"
        size="lg"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="そのほかの操作"
        onClick={() => setOpen((v) => !v)}
      >
        <Ellipsis className="size-4" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full z-30 mb-1 w-52 rounded-lg border bg-background p-1 shadow-lg"
        >
          <button
            role="menuitem"
            className={item}
            onClick={act(() => {
              void navigator.clipboard?.writeText(
                `https://x.com/search?q=${encodeURIComponent(text)}&f=live`,
              );
              s.say("X の検索リンクをコピーしました");
            })}
          >
            リンクをコピー（X）
          </button>
          <button
            role="menuitem"
            className={item}
            onClick={act(() => {
              void navigator.clipboard?.writeText(
                `https://search.yahoo.co.jp/realtime/search?p=${encodeURIComponent(text)}`,
              );
              s.say(
                "Yahoo の検索リンクをコピーしました（OR→(A B) などの変換は本実装で行います）",
              );
            })}
          >
            リンクをコピー（Yahoo）
          </button>
          <button
            role="menuitem"
            className={item}
            onClick={act(() => {
              void navigator.clipboard?.writeText(text);
              s.say("クエリをコピーしました");
            })}
          >
            クエリをコピー
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * 組み立てた検索を確かめて開くところ：クエリ表示（1行固定）＋⚠＋［X で開く］［Yahoo で開く］［☆ 保存］［⋯］。
 * ホームの入力欄の直下と、詳細条件の末尾の2か所に置く（同じ状態・同じ処理。機能は1つ）。
 * 警告は⚠アイコンの件数に集約し（URL 長の警告も含む）、空の行を確保しない。
 */
export function OpenBar() {
  const s = useStore();
  const [warnOpen, setWarnOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const q = s.query;
  const warnings =
    q.text.length > LIMITS.urlWarn
      ? [
          ...q.warnings,
          `クエリが${LIMITS.urlWarn}文字を超えています（上限は未確認）`,
        ]
      : q.warnings;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <code
            tabIndex={0}
            aria-label="組み立てた検索クエリ（長いときは横にスクロール）"
            className="block h-9 min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2 py-2 font-mono text-xs leading-5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring"
          >
            {q.text || "（検索語か条件ボタンを選んでください）"}
          </code>
          {warnings.length > 0 ? (
            <button
              aria-expanded={warnOpen}
              aria-label={`警告 ${warnings.length}件`}
              onClick={() => setWarnOpen((v) => !v)}
              className="w-12 shrink-0 rounded border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            >
              ⚠ {warnings.length}
            </button>
          ) : (
            <span className="w-12 shrink-0" aria-hidden />
          )}
        </div>
        {warnOpen && warnings.length > 0 && (
          <ul className="space-y-1 rounded border p-2 text-xs">
            {warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        {/* 一番大事な操作。塗りつぶしの青で、ON の条件ボタン（枠＋薄い塗り）と区別する */}
        <Button
          size="lg"
          className="min-w-0 flex-1 text-base font-bold"
          onClick={() => s.run("X", "ホーム")}
        >
          X で開く
        </Button>
        {/* Yahoo でも検索できることを、すぐ横に見せる（主ボタンの青は X だけ） */}
        <Button
          size="lg"
          variant="outline"
          className="shrink-0 whitespace-nowrap"
          onClick={() => s.run("Yahoo", "ホーム")}
        >
          Yahoo で開く
        </Button>
        <Button
          size="lg"
          variant="outline"
          aria-label="この検索を保存"
          className="shrink-0"
          onClick={() => setSaveOpen(true)}
        >
          <Star className="size-4" />
          <span className="hidden sm:inline">保存</span>
        </Button>
        <MoreMenu />
      </div>

      {saveOpen && <SaveSheet onClose={() => setSaveOpen(false)} />}
    </div>
  );
}

/** ☆ 保存：お気に入りに保存し、同時にいつものエゴサへ追加できる */
function SaveSheet({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [name, setName] = useState(s.word ? `${s.word} の検索` : "新しい検索");
  const [target, setTarget] = useState<string>("none");
  // 新しいいつものエゴサの名前は、触るまでお気に入りの名前と同じ（入力は実質1回）
  const [newGroup, setNewGroup] = useState<string | null>(null);
  const groupName = newGroup ?? name;
  const [err, setErr] = useState("");

  // 保存するのは「期間を除いた検索文字列」と期間。条件ボタンの参照は持たない
  const queryOnly = buildQuery({
    word: s.word,
    exact: s.exact,
    chips: s.chips,
    detail: s.detail,
    period: EMPTY_PERIOD,
    extra: s.sugOn,
  }).text;

  const save = () => {
    if (!name.trim()) return setErr("名前を入力してください");
    if (target === "new" && !groupName.trim())
      return setErr("いつものエゴサの名前を入力してください");
    if (periodInverted(s.period)) return setErr("開始日が終了日より後です");
    const fav: Favorite = {
      id: nid("f"),
      name: name.trim(),
      query: queryOnly,
      period: s.period,
      engine: s.detail.engine,
      last: "未実行",
    };
    s.saveFav(fav);
    if (target === "new") {
      s.saveGroup({
        id: nid("g"),
        name: groupName.trim(),
        items: [favToItem(fav)],
        doneToday: false,
      });
    } else if (target !== "none") {
      const g = s.groups.find((x) => x.id === target);
      if (g) s.saveGroup({ ...g, items: [...g.items, favToItem(fav)] });
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
          className="w-full rounded-lg border bg-background px-3 py-2"
        />
      </label>
      <code className="block rounded bg-muted p-2 font-mono text-xs break-all">
        {s.query.text || "（条件なし）"}
      </code>
      <p className="text-xs text-muted-foreground">
        検索文字列そのものを保存します（期間は実行時の日付で計算）。条件ボタンを後から直しても、保存したものは変わりません。
      </p>
      <fieldset className="space-y-1 text-sm">
        <legend className="font-medium">
          いつものエゴサに追加（まとめて実行できます）
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
          新しいいつものエゴサを作る
        </label>
        {target === "new" && (
          <input
            value={groupName}
            onChange={(ev) => setNewGroup(ev.target.value)}
            aria-label="新しいいつものエゴサの名前（初期値はお気に入りの名前）"
            placeholder="例：配信後エゴサ"
            className="w-full rounded-lg border bg-background px-3 py-2"
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
