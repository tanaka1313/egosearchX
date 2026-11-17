"use client";
// MOCK: 破棄予定（#61）
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mono } from "../_components/mock-dialog";

function Idea() {
  return (
    <span className="rounded border border-dashed px-1.5 py-0.5 text-xs text-muted-foreground">
      アイデア（MVP対象外）
    </span>
  );
}

const TAGS = ["#配信タグA", "#ファンアートタグA", "#切り抜きタグA"];
const NG = ["ネタバレ語A", "ネタバレ語B"];

export default function Mock5() {
  const [live, setLive] = useState(true);
  const [tags, setTags] = useState<string[]>(TAGS);
  const [ng, setNg] = useState(true);
  const [collab, setCollab] = useState("メンバーB");
  const [checked, setChecked] = useState(false);
  const [msg, setMsg] = useState("");

  const toggleTag = (t: string) =>
    setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  const ngPart = ng ? ` ${NG.map((w) => `-${w}`).join(" ")}` : "";
  const queries = tags.map((t) => `${t} since:2026-11-17${ngPart}`);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <p className="text-sm text-muted-foreground">
        配信者になったつもりで「こんな機能があったら」を並べた案です。どれも URL
        を組み立てて開くだけの範囲です。
      </p>

      <section className="space-y-2 rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">配信モード</h2>
          <Idea />
          <label className="ml-auto flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={live}
              onChange={(ev) => setLive(ev.target.checked)}
            />
            今日は配信あり
          </label>
        </div>
        {live ? (
          <>
            <p className="text-sm">
              配信タグから、今日の日付のエゴサをまとめて作ります。
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="タグ"
            >
              {TAGS.map((t) => (
                <button
                  key={t}
                  aria-pressed={tags.includes(t)}
                  onClick={() => toggleTag(t)}
                  className={`rounded-full border px-3 py-1 text-sm ${tags.includes(t) ? "bg-foreground text-background" : ""}`}
                >
                  {tags.includes(t) ? "✓ " : ""}
                  {t}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ng}
                onChange={(ev) => setNg(ev.target.checked)}
              />
              ネタバレ・荒らし除外ワードを付ける（{NG.join("、")}）
            </label>
            {queries.map((q) => (
              <Mono key={q}>{q}</Mono>
            ))}
            {queries.length === 0 && (
              <p className="text-sm text-muted-foreground">
                タグを1つ以上選んでください
              </p>
            )}
            <Button
              disabled={queries.length === 0}
              onClick={() =>
                setMsg(
                  `配信後エゴサ：${queries.length}個のタブを開きました（ダミー）`,
                )
              }
            >
              ▶ 配信後エゴサを開く（{queries.length}個）
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            配信なしの日は、通常のエゴサだけを表示します。
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">今日のエゴサ</h2>
          <Idea />
        </div>
        <p className="text-sm">
          前回実行（昨日 22:30）からの新着だけを開きます。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setChecked(true);
              setMsg("前回実行時からの期間で開きました（ダミー）");
            }}
          >
            ▶ 前回から開く
          </Button>
          <span className="text-sm">
            {checked ? "✓ 今日はチェック済み" : "□ 今日は未チェック"}
          </span>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold">コラボ相手で探す</h2>
          <Idea />
        </div>
        <label className="flex flex-wrap items-center gap-2 text-sm">
          相手：
          <select
            value={collab}
            onChange={(ev) => setCollab(ev.target.value)}
            className="rounded border px-2 py-1"
          >
            <option>メンバーB</option>
            <option>メンバーC（卒業）</option>
          </select>
        </label>
        <Mono>{`"メンバーA" "${collab.replace("（卒業）", "")}" -filter:retweets`}</Mono>
        <Button
          variant="outline"
          onClick={() =>
            setMsg(`${collab}とのコラボ検索を開きました（ダミー）`)
          }
        >
          X で開く
        </Button>
      </section>

      {msg && (
        <p role="status" className="rounded border bg-muted px-3 py-2 text-sm">
          {msg}
        </p>
      )}
    </main>
  );
}
