import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";
import {
  SITE_ALTERNATE_NAMES,
  SITE_NAME,
  SITE_URL,
  websiteJsonLd,
} from "@/messages/site";

// 検索に出すのはホームだけ（既定は noindex。src/app/layout.tsx）
export const metadata: Metadata = { robots: { index: true, follow: true } };

const JSON_LD = websiteJsonLd({
  name: SITE_NAME,
  alternateNames: SITE_ALTERNATE_NAMES,
  url: SITE_URL,
});

export default function Home() {
  return (
    <>
      {/* WebSite の構造化データはホームにだけ置く（要件定義書 9.2） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON_LD }}
      />
      <HomePage />
    </>
  );
}
