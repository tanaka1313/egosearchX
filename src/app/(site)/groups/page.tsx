import type { Metadata } from "next";
import { pageName } from "@/components/common/page-title";
import { GroupsPage } from "@/components/groups/groups-page";
import { ja } from "@/messages/ja";

export const metadata: Metadata = {
  title: pageName(ja, "/groups") ?? undefined,
};

export default function Page() {
  return <GroupsPage />;
}
