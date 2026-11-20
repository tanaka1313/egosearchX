"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { Group, OpenTarget } from "@/api";
import { useApi } from "@/store/api-context";
import { useLaunchHandoff } from "./launch-handoff";
import { useRunner } from "./use-runner";

/** ランチャーのパス（app-shell.tsx と同じ。S9） */
const LAUNCHER_PATH = "/launch";

/**
 * いつものエゴサの一括実行（帯・S4 共通。画面仕様書 2.2・6章）。クリックの中で開いて履歴に残したあと、
 * 結果を持ったままランチャーへ移る（ブロックされた分は、ランチャーの［次を開く］で続きを開ける）。
 * ランチャーの URL を作れなかったときだけ、`onFallback` で今の画面にブロックの表示を出す。
 */
export function useRunGroup(
  onFallback: (total: number, blocked: OpenTarget[]) => void,
) {
  const api = useApi();
  const router = useRouter();
  const handoff = useLaunchHandoff();
  const runner = useRunner();

  return useCallback(
    (group: Group) => {
      const { total, blocked } = runner(group.items, {
        kind: "group",
        label: group.name,
        groupId: group.id,
      });
      // `window.open` はもう済んでいるので、ここからは await してよい（api-spec 4.6）
      api.launcher.encode({ name: group.name, items: group.items }).then(
        (hash) => {
          handoff.put({ hash, total, blocked });
          if (window.location.pathname === LAUNCHER_PATH) {
            // 同じページ内の移動は hashchange で読み直す
            window.location.hash = hash;
          } else {
            router.push(`${LAUNCHER_PATH}#${hash}`);
          }
        },
        (e: unknown) => {
          console.error(e);
          if (blocked.length > 0) onFallback(total, blocked);
        },
      );
    },
    [api, router, handoff, runner, onFallback],
  );
}
