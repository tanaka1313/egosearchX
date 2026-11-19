import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CorruptNotice } from "@/components/common/corrupt-notice";
import { SiteFooter } from "@/components/common/site-footer";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// サイト名・title・description の根拠は docs/requirements.md「SEO」の章。
// metadata は静的で言語を切り替えられないため、辞書（#72）には移さない。en の title・description は #75。
export const metadata: Metadata = {
  applicationName: "Hololive EgoSearch",
  title: {
    default:
      "ホロライブのエゴサ用 X（Twitter）検索コマンド保存｜Hololive EgoSearch",
    template: "%s｜Hololive EgoSearch",
  },
  description:
    "ホロライブの推しを X（Twitter）でエゴサする検索コマンドを保存して、毎日の検索をワンタップで開けます。Yahoo!リアルタイム検索にも対応。ログイン不要、ファンが作った非公式ツールです。",
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
        <Providers>
          <div className="flex min-h-screen flex-col">
            <CorruptNotice />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
