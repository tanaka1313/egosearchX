// MOCK: 破棄予定（#61）
import { Shell } from "./_parts/shell";
import { StoreProvider } from "./_parts/store";

export default function Mock6Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <Shell>{children}</Shell>
    </StoreProvider>
  );
}
