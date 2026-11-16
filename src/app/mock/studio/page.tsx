"use client";
// MOCK: 破棄予定（#61）
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ImportDialog,
  IssueDialog,
  MemberDialog,
} from "../_components/dialogs";
import {
  PRESETS,
  QUERY_X,
  QUERY_YAHOO,
  URL_X,
  URL_YAHOO,
} from "../_components/dummy";
import { Mono } from "../_components/mock-dialog";

const NODES = [
  "語：メンバーA（完全一致）",
  "語：めんばーえー（通常）",
  "除外：filter:retweets",
  "期間：昨日から（終了日を含む）",
  "生トークン：foo:bar",
];

export default function MockStudio() {
  const [view, setView] = useState<"gui" | "text">("gui");
  const [tab, setTab] = useState(0);
  const [panel, setPanel] = useState(false);
  const [dialog, setDialog] = useState<"m1" | "m2" | "m3" | null>(null);
  const close = () => setDialog(null);

  return (
    <div className="flex h-[calc(100vh-5.5rem)] min-h-[32rem] flex-col">
      <div className="grid flex-1 grid-cols-1 overflow-auto md:grid-cols-[14rem_1fr_20rem]">
        <aside className="space-y-3 border-b p-3 text-sm md:border-r md:border-b-0">
          <input
            className="w-full rounded border px-2 py-1"
            placeholder="名前・タグで絞り込み"
            aria-label="絞り込み"
          />
          <section>
            <h2 className="font-bold">マスタ（閲覧のみ）</h2>
            <ul className="pl-2">
              <li>▾ サンプル事務所</li>
              <li className="pl-3">▾ 箱A</li>
              <li className="pl-6">メンバーA</li>
              <li className="pl-6">メンバーB</li>
              <li className="pl-6 text-muted-foreground">メンバーC（卒業）</li>
            </ul>
            <Button variant="ghost" size="xs" onClick={() => setDialog("m1")}>
              このメンバーで検索を作る
            </Button>
          </section>
          <section>
            <h2 className="font-bold">プリセット</h2>
            <ul>
              {PRESETS.map((p, i) => (
                <li key={p.id}>
                  <button
                    className="w-full text-left hover:underline"
                    onClick={() => setTab(i)}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-bold">検索セット</h2>
            <p>▾ 毎朝のエゴサ</p>
            <div className="flex gap-1 pl-3">
              <Button variant="outline" size="xs">
                ▶ 一括実行
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setDialog("m3")}
              >
                発行
              </Button>
            </div>
          </section>
        </aside>

        <section className="min-w-0 space-y-3 p-3">
          <div role="tablist" className="flex flex-wrap gap-1">
            {PRESETS.map((p, i) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={tab === i}
                onClick={() => setTab(i)}
                className={`rounded-t border px-2 py-1 text-sm ${tab === i ? "bg-muted font-bold" : ""}`}
              >
                {p.name}
                {i === 0 && " ●"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">
              エンジン：X ／ Yahoo ／ 両方（ダミー）
            </span>
            <Button size="sm">保存</Button>
            <Button size="sm" variant="outline">
              複製
            </Button>
            <div className="ml-auto flex gap-1">
              <Button
                size="sm"
                variant={view === "gui" ? "default" : "outline"}
                onClick={() => setView("gui")}
              >
                GUI
              </Button>
              <Button
                size="sm"
                variant={view === "text" ? "default" : "outline"}
                onClick={() => setView("text")}
              >
                テキスト
              </Button>
            </div>
          </div>
          <div className="rounded border p-2 text-sm">
            <p className="font-medium">共通設定から継承</p>
            <label className="mr-3">
              <input type="checkbox" defaultChecked /> 共通の除外
            </label>
            <label>
              <input type="checkbox" defaultChecked /> 共通の完全一致
            </label>
          </div>
          {view === "gui" ? (
            <ul className="space-y-1">
              {NODES.map((n) => (
                <li
                  key={n}
                  className="flex items-center gap-2 rounded border px-2 py-1 text-sm"
                >
                  <input type="checkbox" defaultChecked aria-label="有効" />
                  <span className="flex-1">{n}</span>
                  <Button variant="ghost" size="xs">
                    削除
                  </Button>
                </li>
              ))}
              <li>
                <Button variant="outline" size="sm">
                  ＋ ノードを追加
                </Button>
              </li>
            </ul>
          ) : (
            <textarea
              className="h-40 w-full rounded border p-2 font-mono text-sm"
              aria-label="クエリのテキスト"
              defaultValue={QUERY_X}
            />
          )}
        </section>

        <aside className="space-y-3 border-t p-3 text-sm md:border-t-0 md:border-l">
          <h2 className="font-bold">プレビュー</h2>
          <p>X</p>
          <Mono>{QUERY_X}</Mono>
          <Mono>{URL_X}</Mono>
          <p>Yahoo</p>
          <Mono>{QUERY_YAHOO}</Mono>
          <Mono>{URL_YAHOO}</Mono>
          <div className="rounded border p-2">
            ⚠ 警告：list: は Yahoo では使えません（ダミー）
          </div>
          <Button variant="outline" size="sm" onClick={() => setDialog("m2")}>
            URLを貼り付けて取り込む
          </Button>
        </aside>
      </div>

      <div className="border-t">
        <button
          className="w-full px-3 py-1 text-left text-sm"
          onClick={() => setPanel((v) => !v)}
          aria-expanded={panel}
        >
          {panel ? "▾" : "▸"} 下パネル：警告{" "}
          <span className="rounded border px-1">2</span> ／ ログ
        </button>
        {panel && (
          <ul className="space-y-1 px-3 pb-2 text-sm">
            <li>⚠ list: は Yahoo では使えません（ダミー）</li>
            <li>⚠ 引用符つきの完全一致は実験的です（ダミー）</li>
          </ul>
        )}
      </div>

      {dialog === "m1" && <MemberDialog onClose={close} />}
      {dialog === "m2" && <ImportDialog onClose={close} />}
      {dialog === "m3" && <IssueDialog onClose={close} />}
    </div>
  );
}
