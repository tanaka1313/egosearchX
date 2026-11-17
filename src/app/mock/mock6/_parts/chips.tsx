"use client";
// MOCK: 破棄予定（#61）
import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { LIMITS, type Chip } from "./data";
import { chipTokens } from "./query";
import { useStore } from "./store";

/**
 * 条件ボタン。押すと ON/OFF が切り替わるだけ（編集・削除・並べ替えは「条件ボタンの編集」ページ）。
 * ON/OFF でボタンの大きさが変わらないよう、アイコン枠・枠線の太さ・文字の太さを揃える。
 * 「新」バッジは重ねて置き、幅に含めない。
 */
export function ToggleChip({ chip }: { chip: Chip }) {
  const { toggleChip } = useStore();
  return (
    <button
      data-chip={chip.id}
      aria-pressed={chip.on}
      onClick={() => toggleChip(chip.id)}
      title={chipTokens(chip).join(" ")}
      className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-ring ${chip.on ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground"}`}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {chip.on ? (
          <Check className="size-4" aria-label="ON" />
        ) : (
          <Circle className="size-3.5" aria-label="OFF" />
        )}
      </span>
      {chip.label}
      {chip.isNew && (
        <span className="absolute -top-1.5 right-2 rounded bg-amber-300 px-1 text-[10px] leading-4 font-bold text-amber-950">
          新
        </span>
      )}
    </button>
  );
}

/** サジェスト検索条件。条件ボタンと同じ大きさで ON/OFF（この検索にだけ足す。破線枠で区別する） */
function SuggestChip({ token }: { token: string }) {
  const { sugOn, toggleSuggestion } = useStore();
  const on = sugOn.includes(token);
  return (
    <button
      aria-pressed={on}
      onClick={() => toggleSuggestion(token)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:ring-ring ${on ? "border-foreground bg-foreground text-background" : "border-dashed border-border bg-background text-muted-foreground"}`}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {on ? (
          <Check className="size-4" aria-label="ON" />
        ) : (
          <Circle className="size-3.5" aria-label="OFF" />
        )}
      </span>
      {token}
    </button>
  );
}

/**
 * 条件ボタン列。3行目以降は［もっと開く（+N）］で隠す。
 * 閉じた状態では、2行目の末尾に［もっと開く］と「ボタンを編集 →」が収まるよう、入りきらないボタンを隠す
 * （隠したボタンは display:none なのでフォーカスも当たらない）。
 * 開いた後は［閉じる］を出さず、サジェスト検索条件を下に出す。「ボタンを編集 →」は常に、並びの最後の行の右端に置く。
 */
export function ChipRow() {
  const { chips, suggestions } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLAnchorElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const more = moreRef.current;
    const edit = editRef.current;
    if (!box || !more || !edit) return;
    const calc = () => {
      const kids = Array.from(box.querySelectorAll<HTMLElement>("[data-chip]"));
      const rows = (els: HTMLElement[]) =>
        new Set(els.map((k) => k.offsetTop)).size;
      kids.forEach((k) => (k.style.display = ""));
      more.style.display = "none";
      if (expanded || rows([...kids, edit]) <= LIMITS.foldRows) {
        setHidden(0);
        return;
      }
      // 2行に収まらない：隠す数を、［もっと開く］と編集リンクも2行に収まるまで増やす
      more.style.display = "";
      let n = kids.length;
      while (n > 0) {
        kids.forEach((k, i) => (k.style.display = i < n ? "" : "none"));
        if (rows([...kids.slice(0, n), more, edit]) <= LIMITS.foldRows) break;
        n--;
      }
      setHidden(kids.length - n);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(box);
    return () => ro.disconnect();
  }, [chips, expanded]);

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        role="group"
        aria-label="条件ボタン"
        className="relative flex flex-wrap items-center gap-2 pt-2"
      >
        {chips.map((c) => (
          <ToggleChip key={c.id} chip={c} />
        ))}
        <button
          ref={moreRef}
          aria-expanded={expanded}
          onClick={() => setExpanded(true)}
          className="rounded-full border border-dashed px-3 py-1 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          もっと開く（+{hidden}）
        </button>
        <Link
          ref={editRef}
          href="/mock/mock6/buttons"
          className="ml-auto text-sm text-muted-foreground underline underline-offset-4"
        >
          ボタンを編集 →
        </Link>
      </div>
      {expanded && (
        <section aria-label="サジェスト検索条件" className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            サジェスト（直近の検索から・この検索にだけ足せます）
          </p>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              検索するとここに候補が出ます
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((t) => (
                <SuggestChip key={t} token={t} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
