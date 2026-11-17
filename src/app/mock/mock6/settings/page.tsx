"use client";
// MOCK: 破棄予定（#61）
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LIMITS } from "../_parts/data";
import { useStore } from "../_parts/store";
import { Confirm, PageHead } from "../_parts/ui";

export default function SettingsPage() {
  const s = useStore();
  const [confirm, setConfirm] = useState<"history" | "all" | null>(null);
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-3 md:p-4">
      <PageHead title="設定" />

      <section className="space-y-2">
        <h2 className="font-bold">条件ボタン</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.autoAdd}
            onChange={(ev) => s.setAutoAdd(ev.target.checked)}
          />
          実行した詳細設定の条件を、条件ボタンに自動で追加する
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const n = s.addDefaultChips();
            s.say(
              n
                ? `既定のボタンを${n}件追加しました`
                : "既定のボタンはすべて登録済みです",
            );
          }}
        >
          既定のボタン（ホロライブ・にじさんじ）を追加
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">履歴</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.recordHistory}
            onChange={(ev) => s.setRecordHistory(ev.target.checked)}
          />
          実行履歴を記録する
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirm("history")}
        >
          履歴を全件削除
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">表示</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => s.say("ダーク／ライトを切り替えました（ダミー）")}
        >
          ダーク／ライト切替
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">上限（参考）</h2>
        <p className="text-sm text-muted-foreground">
          変更はコードの定数で行います（今後変わる可能性があります）。
        </p>
        <ul className="list-inside list-disc text-sm">
          <li>条件ボタン：{LIMITS.chips}件</li>
          <li>削除済み：{LIMITS.trash}件</li>
          <li>履歴：{LIMITS.history}件</li>
          <li>ホームの条件ボタン表示：{LIMITS.foldRows}行まで</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold">データ</h2>
        <p className="text-sm">
          条件ボタン {s.chips.length} 件 ／ お気に入り {s.favs.length} 件 ／
          グループ {s.groups.length} 件 ／ 履歴 {s.history.length} 件 ／
          削除済み {s.trash.length} 件
        </p>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setConfirm("all")}
        >
          全データを削除
        </Button>
        <p className="text-xs text-muted-foreground">
          エクスポート／インポートは MVP の対象外です。
        </p>
      </section>

      <p className="rounded border p-3 text-sm">
        データはこのブラウザにだけ保存されます。ブラウザのデータを消すと失われます。ブックマーク用URLが控えになります。
      </p>

      {confirm && (
        <Confirm
          title={
            confirm === "all"
              ? "全データを削除しますか？"
              : "履歴をすべて削除しますか？"
          }
          body="元に戻せません（モックなのでこのページを開き直すと初期状態に戻ります）。"
          action="削除する"
          onYes={() => (confirm === "all" ? s.resetAll() : s.clearHistory())}
          onClose={() => setConfirm(null)}
        />
      )}
    </main>
  );
}
