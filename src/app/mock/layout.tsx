// MOCK: 破棄予定（#61）
import Link from "next/link";

export default function MockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div
        role="note"
        className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-4 border-b-2 border-dashed border-amber-600 bg-amber-300 px-3 py-1.5 text-sm font-bold text-amber-950"
      >
        <Link href="/mock" className="underline underline-offset-4">
          ← モック一覧
        </Link>
        <span>
          ⚠ モック（紙芝居）— 破棄予定。動作はすべてダミーです（作成 #60 ／ 破棄
          #61）
        </span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
