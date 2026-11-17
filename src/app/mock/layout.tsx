// MOCK: 破棄予定（#61）
import { MockBanner } from "./_parts/banner";
import { Shell } from "./_parts/shell";
import { StoreProvider } from "./_parts/store";

export default function MockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <div className="flex flex-col">
        <MockBanner />
        <div className="flex-1">
          <Shell>{children}</Shell>
        </div>
      </div>
    </StoreProvider>
  );
}
