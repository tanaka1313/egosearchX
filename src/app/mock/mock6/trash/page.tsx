"use client";
// MOCK: 破棄予定（#61）
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LIMITS, type TrashItem } from "../_parts/data";
import { chipTokens } from "../_parts/query";
import { favQuery } from "../_parts/rows";
import { useStore } from "../_parts/store";
import { Confirm, EmptyState, PageHead } from "../_parts/ui";

type Kind = TrashItem["kind"];
const KIND: Record<Kind, string> = {
  chip: "条件ボタン",
  fav: "お気に入り",
  group: "いつものエゴサ",
};
const KINDS: Kind[] = ["chip", "fav", "group"];

type Target =
  | { type: "one"; item: TrashItem }
  | { type: "kind"; kind: Kind }
  | { type: "all" };

export default function TrashPage() {
  const s = useStore();
  const [tab, setTab] = useState<Kind | "all">("all");
  const [target, setTarget] = useState<Target | null>(null);
  const [open, setOpen] = useState<string[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const count = (k: Kind) => s.trash.filter((t) => t.kind === k).length;
  const shown = s.trash.filter((t) => tab === "all" || t.kind === tab);
  const chipFull = s.chips.length >= LIMITS.chips;

  const detail = (t: TrashItem): React.ReactNode => {
    if (t.kind === "chip")
      return (
        <code className="font-mono text-xs break-all">
          {chipTokens(t.data).join(" ") || "（中身なし）"}
        </code>
      );
    if (t.kind === "fav")
      return (
        <code className="font-mono text-xs break-all">
          {favQuery(t.data, s.chips).text || "（条件なし）"}
        </code>
      );
    return (
      <ul className="list-inside list-disc text-xs">
        {t.data.favIds.map((id) => {
          const live = s.favs.find((f) => f.id === id);
          const gone = s.trash.find(
            (x) => x.kind === "fav" && x.data.id === id,
          );
          return (
            <li key={id}>
              {live?.name ?? gone?.name ?? "（不明）"}
              {gone && "（削除済み）"}
            </li>
          );
        })}
      </ul>
    );
  };

  const confirmTitle =
    target?.type === "all"
      ? "削除済みをすべて完全削除しますか？"
      : target?.type === "kind"
        ? `${KIND[target.kind]}の削除済みをすべて完全削除しますか？`
        : target
          ? `「${target.item.name}」を完全に削除しますか？`
          : "";

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead
        title="削除済み"
        right={
          <Button
            size="sm"
            variant="outline"
            disabled={s.trash.length === 0}
            onClick={() => setTarget({ type: "all" })}
          >
            すべて完全削除
          </Button>
        }
      />
      <p className="rounded border p-2 text-sm">
        条件ボタン・お気に入り・いつものエゴサは、それぞれ{LIMITS.trash}
        件まで残ります。超えると、その種類の古いものから自動で完全に削除されます。復元はいつでもできます。
      </p>

      <div role="tablist" aria-label="種類" className="flex flex-wrap gap-1">
        {(["all", ...KINDS] as const).map((k) => {
          const on = tab === k;
          return (
            <button
              key={k}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(k)}
              className={`rounded-full border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring ${on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"}`}
            >
              {k === "all"
                ? `すべて ${s.trash.length}`
                : `${KIND[k]} ${count(k)}/${LIMITS.trash}`}
            </button>
          );
        })}
        {tab !== "all" && (
          <Button
            size="xs"
            variant="outline"
            className="ml-auto"
            disabled={count(tab) === 0}
            onClick={() => setTarget({ type: "kind", kind: tab })}
          >
            {KIND[tab]}をすべて完全削除
          </Button>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          text={
            tab === "all"
              ? "削除したものはここに入ります"
              : `削除した${KIND[tab]}はありません`
          }
        />
      ) : (
        <ul className="space-y-2">
          {shown.map((t) => {
            const siblings = t.batch
              ? s.trash.filter((x) => x.batch === t.batch && x.tid !== t.tid)
              : [];
            const blocked = t.kind === "chip" && chipFull;
            const isOpen = open.includes(t.tid);
            return (
              <li
                key={t.tid}
                className="space-y-1 rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border px-1 text-xs">
                    {KIND[t.kind]}
                  </span>
                  <span className="min-w-0 flex-1 font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    削除 {t.at}
                  </span>
                </div>
                {t.reason && (
                  <p className="text-xs text-muted-foreground">⚑ {t.reason}</p>
                )}
                {siblings.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    一緒に削除：
                    {siblings
                      .map((x) => `${KIND[x.kind]}「${x.name}」`)
                      .join("、")}
                  </p>
                )}
                {isOpen && (
                  <div className="rounded bg-muted p-2">{detail(t)}</div>
                )}
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    size="xs"
                    disabled={blocked}
                    onClick={() => {
                      const e = s.restore(t.tid);
                      if (e) setErrs({ ...errs, [t.tid]: e });
                      else s.say(`「${t.name}」を復元しました`);
                    }}
                  >
                    復元
                  </Button>
                  {siblings.length > 0 && t.batch && (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        const e = s.restoreBatch(t.batch!);
                        if (e) setErrs({ ...errs, [t.tid]: e });
                        else
                          s.say(
                            `${siblings.length + 1}件をまとめて復元しました`,
                          );
                      }}
                    >
                      一緒に削除したものもまとめて復元（{siblings.length + 1}
                      件）
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="outline"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpen(
                        isOpen
                          ? open.filter((x) => x !== t.tid)
                          : [...open, t.tid],
                      )
                    }
                  >
                    {isOpen ? "中身を隠す" : "中身を見る"}
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setTarget({ type: "one", item: t })}
                  >
                    完全に削除
                  </Button>
                </div>
                {blocked && (
                  <p className="text-xs">
                    ⚠ 条件ボタンが上限（{LIMITS.chips}件）のため復元できません
                  </p>
                )}
                {errs[t.tid] && <p className="text-xs">⚠ {errs[t.tid]}</p>}
                {t.kind === "group" &&
                  t.data.favIds.some((id) =>
                    s.trash.some((x) => x.kind === "fav" && x.data.id === id),
                  ) && (
                    <p className="text-xs">
                      ※
                      中身のお気に入りが削除済みです。このまま復元すると、削除済みのお気に入りは実行を飛ばします。
                    </p>
                  )}
              </li>
            );
          })}
        </ul>
      )}
      {target && (
        <Confirm
          title={confirmTitle}
          body={<p>元に戻せません。</p>}
          action="完全に削除"
          onYes={() => {
            if (target.type === "all") s.purgeAll();
            else if (target.type === "kind") s.purgeKind(target.kind);
            else s.purge(target.item.tid);
          }}
          onClose={() => setTarget(null)}
        />
      )}
    </main>
  );
}
