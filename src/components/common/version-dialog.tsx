"use client";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BUILD_INFO, formatBuildTime, type BuildInfo } from "@/lib/build-info";
import { useI18n } from "@/store/i18n-context";
import { DIALOG_OVERLAY } from "@/components/common/dialog-styles";

export function VersionDialog({
  info = BUILD_INFO,
  trigger,
}: {
  info?: BuildInfo;
  /** 開くボタンを差し替える（メニュー内など）。省略時はフッター用の小さなボタン */
  trigger?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-xs">
            {t.version.open}
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={DIALOG_OVERLAY} />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-4 shadow-xl">
          <Dialog.Title className="font-bold">{t.version.title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {t.version.description}
          </Dialog.Description>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{t.version.builtAt}</dt>
            <dd className="font-mono">
              {formatBuildTime(info.builtAt) ?? t.version.unknown}
            </dd>
            <dt className="text-muted-foreground">{t.version.commit}</dt>
            <dd className="font-mono">{info.commit || t.version.unknown}</dd>
          </dl>
          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm">
                {t.version.close}
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
