import { AppShell } from "@/components/common/app-shell";

// 全ページ共通の枠（画面仕様書 2章）
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
