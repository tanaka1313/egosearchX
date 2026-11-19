"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ApiError,
  type Engine,
  type LauncherPayload,
  type OpenTarget,
} from "@/api";
import { BlockedNotice } from "@/components/common/blocked-notice";
import { EmptyState } from "@/components/common/empty-state";
import { useRunner } from "@/components/common/use-runner";
import { useItemLabel } from "@/components/groups/item-label";
import { Button, buttonVariants } from "@/components/ui/button";
import { ENGINE_LABEL } from "@/messages";
import { useApi } from "@/store/api-context";
import { useI18n } from "@/store/i18n-context";

type State =
  | { kind: "loading" }
  | { kind: "ok"; payload: LauncherPayload }
  | { kind: "broken" }
  | { kind: "version" };

/**
 * S9：ランチャー（画面仕様書 6章）。ブックマークの URL（`/launch#<hash>`）から、いつものエゴサの名前と項目を出し、
 * ［すべて開く］のクリックを起点に開く。ページを開いただけではタブを開かない。何も保存しない
 * （実行の履歴を除く。ランチャーは ID を持たないので、いつものエゴサの `lastRunAt` は動かない）。
 *
 * `launcher.decode` は async なので、ページを開いたときに復号しておく。実行計画（`url.plan`）は同期なので、
 * クリックの中で作る（相対期間は押した時点の日付に展開する。api-spec 4.6）。
 */
export function LaunchPage() {
  const api = useApi();
  const { t } = useI18n();
  const p = t.launchPage;
  const [state, setState] = useState<State>({ kind: "loading" });

  // ハッシュは、サーバーの事前描画に無いので、マウントしてから読む。別のブックマークへの移動
  // （同じタブでハッシュだけが変わる）では再マウントされないので、hashchange も見る
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api.launcher.decode(window.location.hash.replace(/^#/, "")).then(
        (payload) => {
          if (!cancelled) setState({ kind: "ok", payload });
        },
        (e: unknown) => {
          if (cancelled) return;
          setState({
            kind:
              e instanceof ApiError && e.code === "LAUNCHER_VERSION"
                ? "version"
                : "broken",
          });
        },
      );
    };
    load();
    window.addEventListener("hashchange", load);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", load);
    };
  }, [api]);

  if (state.kind === "loading")
    return (
      <main className="mx-auto max-w-xl space-y-3 p-4">
        <p className="text-sm text-muted-foreground">{p.loading}</p>
      </main>
    );

  if (state.kind !== "ok")
    return (
      <main className="mx-auto max-w-xl space-y-3 p-4">
        <EmptyState text={state.kind === "version" ? p.version : p.broken}>
          <Link href="/" className={buttonVariants({ size: "sm" })}>
            {p.home}
          </Link>
        </EmptyState>
      </main>
    );

  return <Launcher payload={state.payload} />;
}

function Launcher({ payload }: { payload: LauncherPayload }) {
  const api = useApi();
  const { t } = useI18n();
  const p = t.launchPage;
  const runner = useRunner();
  const label = useItemLabel();
  const [blocked, setBlocked] = useState<{
    total: number;
    items: OpenTarget[];
  } | null>(null);

  const engineName = (e: Engine) =>
    e === "both" ? p.engineBoth : ENGINE_LABEL[e];

  const run = (items: LauncherPayload["items"]) => {
    const { total, blocked: failed } = runner(items, {
      kind: "launch",
      label: payload.name,
    });
    // 開けたときは、前回のブロックの表示を残さない
    setBlocked(failed.length > 0 ? { total, items: failed } : null);
  };

  return (
    <main className="mx-auto max-w-xl space-y-3 p-4">
      <h1 className="text-xl font-bold">{p.title(payload.name)}</h1>
      <p className="text-sm">{p.count(payload.items.length)}</p>
      <Button size="lg" onClick={() => run(payload.items)}>
        {p.openAll}
      </Button>
      {blocked && (
        <BlockedNotice
          total={blocked.total}
          blocked={blocked.items}
          onClose={() => setBlocked(null)}
        />
      )}
      <ol aria-label={p.list} className="space-y-2">
        {payload.items.map((item, i) => {
          const name = label(item);
          return (
            <li
              key={`${i}:${item.engine}:${item.query}`}
              className="flex items-center gap-2 rounded-lg border p-2 text-sm"
            >
              <span aria-hidden>{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {name}（{engineName(item.engine)}）
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {api.query.expand(item.query)}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                aria-label={p.openLabel(name)}
                onClick={() => run([item])}
              >
                {p.open}
              </Button>
            </li>
          );
        })}
      </ol>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        {p.home}
      </Link>
    </main>
  );
}
