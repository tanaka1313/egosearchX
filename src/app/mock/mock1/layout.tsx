// MOCK: 破棄予定（#61）
import Link from "next/link";

const NAV = [
  { href: "/mock/mock1", label: "クイック実行" },
  { href: "/mock/mock1/studio", label: "スタジオ" },
  { href: "/mock/mock1/launch", label: "ランチャー" },
  { href: "/mock/mock1/settings", label: "設定" },
];

export default function Mock1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
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
      {children}
    </>
  );
}
