// MOCK: 破棄予定（#61）
import Link from "next/link";

const MOCKS = [
  {
    href: "/mock/mock1",
    name: "mock1　標準（現行）",
    note: "上部ナビで4画面（クイック実行／スタジオ／ランチャー／設定）を行き来する、最初のモック。",
  },
  {
    href: "/mock/mock2",
    name: "mock2　左ドロワー型",
    note: "項目はすべて左上の開閉ボタンのドロワーに集約。本体は編集とプレビューだけ。",
  },
  {
    href: "/mock/mock3",
    name: "mock3　直感操作＋お気に入り",
    note: "トップは X 検索だけ。触って気に入った条件をお気に入りに入れて使い回す。",
  },
  {
    href: "/mock/mock4",
    name: "mock4　Bento Grid＋コマンドパレット",
    note: "2026年のトレンドのタイル型レイアウトと Ctrl/⌘+K のパレット。",
  },
  {
    href: "/mock/mock5",
    name: "mock5　配信者目線のアイデア集",
    note: "配信後エゴサ、タグまとめ開き、ネタバレ除外など「あったら嬉しい」を詰めた案。",
  },
  {
    href: "/mock/mock6",
    name: "mock6　決定案（mock3 を土台に全機能を集約）",
    note: "押すだけの条件ボタン、ヘッダー固定のエゴサグループ2件、フッターに最後の履歴、編集は左メニュー（70%）のページへ。要件・画面仕様書の基準。ランチャーは /mock/mock6/launch。",
  },
];

export default function MockIndex() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-bold">画面モック一覧</h1>
      <p className="text-sm text-muted-foreground">
        デザイン案を並べて比べるための使い捨てです。すべて固定のダミーデータで動きます。
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {MOCKS.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              className="block h-full rounded-lg border p-4 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block font-bold">{m.name}</span>
              <span className="mt-1 block text-sm">{m.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
