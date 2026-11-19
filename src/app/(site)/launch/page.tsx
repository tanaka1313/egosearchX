import type { Metadata } from "next";
import { LaunchPage } from "@/components/launch/launch-page";
import { pageName } from "@/components/common/page-title";
import { ja } from "@/messages/ja";

export const metadata: Metadata = {
  title: pageName(ja, "/launch") ?? undefined,
};

export default function Page() {
  return <LaunchPage />;
}
