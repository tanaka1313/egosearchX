"use client";
// MOCK: 破棄予定（#61）
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EMPTY_PERIOD } from "../_parts/data";
import { nid, useStore } from "../_parts/store";
import { PageHead } from "../_parts/ui";

const SAMPLE =
  "https://x.com/search?q=%22%E3%83%A1%E3%83%B3%E3%83%90%E3%83%BCA%22%20-filter%3Aretweets%20foo%3Abar&f=live";

/** 簡易解析（モック）。本実装のパーサーではない */
function parse(url: string): { tokens: string[]; err?: string } {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return { tokens: [], err: "URL として読み取れません" };
  }
  const host = u.hostname.replace(/^www\./, "");
  if (!["x.com", "twitter.com", "search.yahoo.co.jp"].includes(host))
    return {
      tokens: [],
      err: "X または Yahoo!リアルタイム検索の URL ではありません",
    };
  const q = u.searchParams.get("q") ?? u.searchParams.get("p");
  if (!q) return { tokens: [], err: "検索語（q / p）が含まれていません" };
  return { tokens: q.split(/\s+/).filter(Boolean) };
}

export default function ImportPage() {
  const s = useStore();
  const router = useRouter();
  const [url, setUrl] = useState(SAMPLE);
  const r = parse(url);
  const known = (t: string) =>
    t.startsWith('"') ||
    t.startsWith("-filter:") ||
    t.startsWith("filter:") ||
    !t.includes(":");

  return (
    <main className="mx-auto max-w-3xl space-y-3 p-3 md:p-4">
      <PageHead title="URL解析" />
      <p className="text-sm text-muted-foreground">
        X／Yahoo!リアルタイム検索の URL
        を貼ると、条件に分解します。解析できない部分は「生トークン」として保持し、URL
        に戻したときに欠けません。既存のデータは上書きしません。
      </p>
      <textarea
        value={url}
        onChange={(ev) => setUrl(ev.target.value)}
        aria-label="取り込む URL"
        className="h-24 w-full rounded-lg border p-2 font-mono text-xs"
      />
      {r.err ? (
        <p role="alert" className="text-sm font-medium">
          ⚠ {r.err}
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {r.tokens.map((t, i) => (
            <li
              key={`${t}${i}`}
              className="flex items-center gap-2 rounded border px-2 py-1"
            >
              <code className="font-mono text-xs">{t}</code>
              <span className="text-xs text-muted-foreground">
                {known(t) ? "条件" : "生トークン（解析できなかった部分）"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!!r.err}
          onClick={() => {
            s.setWord("");
            s.setDetail((d) => ({ ...d, raw: r.tokens.join(" ") }));
            s.setNotice(
              "URL を解析しました（詳細条件の生トークンに入っています）",
            );
            router.push("/mock");
          }}
        >
          ホームで編集する
        </Button>
        <Button
          variant="outline"
          disabled={!!r.err}
          onClick={() =>
            s.saveFav({
              id: nid("f"),
              name: "取り込んだ検索",
              query: r.tokens.join(" "),
              period: EMPTY_PERIOD,
              engine: "x",
              last: "未実行",
            })
          }
        >
          新規お気に入りとして保存
        </Button>
      </div>
    </main>
  );
}
