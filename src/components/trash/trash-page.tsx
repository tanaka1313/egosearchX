"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ApiError,
  LIMITS,
  type TrashDetail,
  type TrashEntry,
  type TrashKind,
} from "@/api";
import { EmptyState } from "@/components/common/empty-state";
import { PageHead } from "@/components/common/page-head";
import { StateIcon } from "@/components/common/state-icon";
import { useToast } from "@/components/common/toast";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useItemLabel } from "@/components/groups/item-label";
import { toggleClass } from "@/components/search/styles";
import { Button } from "@/components/ui/button";
import { formatRunAt } from "@/lib/format-date";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { PAGE_MAIN } from "@/components/common/layout";

const KINDS: TrashKind[] = ["chip", "favorite", "group"];
type Tab = "all" | TrashKind;
const TABS: Tab[] = ["all", ...KINDS];

/** 確認ダイアログ（D3）の対象：1件／選んでいる種類／すべて */
type Target =
  | { type: "one"; entry: TrashEntry }
  | { type: "kind"; kind: TrashKind }
  | { type: "all" };

/**
 * S6：削除済み（画面仕様書 5.7）。種類のタブで切り替え、復元は確認なし、完全削除は必ず D3 を挟む。
 * 上限（種類ごと）と復元先の規則はバックエンドが持つ。ここは、戻せない条件ボタンの事前表示だけ。
 */
export function TrashPage() {
  const api = useApi();
  const { t, lang } = useI18n();
  const p = t.trashPage;
  const toast = useToast();
  const status = useAppStore((s) => s.status);
  const trash = useAppStore((s) => s.trash);
  const chips = useAppStore((s) => s.chips);
  const load = useAppStore((s) => s.trash_load);
  const restore = useAppStore((s) => s.trash_restore);
  const purge = useAppStore((s) => s.trash_purge);
  const purgeKind = useAppStore((s) => s.trash_purgeKind);
  const purgeAll = useAppStore((s) => s.trash_purgeAll);

  const [tab, setTab] = useState<Tab>("all");
  const [target, setTarget] = useState<Target | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** 復元が上限で失敗した行（事前の判定をすり抜けたとき） */
  const [full, setFull] = useState<string[]>([]);
  const tabRefs = useRef(new Map<Tab, HTMLButtonElement>());
  /** 確認ダイアログを開いたときに押していた要素（キャンセルで閉じたら、そこへフォーカスを戻す） */
  const opener = useRef<HTMLElement | null>(null);
  /** 確認ダイアログの実行で行が消える（押した要素も消えうる）ので、閉じたあとのフォーカスは選んでいるタブへ戻す */
  const refocusAfterClose = useRef(false);

  useEffect(() => {
    if (status === "ready") void load();
  }, [status, load]);

  const focusTab = useCallback((k: Tab) => tabRefs.current.get(k)?.focus(), []);
  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.code === "CORRUPT") return;
    console.error(e);
    toast.show(p.failed);
  };

  const interestName = (id: string) => {
    const i = api.master.interests().get(id);
    return i ? i.label[lang] : id;
  };
  const count = (k: TrashKind) =>
    (trash ?? []).filter((e) => e.kind === k).length;
  const kindName = (k: TrashKind) => p.kind[k];
  const shown =
    trash === null ? [] : trash.filter((e) => tab === "all" || e.kind === tab);
  /** 条件ボタンは、削除したときの対象の並びが上限なら戻せない（上限もその対象で数える） */
  const chipBlocked = (e: TrashEntry) =>
    e.kind === "chip" &&
    e.interestId !== undefined &&
    (chips.get(e.interestId)?.length ?? 0) >= LIMITS.chips;

  const onRestore = async (e: TrashEntry) => {
    try {
      await restore(e.kind, e.id);
      toast.show(p.restored(e.name));
      focusTab(tab);
    } catch (err) {
      if (err instanceof ApiError && err.code === "LIMIT")
        setFull((f) => [...f, e.id]);
      else fail(err);
    }
  };

  const ask = (next: Target, from: HTMLElement) => {
    opener.current = from;
    setTarget(next);
    setConfirmOpen(true);
  };
  const confirm = () => {
    if (!target) return;
    refocusAfterClose.current = true;
    const run =
      target.type === "all"
        ? purgeAll()
        : target.type === "kind"
          ? purgeKind(target.kind)
          : purge(target.entry.kind, target.entry.id);
    run.catch(fail);
  };

  const onTabKey = (e: KeyboardEvent, k: Tab) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = TABS[(TABS.indexOf(k) + step + TABS.length) % TABS.length];
    setTab(next);
    focusTab(next);
  };

  const confirmTitle =
    target?.type === "all"
      ? p.confirmAll
      : target?.type === "kind"
        ? p.confirmKind(kindName(target.kind))
        : target
          ? p.confirmOne(target.entry.name)
          : "";

  return (
    <main className={`${PAGE_MAIN} space-y-3`}>
      <PageHead
        title={p.title}
        right={
          <Button
            size="sm"
            variant="outline"
            disabled={(trash ?? []).length === 0}
            onClick={(e) => ask({ type: "all" }, e.currentTarget)}
          >
            {p.purgeAll}
          </Button>
        }
      />
      <p className="rounded border p-2 text-sm">{p.note(LIMITS.trash)}</p>

      <div role="tablist" aria-label={p.tabs} className="flex flex-wrap gap-1">
        {TABS.map((k) => {
          const on = tab === k;
          return (
            <button
              key={k}
              ref={(el) => {
                if (el) tabRefs.current.set(k, el);
                else tabRefs.current.delete(k);
              }}
              role="tab"
              type="button"
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setTab(k)}
              onKeyDown={(e) => onTabKey(e, k)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${toggleClass(on)}`}
            >
              <StateIcon on={on} decorative />
              {k === "all"
                ? p.tabAll((trash ?? []).length)
                : p.tabKind(kindName(k), count(k), LIMITS.trash)}
            </button>
          );
        })}
        {tab !== "all" && (
          <Button
            size="xs"
            variant="outline"
            className="ml-auto"
            disabled={count(tab) === 0}
            onClick={(e) => ask({ type: "kind", kind: tab }, e.currentTarget)}
          >
            {p.purgeKind(kindName(tab))}
          </Button>
        )}
      </div>

      {trash === null ? null : shown.length === 0 ? (
        <EmptyState
          text={tab === "all" ? p.emptyAll : p.emptyKind(kindName(tab))}
        />
      ) : (
        <ul aria-label={p.list} className="space-y-2">
          {shown.map((e) => (
            <TrashRow
              key={`${e.kind}:${e.id}`}
              entry={e}
              badge={
                e.kind === "chip" && e.interestId !== undefined
                  ? p.chipBadge(interestName(e.interestId))
                  : kindName(e.kind)
              }
              blocked={chipBlocked(e) || full.includes(e.id)}
              onRestore={() => void onRestore(e)}
              onPurge={(from) => ask({ type: "one", entry: e }, from)}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        body={p.confirmBody}
        action={p.confirmAction}
        onConfirm={confirm}
        onCloseAutoFocus={(ev) => {
          ev.preventDefault();
          const back = opener.current;
          if (!refocusAfterClose.current && back?.isConnected) back.focus();
          else focusTab(tab);
          refocusAfterClose.current = false;
        }}
      />
    </main>
  );
}

function TrashRow({
  entry,
  badge,
  blocked,
  onRestore,
  onPurge,
}: {
  entry: TrashEntry;
  badge: string;
  blocked: boolean;
  onRestore: () => void;
  onPurge: (from: HTMLElement) => void;
}) {
  const api = useApi();
  const { t } = useI18n();
  const p = t.trashPage;
  const label = useItemLabel();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<TrashDetail | null>(null);

  const toggle = async () => {
    if (open) return setOpen(false);
    try {
      setDetail(await api.data.trash.detail(entry.kind, entry.id));
    } catch (e) {
      console.error(e);
      return;
    }
    setOpen(true);
  };

  const mono = (text: string): ReactNode => (
    <code className="font-mono text-xs break-all">{text || p.empty}</code>
  );

  return (
    <li className="space-y-1 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="rounded border px-1 text-xs whitespace-nowrap">
          {badge}
        </span>
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          {p.deletedAt(formatRunAt(entry.deletedAt) ?? "")}
        </span>
      </div>
      <div className="font-medium break-all">{entry.name}</div>
      {open && detail && (
        <div className="rounded bg-muted p-2">
          {detail.kind === "chip" && mono(detail.chip.query)}
          {detail.kind === "favorite" &&
            mono(api.query.expand(detail.favorite.query))}
          {detail.kind === "group" && (
            <ul className="list-inside list-disc text-xs">
              {detail.group.items.map((it, i) => (
                <li key={`${it.query}:${i}`}>
                  {label(it)}
                  <code className="ml-1 font-mono break-all">{it.query}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
        <Button size="xs" disabled={blocked} onClick={onRestore}>
          {p.restore}
        </Button>
        <Button
          size="xs"
          variant="outline"
          aria-expanded={open}
          onClick={() => void toggle()}
        >
          {open ? p.hide : p.show}
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={(e) => onPurge(e.currentTarget)}
        >
          {p.purge}
        </Button>
      </div>
      {blocked && <p className="text-xs">{p.chipFull(LIMITS.chips)}</p>}
    </li>
  );
}
