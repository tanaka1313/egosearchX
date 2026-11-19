"use client";

import { Ellipsis, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/common/toast";
import { Button } from "@/components/ui/button";
import { ENGINE_LABEL, ENGINE_SHORT } from "@/messages";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { QueryPreview } from "./query-preview";
import { SaveSheet } from "./save-sheet";
import { useSearchScope } from "./search-scope";

/**
 * ［X で開く］［Yahoo で開く］（画面仕様書 3.6）。SearchScope の検索を開く（ホームでもいつものエゴサの編集でも同じ部品）。
 * ［Yahoo で開く］は短い名前を使い、警告の印は付けない（警告は「条件」の枠の一番下）。
 * 検索語も条件も無い・期間が逆のとき（blockers）は押せない。primary：X を青の塗りつぶしにするか（その画面の一番大事な操作のとき）。
 */
export function OpenButtons({ primary = true }: { primary?: boolean }) {
  const { run, built } = useSearchScope();
  const { t } = useI18n();
  const blocked = built.blockers.length > 0;
  return (
    <>
      <Button
        type="button"
        size="lg"
        variant={primary ? "default" : "outline"}
        disabled={blocked}
        className={`min-w-0 flex-1 ${primary ? "text-base font-bold" : ""}`}
        onClick={() => run("x")}
      >
        {t.search.open.openIn(ENGINE_SHORT.x)}
      </Button>
      <Button
        type="button"
        size="lg"
        variant="outline"
        disabled={blocked}
        className="shrink-0 whitespace-nowrap"
        title={t.search.open.yahooTitle}
        onClick={() => run("yahoo")}
      >
        {t.search.open.openIn(ENGINE_SHORT.yahoo)}
      </Button>
    </>
  );
}

/** ［⋯］：リンクのコピー（X／Yahoo）。Esc か外側で閉じ、Esc のときはボタンにフォーカスを戻す */
function MoreMenu() {
  const api = useApi();
  const { t } = useI18n();
  const toast = useToast();
  const { built } = useSearchScope();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const blocked = built.blockers.length > 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      if (!boxRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** 開く検索の URL をコピーする（履歴には残さない。docs/api-spec.md 4.6） */
  const copy = (engine: "x" | "yahoo") => {
    const url = api.url.plan([{ query: built.stored, engine }]).targets[0]?.url;
    if (url) {
      void navigator.clipboard?.writeText(url);
      toast.show(t.search.open.linkCopied(ENGINE_LABEL[engine]));
    }
    setOpen(false);
  };

  const item =
    "block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div ref={boxRef} className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="lg"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.search.open.more}
        onClick={() => setOpen((v) => !v)}
      >
        <Ellipsis className="size-4" aria-hidden />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full z-30 mb-1 w-52 rounded-lg border bg-background p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={blocked}
            className={item}
            onClick={() => copy("x")}
          >
            {t.search.open.copyX}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={blocked}
            className={item}
            onClick={() => copy("yahoo")}
          >
            {t.search.open.copyYahoo}
          </button>
          {/* クエリのコピーは、クエリ表示の［コピー］で行う */}
        </div>
      )}
    </div>
  );
}

/**
 * 組み立てた検索を確かめて開くところ（画面仕様書 3.7）：クエリ表示＋［コピー］＋［X で開く］［Yahoo で開く］［☆ 保存］［⋯］。
 * ホームの入力欄の直下と、詳細条件の末尾の2か所に置く（同じ状態・同じ処理。機能は1つ）。
 * 警告は「条件」の枠の一番下（WarningNote）に出す。
 */
export function OpenBar() {
  const { t } = useI18n();
  const [saveOpen, setSaveOpen] = useState(false);
  return (
    <div className="space-y-2">
      <QueryPreview />
      <div className="flex gap-2">
        <OpenButtons />
        <SaveSheet
          open={saveOpen}
          onOpenChange={setSaveOpen}
          trigger={
            <Button
              type="button"
              size="lg"
              variant="outline"
              aria-label={t.search.open.saveLabel}
              className="shrink-0"
            >
              <Star className="size-4" aria-hidden />
              <span className="hidden sm:inline">{t.search.open.save}</span>
            </Button>
          }
        />
        <MoreMenu />
      </div>
    </div>
  );
}
