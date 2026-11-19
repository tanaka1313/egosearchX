import { AppShell } from "@/components/common/app-shell";

// 本実装の全ページ共通の枠（画面仕様書 2章）。モック（/mock）は独自のシェルを持つので、ここには含めない
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
