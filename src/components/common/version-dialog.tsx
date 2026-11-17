"use client";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { BUILD_INFO, formatBuildTime, type BuildInfo } from "@/lib/build-info";

export function VersionDialog({ info = BUILD_INFO }: { info?: BuildInfo }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          バージョン情報
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-4 shadow-xl">
          <Dialog.Title className="font-bold">バージョン情報</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            この画面のビルド情報です。不具合の報告時に伝えてください。
          </Dialog.Description>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">ビルド日時</dt>
            <dd className="font-mono">{formatBuildTime(info.builtAt)}</dd>
            <dt className="text-muted-foreground">コミット</dt>
            <dd className="font-mono">{info.commit || "不明"}</dd>
          </dl>
          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm">
                閉じる
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
