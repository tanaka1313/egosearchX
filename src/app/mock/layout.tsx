// MOCK: 破棄予定（#61）
import Link from "next/link";

const NAV = [
  { href: "/mock", label: "クイック実行" },
  { href: "/mock/studio", label: "スタジオ" },
  { href: "/mock/launch", label: "ランチャー" },
  { href: "/mock/settings", label: "設定" },
];

export default function MockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div
        role="note"
        className="sticky top-0 z-50 border-b-2 border-dashed border-amber-600 bg-amber-300 px-3 py-1.5 text-center text-sm font-bold text-amber-950"
      >
        ⚠ モック（紙芝居）— 破棄予定。動作はすべてダミーです（作成 #60 ／ 破棄
        #61）
      </div>
      <header className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b px-4 py-2">
        <span className="font-bold">EgoSearch Studio</span>
        <nav aria-label="画面切替" className="flex flex-wrap gap-4 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="underline-offset-4 hover:underline"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
