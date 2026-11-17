"use client";
// MOCK: 破棄予定（#61）
import { PageHead } from "../_parts/ui";

const FEATURES: { title: string; body: string }[] = [
  {
    title: "検索を組み立てる",
    body: "名前やタグを入れて、条件ボタン（RTを除く、画像つき、リストから…）を押すだけで、X の検索文字列ができます。期間も1タップで指定できます。",
  },
  {
    title: "X と Yahoo!リアルタイム検索の両方で開く",
    body: "同じ条件を、X と Yahoo!リアルタイム検索の両方で開けます。Yahoo!リアルタイム検索で使えない演算子は、黙って消さずに警告でお知らせします。",
  },
  {
    title: "条件ボタンを自分用に育てる",
    body: "よく使う条件をボタンにして、並べ替え・コピーができます。最近の検索などから、ボタン候補（サジェスト）も出ます。",
  },
  {
    title: "保存して、いつものエゴサでまとめて開く",
    body: "気に入った検索はお気に入りに保存。複数まとめた「いつものエゴサ」を1タップで押すと、全部のタブが開きます。",
  },
  {
    title: "履歴・削除済み・URL解析",
    body: "前回の検索をすぐ再実行。消したものは削除済みから戻せます。X や Yahoo!リアルタイム検索の URL を貼ると、条件に分解してホームで編集できます。",
  },
];

const STEPS = [
  "検索したい名前やタグを入力する",
  "条件ボタンと期間を押して絞り込む",
  "［X で開く］または［Yahoo で開く］を押す",
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-3 md:p-4">
      <PageHead title="このサイトについて" />
      <section aria-label="このサイトを作った理由" className="space-y-2">
        <h2 className="font-bold">このサイトを作った理由</h2>
        <p className="text-sm">
          SNS
          の検索は毎日のことなのに、検索コマンドを覚えておく機能がありません。毎日いくつも検索するのに、その検索を保存してまとめて実行することもできませんでした。そんな負担を減らしたくて、このサイトを作りました。
        </p>
        <p className="text-sm">
          そこで、何度でも使える検索ボタン（条件ボタン）を用意し、毎日の調べ物のために「お気に入り」と「いつものエゴサ」の機能を加えました。
        </p>
        <p className="text-sm text-muted-foreground">
          <strong>検索結果はこのサイトには表示しません。</strong>
          検索の URL を作って、X（Twitter）や
          Yahoo!リアルタイム検索のページを開くだけです。
        </p>
      </section>

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
          <li>
            ホロライブ（カバー株式会社）とは関係のない、ファンが作った非公式のツールです。
          </li>
        </ul>
      </section>
    </main>
  );
}
