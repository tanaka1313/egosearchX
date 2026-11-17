"use client";
// MOCK: 破棄予定（#61）
import { ChevronDown, ChevronRight, Ellipsis } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { ChipRow } from "./_parts/chips";
import { DetailPanel } from "./_parts/detail-panel";
import { LIMITS, type Period } from "./_parts/data";
import { PERIOD_LABEL, detailTokens } from "./_parts/query";
import { favQuery } from "./_parts/rows";
import { useStore } from "./_parts/store";
import { EmptyState, Sheet } from "./_parts/ui";

// 日付・N日前からは「詳細条件」で指定する（ここには置かない）
const PERIODS: Period["kind"][] = ["none", "today", "yday", "last"];
const FAV_OPEN_KEY = "mock6:favOpen:v1";

/** 詳細条件で指定中の期間を、注記行に出す文言にする */
function periodNote(p: Period): string {
  if (p.kind === "last")
    return "前回実行（昨日 22:30）からの新着だけを開きます。履歴が無い初回は「指定なし」です。";
  if (p.kind === "days" && p.days) return `詳細条件で指定中：${p.days}日前から`;
  if (p.kind === "date" && (p.from || p.to))
    return `詳細条件で指定中：${p.from || "…"}〜${p.to || "…"}（終了日を含む）`;
  return "";
}

const favOpenListeners = new Set<() => void>();
function subscribeFavOpen(fn: () => void) {
  favOpenListeners.add(fn);
  return () => {
    favOpenListeners.delete(fn);
  };
}

/** お気に入り：閉じた1行。開くと「押して実行」だけの一覧。開閉は localStorage に記憶する */
function FavoritesFold() {
  const s = useStore();
  // サーバー側は閉じた状態（ハイドレーションのずれを避ける）。クライアントで localStorage を読む
  const open = useSyncExternalStore(
    subscribeFavOpen,
    () => localStorage.getItem(FAV_OPEN_KEY) === "1",
    () => false,
  );
  const toggle = () => {
    localStorage.setItem(FAV_OPEN_KEY, open ? "0" : "1");
    favOpenListeners.forEach((fn) => fn());
  };
  return (
    <section aria-label="お気に入り" className="border-t pt-3">
      <button
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-sm text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        <span>☆ お気に入り（{s.favs.length}）</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {s.favs.length === 0 && (
            <EmptyState text="条件を触って気に入ったら ☆ 保存 でここに入ります" />
          )}
          <ul className="space-y-2">
            {s.favs.slice(0, 4).map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-2 rounded-lg border p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{f.name}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    {favQuery(f, s.chips).text || "（条件なし）"}
                  </div>
                </div>
                <Button size="sm" onClick={() => s.runFav(f.id)}>
                  ▶ 実行
                </Button>
              </li>
            ))}
          </ul>
          <Link
            href="/mock/mock6/favorites"
            className="block text-right text-sm text-muted-foreground underline underline-offset-4"
          >
            お気に入りを編集 →
          </Link>
        </div>
      )}
    </section>
  );
}

/** ［⋯］：使用頻度の低い操作。自前の小さなポップオーバー（Esc／外側クリックで閉じる） */
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
            onClick={act(() => s.run("Yahoo", "ホーム"))}
          >
            Yahoo で開く
          </button>
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

export default function Mock6Home() {
  const s = useStore();
  const [warnOpen, setWarnOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const q = s.query;
  const urlLong = q.text.length > LIMITS.urlWarn;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-3 md:p-4">
      <section aria-label="検索の組み立て" className="space-y-3">
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
            className={`shrink-0 rounded-full border px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring ${s.exact ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
          >
            完全一致
          </button>
        </div>

        <ChipRow />

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
                className={`rounded-full border px-2.5 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring ${on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
              >
                {PERIOD_LABEL[k]}
              </button>
            );
          })}
          {/* 注記は2行分の高さを常に確保し、押しても下の要素が動かないようにする */}
          <span className="block min-h-8 basis-full text-xs text-muted-foreground">
            {periodNote(s.period)}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <code
              tabIndex={0}
              aria-label="組み立てた検索クエリ（長いときは横にスクロール）"
              className="block h-9 min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2 py-2 font-mono text-xs leading-5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring"
            >
              {q.text || "（検索語か条件ボタンを選んでください）"}
            </code>
            {q.warnings.length > 0 ? (
              <button
                aria-expanded={warnOpen}
                aria-label={`警告 ${q.warnings.length}件`}
                onClick={() => setWarnOpen((v) => !v)}
                className="w-12 shrink-0 rounded border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring"
              >
                ⚠ {q.warnings.length}
              </button>
            ) : (
              <span className="w-12 shrink-0" aria-hidden />
            )}
          </div>
          {warnOpen && q.warnings.length > 0 && (
            <ul className="space-y-1 rounded border p-2 text-xs">
              {q.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          )}
          <p className="min-h-4 text-xs">
            {urlLong &&
              `⚠ クエリが${LIMITS.urlWarn}文字を超えています（上限は未確認）`}
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => s.run("X", "ホーム")}>X で開く</Button>
          <Button variant="outline" onClick={() => setSaveOpen(true)}>
            ☆ 保存
          </Button>
          <MoreMenu />
        </div>
      </section>

      <DetailPanel />

      <FavoritesFold />

      {saveOpen && <SaveSheet onClose={() => setSaveOpen(false)} />}
    </main>
  );
}

/** ☆ 保存：お気に入りに保存し、同時にいつものエゴサへ追加できる */
function SaveSheet({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [name, setName] = useState(s.word ? `${s.word} の検索` : "新しい検索");
  const [target, setTarget] = useState<string>("none");
  const [newGroup, setNewGroup] = useState("");
  const [err, setErr] = useState("");

  const save = () => {
    if (!name.trim()) return setErr("名前を入力してください");
    if (target === "new" && !newGroup.trim())
      return setErr("いつものエゴサの名前を入力してください");
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
            value={newGroup}
            onChange={(ev) => setNewGroup(ev.target.value)}
            aria-label="新しいいつものエゴサの名前"
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
