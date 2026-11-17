"use client";
// MOCK: 破棄予定（#61）
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { IssueDialog, MemberDialog } from "../_components/dialogs";
import { PRESETS } from "../_components/dummy";

export default function MockQuickRun() {
  const [empty, setEmpty] = useState(false);
  const [dialog, setDialog] = useState<"m1" | "m3" | null>(null);
  const [msg, setMsg] = useState("");

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          検索セット：
          <select className="ml-1 rounded border px-2 py-1">
            <option>毎朝のエゴサ</option>
            <option>週次チェック</option>
          </select>
        </label>
        <Button variant="outline" size="sm" onClick={() => setDialog("m1")}>
          ＋新規
        </Button>
        <label className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={empty}
            onChange={(ev) => setEmpty(ev.target.checked)}
          />
          空状態を表示（モック用）
        </label>
      </div>

      {empty ? (
        <section className="rounded border border-dashed p-8 text-center">
          <p className="mb-3">メンバーを選んで検索を作りましょう</p>
          <Button onClick={() => setDialog("m1")}>メンバーを選ぶ</Button>
        </section>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {PRESETS.map((p) => (
              <li key={p.id} className="space-y-2 rounded-lg border p-3">
                <div className="font-medium">{p.name}</div>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {p.engines.map((e) => (
                    <span key={e} className="rounded border px-1.5 py-0.5">
                      {e}
                    </span>
                  ))}
                  {p.warn && (
                    <span title="list: は Yahoo では使えません（ダミー）">
                      ⚠ 警告あり
                    </span>
                  )}
                  <span className="ml-auto text-muted-foreground">
                    最終 {p.last}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      setMsg(`「${p.name}」を開きました（ダミー）`)
                    }
                  >
                    実行
                  </Button>
                  <Link
                    href="/mock/mock1/studio"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    編集
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setMsg("3個のタブを開きました（ダミー）")}>
              ▶ すべて開く（3個のタブ）
            </Button>
            <Button variant="outline" onClick={() => setDialog("m3")}>
              ブックマーク用URLを発行
            </Button>
          </div>
        </>
      )}

      {msg && (
        <p role="status" className="rounded border bg-muted px-3 py-2 text-sm">
          {msg}
        </p>
      )}
      {dialog === "m1" && <MemberDialog onClose={() => setDialog(null)} />}
      {dialog === "m3" && <IssueDialog onClose={() => setDialog(null)} />}
    </main>
  );
}
