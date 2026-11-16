"use client";
// MOCK: 破棄予定（#61）
import { Button } from "@/components/ui/button";
import { BOOKMARK_URL, PRESETS } from "./dummy";
import { MockDialog, Mono } from "./mock-dialog";

/** M1 メンバー選択 */
export function MemberDialog({ onClose }: { onClose: () => void }) {
  return (
    <MockDialog title="M1 メンバー選択" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <ul className="space-y-1 border-r pr-2">
          <li>▾ サンプル事務所</li>
          <li className="pl-4">▾ 箱A</li>
          <li className="pl-8 font-bold">1期</li>
          <li className="pl-8">2期</li>
        </ul>
        <div className="space-y-1">
          <input
            className="w-full rounded border px-2 py-1"
            placeholder="メンバーを検索"
            aria-label="メンバー検索"
          />
          {["メンバーA", "メンバーB", "メンバーC（卒業）"].map((m) => (
            <label key={m} className="flex items-center gap-2">
              <input type="checkbox" defaultChecked={m === "メンバーA"} /> {m}
            </label>
          ))}
        </div>
      </div>
      <fieldset className="mt-3 space-y-1 text-sm">
        <legend className="font-medium">作成するテンプレート</legend>
        {[
          "名前エゴサ",
          "公式タグ",
          "同じ箱からのリプライ",
          "Yahoo版の名前エゴサ",
        ].map((t, i) => (
          <label key={t} className="flex items-center gap-2">
            <input
              type="checkbox"
              defaultChecked={i !== 2}
              disabled={i === 2}
            />{" "}
            {t}
            {i === 2 && (
              <span className="text-xs text-muted-foreground">
                （箱のリスト ID が未設定のため無効）
              </span>
            )}
          </label>
        ))}
      </fieldset>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          キャンセル
        </Button>
        <Button onClick={onClose}>作成</Button>
      </div>
    </MockDialog>
  );
}

/** M2 URL 取り込み */
export function ImportDialog({ onClose }: { onClose: () => void }) {
  return (
    <MockDialog title="M2 URL 取り込み" onClose={onClose}>
      <textarea
        className="h-20 w-full rounded border p-2 font-mono text-xs"
        aria-label="取り込む URL"
        defaultValue="https://x.com/search?q=…（ダミー）&f=live"
      />
      <p className="mt-2 text-sm font-medium">解析結果（ダミー）</p>
      <ul className="space-y-1 text-sm">
        <li>・語：「メンバーA」（完全一致）</li>
        <li>・除外：filter:retweets</li>
        <li className="text-muted-foreground">
          ・生トークン：foo:bar（解析できなかった部分）
        </li>
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          キャンセル
        </Button>
        <Button onClick={onClose}>新規プリセットとして取り込む</Button>
      </div>
    </MockDialog>
  );
}

/** M3 検索セット発行 */
export function IssueDialog({ onClose }: { onClose: () => void }) {
  return (
    <MockDialog title="M3 検索セット発行" onClose={onClose}>
      <p className="text-sm">検索セット名：毎朝のエゴサ</p>
      <ul className="my-2 list-inside list-disc text-sm">
        {PRESETS.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
      <Mono>{BOOKMARK_URL}</Mono>
      <p className="mt-2 text-sm">
        ⚠ URL が長めです（ダミーの警告）。プリセットを減らすと短くなります。
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        ブックマークに追加する手順：URL をコピーして、ブックマークの URL
        欄に貼り付けます。
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          閉じる
        </Button>
        <Button onClick={onClose}>コピー</Button>
      </div>
    </MockDialog>
  );
}
