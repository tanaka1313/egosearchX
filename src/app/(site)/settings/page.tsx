import type { Metadata } from "next";
import { pageName } from "@/components/common/page-title";
import { SettingsPage } from "@/components/settings/settings-page";
import { ja } from "@/messages/ja";

// title は ja のページ名。末尾の「｜サイト名」は layout のテンプレートが付ける
export const metadata: Metadata = {
  title: pageName(ja, "/settings") ?? undefined,
};

export default function Page() {
  return <SettingsPage />;
}
