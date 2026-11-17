// MOCK: 破棄予定（#61）
import { Shell } from "./_parts/shell";
import { StoreProvider } from "./_parts/store";

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
        ⚠ モック（紙芝居）— 破棄予定。動作はすべてダミーです（作成 #60 ／ 破棄
        #61）
      </div>
      <div className="flex-1">
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </div>
    </div>
  );
}
