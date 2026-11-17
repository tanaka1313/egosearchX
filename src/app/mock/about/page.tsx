"use client";
// MOCK: 破棄予定（#61）
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useStore } from "../_parts/store";
import { PageHead } from "../_parts/ui";

const FEATURES: { title: string; body: string }[] = [
  {
    title: "検索を組み立てる",
    body: "名前やタグを入れて、条件ボタン（RTを除く、画像つき、リストから…）を押すだけで、X の検索文字列ができます。期間も1タップで指定できます。",
  },
  {
    title: "X と Yahoo!リアルタイム検索の両方で開く",
    body: "同じ条件を、X と Yahoo の両方で開けます。Yahoo で使えない演算子は、黙って消さずに警告でお知らせします。",
  },
  {
    title: "条件ボタンを自分用に育てる",
    body: "よく使う条件をボタンにして、並べ替え・コピーができます。最近の検索から、ボタン候補（サジェスト）も出ます。",
  },
  {
    title: "保存して、いつものエゴサでまとめて開く",
    body: "気に入った検索はお気に入りに保存。複数まとめた「いつものエゴサ」を1タップで押すと、全部のタブが開きます。",
  },
  {
    title: "履歴・削除済み・URL解析",
    body: "前回の検索をすぐ再実行。消したものは削除済みから戻せます。X や Yahoo の検索 URL を貼ると、条件に分解してホームで編集できます。",
  },
];

const STEPS = [
  "検索したい名前やタグを入力する",
  "条件ボタンと期間を押して絞り込む",
  "［X で開く］または［Yahoo で開く］を押す",
];

export default function AboutPage() {
  const s = useStore();
  const router = useRouter();
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-3 md:p-4">
      <PageHead title="このサイトについて" />
      <p className="text-sm">
        EgoSearch
        Studio（X（Twitter））は、自分や推しの名前・タグを「エゴサ」するための検索を、組み立てて・保存して・まとめて開くための道具です。
        <strong>検索結果はこのサイトには表示しません。</strong>
        検索の URL を作って、X や Yahoo のページを開くだけです。
      </p>

      <section aria-label="使い方" className="space-y-2">
        <h2 className="font-bold">使い方（3ステップ）</h2>
        <ol className="space-y-1 text-sm">
          {STEPS.map((t, i) => (
            <li key={t} className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="できること" className="space-y-2">
        <h2 className="font-bold">できること</h2>
        <ul className="space-y-2">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{f.title}</div>
              <p className="text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="データの扱い" className="space-y-2">
        <h2 className="font-bold">データの扱い</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>X にログインしません。X の API も使いません。</li>
          <li>
            保存した内容（条件ボタン・お気に入り・履歴など）は、この端末のブラウザにだけ保存します。サーバーには送りません。
          </li>
          <li>履歴や閲覧内容を、勝手に読み取ることはしません。</li>
        </ul>
      </section>

      <section aria-label="好みの選び直し" className="space-y-2">
        <h2 className="font-bold">好みを選び直す</h2>
        <p className="text-sm text-muted-foreground">
          ホロライブ・にじさんじなど、興味のあるところを選ぶと、条件ボタンがあなた向けに整います。
        </p>
        <Button
          variant="outline"
          onClick={() => {
            s.setOnboardOpen(true);
            router.push("/mock");
          }}
        >
          興味を選び直す
        </Button>
      </section>
    </main>
  );
}
