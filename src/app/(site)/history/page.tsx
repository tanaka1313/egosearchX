import type { Metadata } from "next";
import { pageName } from "@/components/common/page-title";
import { HistoryPage } from "@/components/history/history-page";
import { ja } from "@/messages/ja";

export const metadata: Metadata = {
  title: pageName(ja, "/history") ?? undefined,
};

export default function Page() {
  return <HistoryPage />;
}
