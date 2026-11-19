import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ja } from "@/messages/ja";
import { SITE_NAME } from "@/messages/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// サイト名・title・description の根拠は docs/requirements.md「SEO」の章。
// 静的 HTML は ja で出す（SEO）。en の画面では SiteMeta（components/common）が辞書で差し替える。
// 既定は noindex。検索に出すのはホームだけ（ホームの page.tsx で index にする）。
export const metadata: Metadata = {
  applicationName: SITE_NAME,
  title: {
    default: ja.meta.title,
    template: `%s｜${SITE_NAME}`,
  },
  description: ja.meta.description,
  robots: { index: false, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ダークモード固定（切替は作らない）。colorScheme で date 入力・select などもダークにする
    <html lang="ja" className="dark" style={{ colorScheme: "dark" }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
