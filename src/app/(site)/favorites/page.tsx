import type { Metadata } from "next";
import { pageName } from "@/components/common/page-title";
import { FavoritesPage } from "@/components/favorites/favorites-page";
import { ja } from "@/messages/ja";

export const metadata: Metadata = {
  title: pageName(ja, "/favorites") ?? undefined,
};

export default function Page() {
  return <FavoritesPage />;
}
