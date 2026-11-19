"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, type Group, type OpenTarget } from "@/api";
import { BlockedNotice } from "@/components/common/blocked-notice";
import { EmptyState } from "@/components/common/empty-state";
import { PageHead } from "@/components/common/page-head";
import { useToast } from "@/components/common/toast";
import { useRunner } from "@/components/common/use-runner";
import { Button } from "@/components/ui/button";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useAppStore } from "@/store/store-context";
import { BookmarkSheet } from "./bookmark-sheet";
import { useItemLabel } from "./item-label";

/**
 * S4：いつものエゴサ（画面仕様書 5.4）。一括実行・ブックマークURLの発行（D2）・編集（S4-E）・削除（削除済みへ。
 * トーストの［元に戻す］）ができる。一覧では並べ替えない（項目の順は S4-E で変える）。
 * ブロックされたときの表示は、帯の下ではなくこのページの中に出す（モーダルにしない）。
 */
export function GroupsPage() {
  const { t } = useI18n();
  const p = t.groupsPage;
  const toast = useToast();
  const groups = useAppStore((s) => s.groups);
  const remove = useAppStore((s) => s.groups_remove);
  const restore = useAppStore((s) => s.trash_restore);
  const [blocked, setBlocked] = useState<{
    total: number;
    items: OpenTarget[];
  } | null>(null);

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.code === "CORRUPT") return;
    console.error(e);
    toast.show(p.failed);
  };

  const add = (
    <Button size="sm" asChild>
      <Link href="/groups/edit">{p.add}</Link>
    </Button>
  );

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead title={p.title} right={add} />
      <p className="text-sm text-muted-foreground">{p.description}</p>
      {blocked && (
        <BlockedNotice
          total={blocked.total}
          blocked={blocked.items}
          onClose={() => setBlocked(null)}
        />
      )}
      {groups.length === 0 ? (
        <EmptyState text={p.empty}>{add}</EmptyState>
      ) : (
        <ul aria-label={p.list} className="space-y-2">
          {groups.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              onRun={(total, items) =>
                // 開けたときは、前回のブロックの表示を残さない
                setBlocked(items.length > 0 ? { total, items } : null)
              }
              onRemove={() =>
                remove(g.id).then(
                  () =>
                    toast.show(p.removed(g.name), () =>
                      restore("group", g.id).catch(fail),
                    ),
                  fail,
                )
              }
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function GroupRow({
  group,
  onRun,
  onRemove,
}: {
  group: Group;
  /** 実行したあと（開こうとした数と、ブロックされて開けなかったもの。無ければ空） */
  onRun: (total: number, blocked: OpenTarget[]) => void;
  onRemove: () => void;
}) {
  const api = useApi();
  const { t } = useI18n();
  const p = t.groupsPage;
  const runner = useRunner();
  const label = useItemLabel();
  // 「今日は済」は履歴ではなく lastRunAt が端末の現地の今日かで決める（api-spec 4.5）
  const done = api.clock.isToday(group.lastRunAt);

  const run = () => {
    const { total, blocked } = runner(group.items, {
      kind: "group",
      label: group.name,
      groupId: group.id,
    });
    onRun(total, blocked);
  };

  return (
    <li className="space-y-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 truncate font-bold" title={group.name}>
          {p.nameWithCount(group.name, group.items.length)}
        </span>
        <span className="shrink-0 text-xs">{done ? p.done : p.notDone}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label={p.runLabel(group.name)}
            onClick={run}
          >
            {p.run}
          </Button>
          <BookmarkSheet
            group={group}
            trigger={
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={p.bookmarkLabel(group.name)}
              >
                {p.bookmark}
              </Button>
            }
          />
          <Button asChild size="sm" variant="outline">
            <Link
              href={`/groups/edit?id=${encodeURIComponent(group.id)}`}
              aria-label={p.editLabel(group.name)}
            >
              {p.edit}
            </Link>
          </Button>
          <button
            type="button"
            aria-label={p.remove(group.name)}
            onClick={onRemove}
            className="rounded px-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            ×
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {group.items.map(label).join(p.itemSeparator) || p.noItems}
      </p>
    </li>
  );
}
