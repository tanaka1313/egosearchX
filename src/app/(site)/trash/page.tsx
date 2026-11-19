import type { Metadata } from "next";
import { pageName } from "@/components/common/page-title";
import { TrashPage } from "@/components/trash/trash-page";
import { ja } from "@/messages/ja";

export const metadata: Metadata = {
  title: pageName(ja, "/trash") ?? undefined,
};

export default function Page() {
  return <TrashPage />;
}
