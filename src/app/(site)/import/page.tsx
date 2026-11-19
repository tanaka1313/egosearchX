import type { Metadata } from "next";
import { pageName } from "@/components/common/page-title";
import { ImportPage } from "@/components/import/import-page";
import { ja } from "@/messages/ja";

export const metadata: Metadata = {
  title: pageName(ja, "/import") ?? undefined,
};

export default function Page() {
  return <ImportPage />;
}
