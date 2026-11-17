"use client";
// MOCK: 破棄予定（#61）
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LIMITS } from "../_parts/data";
import { useStore } from "../_parts/store";
import { Confirm, EmptyState, PageHead } from "../_parts/ui";

export default function HistoryPage() {
  const s = useStore();
  const [confirm, setConfirm] = useState(false);
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead
        title="履歴"
        right={
          <>
            <span className="text-sm">
              {s.history.length}/{LIMITS.history}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={s.history.length === 0}
              onClick={() => setConfirm(true)}
            >
              全件削除
            </Button>
          </>
        }
      />
      {!s.recordHistory && (
        <p className="text-sm">⚠ 履歴の記録はOFFです（設定で変更できます）</p>
      )}
      {s.history.length === 0 ? (
        <EmptyState text="実行するとここに残ります" />
      ) : (
        <ul className="space-y-2">
          {s.history.map((h) => (
            <li key={h.id} className="space-y-1 rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{h.at}</span>
                <span className="rounded border px-1 text-xs">{h.engine}</span>
                <span className="text-xs text-muted-foreground">
                  {h.source}
                </span>
              </div>
              <div className="font-mono text-xs break-all">
                {h.query || "（条件なし）"}
              </div>
              {h.chipLabels.length > 0 && (
                <div className="text-xs">
                  使った条件ボタン：{h.chipLabels.join("、")}
                </div>
              )}
              {h.note && <div className="text-xs">⚑ {h.note}</div>}
              <div className="flex flex-wrap gap-1">
                <Button
                  size="xs"
                  onClick={() => s.say("再実行しました（ダミー）")}
                >
                  再実行
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    s.saveFav({
                      id: `f${Date.now()}`,
                      name: h.word ? `${h.word}（履歴から）` : "履歴から",
                      word: h.word,
                      exact: false,
                      chipIds: [],
                      extra: [],
                      period: "none",
                      engine: "x",
                      last: "未実行",
                    });
                  }}
                >
                  ☆ お気に入りに保存
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    const e = s.saveChip({
                      id: `hc${Date.now()}`,
                      label: h.word || "履歴の条件",
                      on: false,
                      isNew: true,
                      conds: [
                        { id: `hc${Date.now()}c`, kind: "raw", value: h.query },
                      ],
                    });
                    if (e) s.say(e);
                  }}
                >
                  条件ボタンにする
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {confirm && (
        <Confirm
          title="履歴をすべて削除しますか？"
          body="元に戻せません。「前回から」の期間や「今日は済」の表示にも影響します。"
          action="削除する"
          onYes={() => s.clearHistory()}
          onClose={() => setConfirm(false)}
        />
      )}
    </main>
  );
}
