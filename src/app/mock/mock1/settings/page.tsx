"use client";
// MOCK: 破棄予定（#61）
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MockDialog } from "../../_components/mock-dialog";

export default function MockSettings() {
  const [confirm, setConfirm] = useState(false);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4">
      <section>
        <h2 className="mb-2 font-bold">共通設定</h2>
        {[
          "完全一致：公式アカウント名",
          "あいまい（通常）：略称",
          "除外：filter:retweets",
        ].map((t) => (
          <div
            key={t}
            className="mb-1 flex items-center gap-2 rounded border px-2 py-1 text-sm"
          >
            <input type="checkbox" defaultChecked aria-label="有効" />
            <span className="flex-1">{t}</span>
            <Button variant="ghost" size="xs">
              削除
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm">
          ＋ 追加
        </Button>
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">表示</h2>
        <Button variant="outline" size="sm">
          ダーク／ライト切替（ダミー）
        </Button>{" "}
        <Button variant="outline" size="sm">
          スタジオの配置を初期化
        </Button>
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">データ</h2>
        <p className="text-sm">プリセット 3 件 ／ 検索セット 2 件（ダミー）</p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirm(true)}
        >
          全データを削除
        </Button>
      </section>
      <p className="rounded border p-3 text-sm">
        データはこのブラウザにだけ保存されます。ブラウザのデータを消すと失われます。ブックマーク用URLが控えになります。
      </p>
      {confirm && (
        <MockDialog
          title="全データを削除しますか？"
          onClose={() => setConfirm(false)}
        >
          <p className="text-sm">
            元に戻せません（モックなので何も消えません）。
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={() => setConfirm(false)}>
              削除する
            </Button>
          </div>
        </MockDialog>
      )}
    </main>
  );
}
