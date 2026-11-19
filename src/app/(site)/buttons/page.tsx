import type { Metadata } from "next";
import { pageName } from "@/components/common/page-title";
import { ChipsPage } from "@/components/chips/chips-page";
import { ja } from "@/messages/ja";

// タブの名前は「〇〇の管理」（見出しは画面側のまま）
export const metadata: Metadata = {
  title: pageName(ja, "/buttons") ?? undefined,
};

export default function ButtonsPage() {
  return <ChipsPage />;
}
