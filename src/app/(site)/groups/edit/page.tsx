import type { Metadata } from "next";
import { pageName } from "@/components/common/page-title";
import { GroupEditPage } from "@/components/groups/group-edit-page";
import { ja } from "@/messages/ja";

export const metadata: Metadata = {
  title: pageName(ja, "/groups/edit") ?? undefined,
};

export default function Page() {
  return <GroupEditPage />;
}
