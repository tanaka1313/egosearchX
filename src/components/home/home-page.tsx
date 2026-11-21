"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { MyStreamersDialog } from "@/components/dialogs/my-streamers-dialog";
import { ConditionFrame } from "@/components/search/condition-frame";
import { OpenBar } from "@/components/search/open-bar";
import {
  HomeScopeProvider,
  useSearchScope,
} from "@/components/search/search-scope";
import { useI18n } from "@/store/i18n-context";
import { FavoritesFold } from "./favorites-fold";
import { PAGE_MAIN } from "@/components/common/layout";

/**
 * S1：ホーム（画面仕様書 4章）。検索語を入れ、条件ボタンを押し、開く。押すだけで使える画面にする
 * （追加・編集・削除・並べ替えはメニューのページ）。入力 → クエリ → 開くボタンを1かたまりにし、
 * 条件ボタン・期間・詳細条件は1つの「条件」の枠に入れ、詳細条件の末尾にも同じ開くボタン群を置く。
 */
export function HomePage() {
  return (
    <HomeScopeProvider>
      <HomeBody />
      <MyStreamersDialog />
    </HomeScopeProvider>
  );
}

function HomeBody() {
  const { t } = useI18n();
  const { word, setWord, run } = useSearchScope();
  return (
    <main className={`${PAGE_MAIN} space-y-4`}>
      {/* このサイトを作った理由（1〜2文）。機能の一覧は書かない */}
      <p className="text-sm text-muted-foreground">
        {t.home.reason}
        <Link
          href="/about"
          className="ml-1 whitespace-nowrap underline underline-offset-4"
        >
          {t.home.more}
        </Link>
      </p>

      <section aria-label={t.home.searchSection} className="space-y-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={word}
            onChange={(ev) => setWord(ev.target.value)}
            onKeyDown={(ev) => {
              // 日本語入力の確定の Enter では開かない
              if (
                ev.key === "Enter" &&
                !ev.nativeEvent.isComposing &&
                ev.keyCode !== 229
              )
                run("x");
            }}
            aria-label={t.home.wordLabel}
            placeholder={t.home.wordPlaceholder}
            className="w-full rounded-full border-2 py-2.5 pr-4 pl-11 text-lg"
          />
        </div>
        <OpenBar />
      </section>

      <ConditionFrame footer={<OpenBar />} />

      <FavoritesFold />
    </main>
  );
}
