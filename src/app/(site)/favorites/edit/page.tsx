import type { Metadata } from "next";
import { pageName } from "@/components/common/page-title";
import { FavoriteEditPage } from "@/components/favorites/favorite-edit-page";
import { ja } from "@/messages/ja";

export const metadata: Metadata = {
  title: pageName(ja, "/favorites/edit") ?? undefined,
};

export default function Page() {
  return <FavoriteEditPage />;
}
