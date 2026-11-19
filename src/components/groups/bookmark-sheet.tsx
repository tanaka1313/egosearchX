"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Group } from "@/api";
import { useToast } from "@/components/common/toast";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";
import { useItemLabel } from "./item-label";

/**
 * D2：ブックマークURLの発行（画面仕様書 5.4）。いつものエゴサの名前と項目をハッシュにして、
 * `<オリジン>/launch#<hash>` を見せる。長さの警告は出さない（効く制限は各クエリの長さ。api-spec 4.4）。
 * 閉じると中身ごと消えるので、開き直すたびに作り直す（保存データは変えない）。
 */
export function BookmarkSheet({
  group,
  trigger,
}: {
  group: Group;
  trigger: ReactNode;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={t.bookmark.title(group.name)}
      closeLabel={t.sheet.close}
    >
      <BookmarkBody group={group} onClose={() => setOpen(false)} />
    </Sheet>
  );
}

function BookmarkBody({
  group,
  onClose,
}: {
  group: Group;
  onClose: () => void;
}) {
  const api = useApi();
  const { t } = useI18n();
  const toast = useToast();
  const label = useItemLabel();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.launcher.encode({ name: group.name, items: group.items }).then(
      (hash) => {
        // ハッシュに付けるオリジンとパスはフロントエンドが決める（api-spec 4.4）
        if (!cancelled) setUrl(`${window.location.origin}/launch#${hash}`);
      },
      (e: unknown) => {
        console.error(e);
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, group.name, group.items]);

  const copy = () => {
    if (!url) return;
    Promise.resolve(navigator.clipboard?.writeText(url)).then(
      () => {
        toast.show(t.bookmark.copied);
        onClose();
      },
      () => toast.show(t.groupsPage.failed),
    );
  };

  return (
    <>
      <ul className="list-inside list-disc text-sm">
        {group.items.map((item, i) => (
          <li key={`${item.query}${i}`}>{label(item)}</li>
        ))}
      </ul>
      {failed ? (
        <p role="alert" className="text-sm font-medium">
          ⚠ {t.bookmark.failed}
        </p>
      ) : url ? (
        <code
          aria-label={t.bookmark.urlLabel}
          className="block rounded bg-muted p-2 font-mono text-xs break-all"
        >
          {url}
        </code>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          {t.bookmark.loading}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t.bookmark.steps}</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t.bookmark.close}
        </Button>
        <Button type="button" disabled={!url} onClick={copy}>
          {t.bookmark.copy}
        </Button>
      </div>
    </>
  );
}
