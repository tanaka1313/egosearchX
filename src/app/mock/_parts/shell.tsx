"use client";
// MOCK: 破棄予定（#61）
import {
  Check,
  Info,
  Menu,
  Play,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { VersionDialog } from "@/components/common/version-dialog";
import { APP_FEATURE, LIMITS, MENU } from "./data";
import { InterestPicker } from "./interest-picker";
import { useStore } from "./store";
import { toggleClass } from "./ui";

const CUR_PATH_KEY = "mock:curPath:v1";
const PREV_PATH_KEY = "mock:prevPath:v1";

/** 直前に開いていたアプリ内のページ（無ければ fallback）。キャンセルの戻り先に使う */
export function previousPath(fallback: string): string {
  return sessionStorage.getItem(PREV_PATH_KEY) ?? fallback;
}

type Lang = "ja" | "en";
const LANGS: [Lang, string][] = [
  ["ja", "日本語"],
  ["en", "English"],
];

function MenuList({
  onNavigate,
  onPalette,
  lang,
  onLang,
}: {
  onNavigate?: () => void;
  onPalette: () => void;
  lang: Lang;
  onLang: (l: Lang) => void;
}) {
  const path = usePathname();
  const { trash } = useStore();
  return (
    <ul className="space-y-1">
      {MENU.map((m) => {
        const here = path === m.href;
        return (
          <li key={m.href}>
            <Link
              href={m.href}
              onClick={onNavigate}
              aria-current={here ? "page" : undefined}
              aria-label={m.manage ? `${m.label}の管理` : undefined}
              title={
                m.manage ? `${m.label}の管理（追加・編集・削除）` : undefined
              }
              className={`flex items-center gap-2 rounded-lg px-3 py-3 text-base hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring ${here ? "bg-muted font-bold" : ""}`}
            >
              <span className="flex-1">{m.label}</span>
              {/* 管理ページの印（歯車）。文言を足さずに「管理する場所」だと示す */}
              {m.manage && (
                <Settings2
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
              {m.label === "削除済み" && trash.length > 0 && (
                <span className="rounded-full border px-2 text-xs">
                  {trash.length}
                </span>
              )}
              {here && <span className="text-xs">表示中</span>}
            </Link>
          </li>
        );
      })}
      <li>
        <button
          onClick={() => {
            onNavigate?.();
            onPalette();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-base hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Search className="size-4" />
          <span className="flex-1">コマンドパレット</span>
          <kbd className="rounded border px-1 text-xs">Ctrl/⌘+K</kbd>
        </button>
      </li>
      <li>
        <VersionDialog
          trigger={
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-base hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
              <Info className="size-4" />
              <span className="flex-1">バージョン情報</span>
            </button>
          }
        />
      </li>
      {/* 言語の切替（設定画面は置かない）。初期値はブラウザの言語 */}
      <li
        role="group"
        aria-label="言語"
        className="flex items-center gap-2 px-3 pt-3"
      >
        <span className="text-sm text-muted-foreground">言語</span>
        {LANGS.map(([v, l]) => (
          <button
            key={v}
            aria-pressed={lang === v}
            onClick={() => onLang(v)}
            className={`rounded-full px-3 py-1 text-sm ${toggleClass(lang === v)}`}
          >
            {l}
          </button>
        ))}
      </li>
    </ul>
  );
}

/**
 * 「いつものエゴサ」の帯。ヘッダーの下、全ページ（ランチャー含む）に出す。
 * 先頭の数件だけ並べ、名前は省略する（例：配信後エ…(3)）。
 * 今日済みの✓は枠を常に確保し、押しても幅が変わらないようにする。
 */
function GroupStrip() {
  const { groups, runGroup } = useStore();
  const shown = groups.slice(0, LIMITS.headerGroups);
  return (
    <div className="border-b">
      <div className="mx-auto flex h-12 max-w-2xl items-center gap-2 px-3 md:px-4">
        <span className="shrink-0 text-xs text-muted-foreground">
          いつものエゴサ
        </span>
        {/* 追加は専用ページ（詳細条件まで使うので、シートにしない） */}
        <Link
          href="/mock/groups/edit"
          aria-label="いつものエゴサを追加"
          title="いつものエゴサを追加"
          className="flex size-7 shrink-0 items-center justify-center rounded-full border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" />
        </Link>
        {groups.length === 0 ? (
          <span
            title="保存した検索を、1タップでまとめて開けます（［＋］で作成）"
            className="min-w-0 truncate text-sm text-muted-foreground"
          >
            まとめて1タップで開けます
          </span>
        ) : (
          <div
            role="group"
            aria-label="いつものエゴサ"
            className="flex min-w-0 flex-1 items-center gap-1.5"
          >
            {shown.map((g) => (
              <button
                key={g.id}
                onClick={() => runGroup(g.id)}
                title={`${g.name}（${g.items.length}）${g.doneToday ? "：今日は済" : ""}`}
                aria-label={`${g.name}（${g.items.length}個）を実行${g.doneToday ? "（今日は済）" : ""}`}
                className="flex min-w-0 items-center gap-1 rounded-full border-2 px-2.5 py-1 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Play className="size-3.5 shrink-0" />
                <span className="max-w-[4rem] truncate sm:max-w-[9rem]">
                  {g.name}
                </span>
                <span className="shrink-0">({g.items.length})</span>
                <span className="flex size-3.5 shrink-0 items-center justify-center">
                  {g.doneToday && <Check className="size-3.5" />}
                </span>
              </button>
            ))}
            <Link
              href="/mock/groups"
              className="ml-auto hidden shrink-0 text-sm text-muted-foreground underline underline-offset-4 sm:inline"
            >
              一覧
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** フッター：最後の履歴を1件だけ固定表示し、その下に非公式の表記を常に出す */
function Footer() {
  const { history, say } = useStore();
  const last = history[0];
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t bg-background px-3 pt-2 pb-1 text-xs">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-muted-foreground">前回</span>
        {last ? (
          <>
            <span className="shrink-0">{last.at}</span>
            <span className="min-w-0 flex-1 truncate font-mono">
              {last.word || last.query}
            </span>
            <button
              onClick={() => say("再実行しました（ダミー）")}
              className="shrink-0 rounded border px-2 py-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              再実行
            </button>
          </>
        ) : (
          <span className="flex-1 text-muted-foreground">
            実行するとここに残ります
          </span>
        )}
        <Link
          href="/mock/history"
          className="shrink-0 underline underline-offset-4"
        >
          履歴 →
        </Link>
      </div>
      {/* 公式と誤認されないよう、非公式であることを常に示す（CLAUDE.md） */}
      <p className="truncate pt-1 text-[11px] text-muted-foreground">
        ファンが作った非公式のツールです
      </p>
    </footer>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [lang, setLang] = useState<Lang>("ja");
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { toast, say } = useStore();
  // モックは日本語のみ。選んだ状態だけを持ち、文言は切り替えない
  const onLang = (l: Lang) => {
    setLang(l);
    if (l === "en")
      say("英語の文言は本実装で切り替わります（モックは日本語のみ）");
  };
  const path = usePathname();
  // ランチャーは画面に集中させるため、フッターを出さない（いつものエゴサは全ページに出す）
  const launcher = path === "/mock/launch";

  // 直前に開いていたアプリ内のページを記録する（キャンセルで遷移前の画面へ戻るため。外部サイトへは戻らない）
  useEffect(() => {
    const cur = sessionStorage.getItem(CUR_PATH_KEY);
    if (cur && cur !== path) sessionStorage.setItem(PREV_PATH_KEY, cur);
    sessionStorage.setItem(CUR_PATH_KEY, path);
  }, [path]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setPalette(true);
      } else if (ev.key === "Escape") {
        setPalette(false);
        setOpen((o) => {
          if (o) toggleRef.current?.focus();
          return false;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)]">
      {/* 1280px 以上は常時表示のサイドバー */}
      <aside
        aria-label="メニュー（常時表示）"
        className="hidden w-64 shrink-0 border-r p-3 xl:block"
      >
        <p className="mb-3 px-3 font-bold">Hololive EgoSearch</p>
        <MenuList
          onPalette={() => setPalette(true)}
          lang={lang}
          onLang={onLang}
        />
      </aside>

      <div className={`min-w-0 flex-1 ${launcher ? "" : "pb-20"}`}>
        {/* ヘッダーは sticky にしない（バナーの下に潜らせない） */}
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <button
            ref={toggleRef}
            aria-expanded={open}
            aria-controls="mock-drawer"
            aria-label="メニューを開く"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
          >
            <Menu className="size-6" />
          </button>
          {/* サイト名 ＝ ［興味の対象▾］ EgoSearch。興味の対象はここでいつでも切り替える */}
          <InterestPicker />
          <Link href="/mock" className="shrink-0 font-bold">
            EgoSearch
          </Link>
          <span
            aria-label={`機能：${APP_FEATURE}`}
            className="min-w-0 truncate rounded-full border px-2.5 py-0.5 text-sm"
          >
            {APP_FEATURE}
          </span>
        </header>
        <GroupStrip />
        {children}
      </div>
      {!launcher && <Footer />}

      {open && (
        <div className="fixed inset-0 z-[60] flex xl:hidden">
          <nav
            id="mock-drawer"
            aria-label="メニュー"
            className="flex h-full w-[70%] max-w-[22.5rem] flex-col overflow-auto border-r bg-background p-3 shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold">Hololive EgoSearch</span>
              <button
                ref={closeRef}
                aria-label="メニューを閉じる"
                onClick={close}
                className="rounded-lg p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-5" />
              </button>
            </div>
            <MenuList
              onNavigate={() => setOpen(false)}
              onPalette={() => setPalette(true)}
              lang={lang}
              onLang={onLang}
            />
          </nav>
          <button
            aria-label="メニューの外を押して閉じる"
            tabIndex={-1}
            onClick={close}
            className="flex-1 bg-black/40"
          />
        </div>
      )}

      {palette && <Palette onClose={() => setPalette(false)} />}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-20 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-foreground px-4 py-3 text-sm text-background shadow-xl"
        >
          <span className="flex-1">{toast.msg}</span>
          {toast.undo && (
            <button
              onClick={toast.undo}
              className="rounded border border-background/50 px-2 py-1 font-bold underline"
            >
              元に戻す
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const { favs, groups, runFav, runGroup } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const items = [
    ...groups.map((g) => ({
      key: `g${g.id}`,
      label: `▶ いつものエゴサ：${g.name}（${g.items.length}個）`,
      run: () => runGroup(g.id),
    })),
    ...favs.map((f) => ({
      key: `f${f.id}`,
      label: `▶ お気に入り：${f.name}`,
      run: () => runFav(f.id),
    })),
    ...MENU.map((m) => ({
      key: `m${m.href}`,
      label: `→ ${m.label}へ移動`,
      run: () => router.push(m.href),
    })),
  ].filter((i) => i.label.includes(q));

  const go = (run: () => void) => {
    run();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-24"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="コマンドパレット"
        className="w-full max-w-md rounded-xl border bg-background p-3 shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" && items[0]) go(items[0].run);
          }}
          aria-label="実行・移動先を絞り込み"
          placeholder="名前を入力、Enter で実行、Esc で閉じる"
          className="w-full rounded-lg border px-3 py-2"
        />
        <ul className="mt-2 max-h-80 space-y-1 overflow-auto">
          {items.map((i) => (
            <li key={i.key}>
              <button
                onClick={() => go(i.run)}
                className="w-full rounded px-2 py-2 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                {i.label}
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-2 py-1 text-sm text-muted-foreground">
              該当なし
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
