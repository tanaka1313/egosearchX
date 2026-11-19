import type { Metadata } from "next";
import { AboutPage } from "@/components/about/about-page";
import { pageName } from "@/components/common/page-title";
import { ja } from "@/messages/ja";

// title は ja のページ名。末尾の「｜サイト名」は layout のテンプレートが付ける
export const metadata: Metadata = {
  title: pageName(ja, "/about") ?? undefined,
};

export default function Page() {
  return <AboutPage />;
}
