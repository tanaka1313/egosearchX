# #76 S3 お気に入りと S3-E 編集ページ

1. Goal: `/favorites`（一覧・絞り込み・並べ替え・実行・削除）と `/favorites/edit?id=`（文字列を検索の組み立てに展開して直す）を作り、編集で一致するいつものエゴサの項目も更新する。
2. Plan:
   - [x] ブランチ `feature/favorites-page`、テスト先行（Red 確認）
   - [x] `LocalScopeProvider`（ページの中だけの検索の組み立て）。`HomeScopeProvider` と計算部分 `useScopeCore` を共有
   - [x] `previous-path.ts`（キャンセルの戻り先。`app-shell` が記録）、`/favorites/edit` のタブ名
   - [x] S3：`FavoriteRow`（バッジ・⚠・前回／未実行）、絞り込み、並べ替え、実行、削除（［元に戻す］）
   - [x] S3-E：展開、保存（いつものエゴサの連動・件数のトースト・［元に戻す］）、複製、検証、id 不明
   - [x] 辞書 ja／en、docs（api-spec 7.1、implementation-plan）
   - [x] `make check`（テスト771件）、Chrome（Playwright）で 360px／1280px
   - [ ] main へマージして push、#76 を閉じる
3. Verification: `make check`。Playwright：360px で横にはみ出さない・3行の高さが同じ（69px）・省略・直接開いてキャンセルで一覧へ・保存でトースト、1280px の配置、コンソールのエラー 0。
4. Review:
   - 判断：S3-E の条件ボタンの値の変更は `chips.setValue` を使わない（`on: true` も保存済みに書き、ホームの ON が変わるため）。`chips.save` で値だけ差し替える。ON はページの中だけ。
   - 判断：S3-E は、ストアが ready になる前は展開も「見つからない」の判定もしない（空の条件ボタンで展開して固定されるのを防ぐ。テストあり）。
   - 判断：S3-E の［X で開く］の履歴は `kind: "other"`（保存前の試し開き。お気に入りの実行ではないので前回の日時は動かない）。
   - 変更：全体実行で既存テストが負荷でばらばらにタイムアウトしたため、`vitest.config.mts` の `testTimeout` を30秒にした（単独実行では通る。ファイルごとの上書きを増やさない）。
   - **未確認**：並べ替え（ドラッグ・キーボード）は jsdom で試せず、実ブラウザでも未操作。S3-E の再読み込み（ページを開き直す）は直接開く操作で確認済み。
   - **次に壊れやすい点**：#77（S4-E）は `LocalScopeProvider` を同じ形で使う。`source` は今 `kind: "other"` 固定。S3 の行（⚠・バッジ）と同じ部品を S4 が使うなら `FavoriteRow` の切り出しを見直す。

# #75 S10 このサイトについて と SEO

1. Goal: `/about` を作り、ja／en の title・description を辞書から出し、ホームにだけ WebSite の JSON-LD を置き、下層ページに固有の title を付け、ホーム以外を検索に出さない。
2. Plan:
   - [x] ブランチ `feature/about-seo`、テスト先行（Red 確認：`./site`・`./page-title`・`./about-page` が無く失敗）
   - [x] `messages/site.ts`（サイト名・別名・`SITE_URL`・`websiteJsonLd`）、辞書 `meta`・`aboutPage`（ja／en）
   - [x] `common/page-title.ts`（`MENU_ITEMS` から導く）、`common/site-meta.tsx`、`about/about-page.tsx`
   - [x] `layout.tsx` は辞書から出し既定 `noindex`、ホームだけ `index` と JSON-LD、`/about`・`/buttons`・`/import` に title
   - [x] docs（requirements 7・9.3、CLAUDE.md、screen-spec 5.9、api-spec 7.1、implementation-plan）
   - [x] make check（テスト740＋30件）、`out/` の HTML、Playwright（en への切替・移動・360px／1280px）
   - [x] 新 Issue #90「本番 URL の決定」、#41 の依存へ追記、#75 の完了条件を直した
   - [x] main へマージして push、#75 を閉じる
3. Verification: `make check`、`npm run format:check`。`out/index.html` だけに JSON-LD、ホーム以外は `noindex`。Playwright：en に切り替えて ホーム → about → buttons → import → ホームと移るたびに title・description が en。
4. Review:
   - 決定（ユーザー）：本番 URL は未定で空（Issue で管理）。title に「非公式」は入れない（description・このサイトについて・フッター）。下層の title を `/about`・`/buttons`・`/import` でそろえ、管理ページのタブだけ「〇〇の管理」。ホーム以外は検索に出さない（既定 noindex）。
   - 発見：ページ移動のあと Next が静的な ja の title を書き戻す（1度だけ書く実装は、en で移動すると ja に戻った。Playwright で発見）。`SiteMeta` は `MutationObserver` で head を見て合わせ直す。
   - 判断：`layout.tsx` の title・description は辞書の `ja.meta` から出す（以前の「辞書に移さない」を取り消し。en の抜けは型エラーになり、1か所に集まる）。
   - **未確認**：en の文言は暫定（#67）。「Manage Condition buttons」は en のタブ名として硬い（#67 で見直す）。`/mock` と `/launch` も noindex だが、ランチャーの個別の title は #35。
   - **次に壊れやすい点**：`MENU_ITEMS` に無いページ（`/favorites/edit`、`/groups/edit`、`/launch`）の title はサイト全体の title になる（#76・#77・#35 で足す）。本番 URL が決まったら `SITE_URL` に入れる。

# #31 S7 URL解析ページ

1. Goal: メニューの `/import` で、X／Yahoo!リアルタイム検索の URL を貼ると条件に分けて見せ、［ホームで編集する］でホームの組み立てに展開、［新規お気に入りとして保存］で新規に保存できる。
2. Plan:
   - [x] ブランチ `feature/import-page`、テスト先行（Red 確認：`./import-page` が無く失敗）
   - [x] `ImportPage`（`components/import`）、`app/(site)/import/page.tsx`、辞書 ja／en（`importPage`）
   - [x] ユーザー決定：保存はシートを開く。名前の初期値は「<検索語> の検索」、`EnginePicker` の初期値は貼った URL の検索先（S5 も同じ）
   - [x] docs（screen-spec 3.10・5.6・5.8、requirements 11章、api-spec 7.1、implementation-plan）
   - [x] make check（テスト723件）・format:check（自分の変更は問題なし）
   - [x] Chrome（Playwright）で 360px／1280px
   - [x] main へマージして push、#31 と #78 を更新
3. Verification: `make check`、`npm run format:check`。本物のバックエンド＋MemoryAdapter のテスト（X／Yahoo の URL、3つの理由、空入力、ホームで編集で ON/OFF・home・`/` へ移動、既存お気に入りが不変、保存シート、英語）。Playwright：360px で横にはみ出さない・シートは下から・フォーカスは［×］・ホームへ展開できる・コンソールのエラー 0。
4. Review:
   - 判断：［ホームで編集する］の照合は「表示」の条件ボタンだけ（要件定義書 11.4 ①）。ON/OFF は非表示も含む全件を合わせ、非表示の ON は OFF にして詳細条件へ回す（テストあり）。モックにあった「URL を解析しました」の通知は、画面仕様書 5.8 に無いので足していない。
   - 判断：保存シートの文言は、ホームの保存シートの辞書（名前・保存・キャンセル・保存しました・失敗）を流用した。
   - **未確認**：Yahoo!リアルタイム検索の URL を実ブラウザで貼る操作（テストでは確認済み）。キーボードだけでの通し操作（シートの［×］へのフォーカスのみ確認）。
   - **次に壊れやすい点**：#78 の［☆ お気に入りに保存］は、同じ保存シートを使うなら `SaveForm` を共通部品へ切り出す（今は `import-page.tsx` の中）。CORRUPT のとき［ホームで編集する］はチップを書かず `home_set` だけして移動する。

# #74 S2 条件ボタンのページと D1 編集シート

1. Goal: メニューの `/buttons` で、条件ボタンの一覧・並べ替え・表示の切替・コピー・削除（元に戻す）・追加・編集（D1）・サジェストの採用ができ、「新」印が出る。
2. Plan:
   - [x] ブランチ `feature/chip-page`
   - [x] ストア `newChipIds`・`chip_seen`（テスト：入る・外れる・保存しない・作り直しで空）、バックエンドの「削除→復元で元の位置」のテスト
   - [x] `PageHead`・`EmptyState`（common）、`ChipEditorSheet`（D1）、`ChipsPage`、`app/(site)/buttons/page.tsx`、辞書 ja／en
   - [x] `ChipRow` が `isNew` を渡し、ホームで押す・値を変えると `chip_seen`
   - [x] docs（api-spec 7.1、implementation-plan）
   - [x] make check（テスト711件）・format:check
   - [x] Chrome（Playwright）で 360px／1280px
   - [x] main へマージして push、#74 の完了条件を直して閉じる
3. Verification: `make check`、`npm run format:check`。本物のバックエンド＋MemoryAdapter のテスト（一覧・表示切替・コピー・削除と元に戻す・プリセット追加・0件・上限・サジェスト採用と「新」・D1 の追加／編集／各エラー／リスト／Yahoo の注意／フォーカス復帰）。Playwright：360px で横にはみ出さない・下からのシート・1280px・キーボードでの並べ替えと再読み込み後の保持・英語。
4. Review:
   - 決定：「新」印はストアのメモリだけ（api-spec 1.1）。`ChipSchema` は変えない。ページは `HomeScopeProvider` で包み、条件ボタンとサジェストをホームと同じものとして読む。Yahoo の注意は `url.plan` の警告をそのまま出す（演算子の直書きなし）。
   - 判断：`ChipInput` に `isPreset` は無い（更新では保たれる）ので渡さない。日付の形式違いは `type="date"` の入力欄が受け付けず（空＝行なし扱い）、`chip.badDate` は `validateChip` の単体テストで見る。
   - **テスト先行（Red）**：ストアの `newChipIds` は Red を確認。ページ・D1 のテストは実装の後に書いた（Red 未確認）。
   - 観測：新しいテストファイルは jsdom で重く、並列で5秒を超えたので、このファイルだけ30秒にした（`word-set-dialog.test.tsx` と同じ）。
   - **未確認**：マウスのドラッグ（キーボードの並べ替えのみ確認）、サジェストの採用（履歴が無く候補が出なかった。jsdom のテストまで）。
   - **次に壊れやすい点**：サジェストの候補は `HomeScopeProvider` のもので、履歴0件のとき starter と同じ文字列は除かれる（S2 は starter を出さないので、規則の候補が1件隠れうる）。`newChipIds` は `data_reset` で空にする。

# #89 検索ワード集（D4 ダイアログと履歴0件のときのホーム表示）

1. Goal: 条件の枠の［検索ワード集］で D4 を開けるようにし、履歴0件のときは starter（約60件）を条件ボタンの続きに出す。
2. Plan:
   - [x] ブランチ `feature/word-set`、テスト先行（Red 確認：D4 のテストが import できず、starter のテストが失敗）
   - [x] `SearchScope` に `starters`・`wordSet`、`WordChip`（`suggestionTokens` を切り替える。ON を新設しない）、`ChipRow`（starter を連結して先頭8個、サジェストから starter を除く）
   - [x] `WordSetDialog`（radix Dialog。［×］へ初期フォーカス、起点へフォーカス復帰、本文だけスクロール、下端に QueryPreview と［閉じる］）、辞書 ja／en
   - [x] docs（api-spec 7.1、implementation-plan）
   - [x] make check（テスト686件）・format:check
   - [x] main へマージして push、#89 の完了条件を直して閉じる
3. Verification: `make check`、`npm run format:check`。履歴0件で starter が並び N に入る／履歴1件で出ない／押して同じ位置のまま ON・OFF／D4 の開く・フォーカス・絞り込み・ON/OFF・クエリ表示・閉じる3通り・フォーカス復帰・英語のグループ名。
4. Review:
   - 決定：ON は `suggestionTokens`（画面ごとの状態）。ホームの ON が他画面へ漏れないのはこの構造による。`SearchScope` の型に `starters`・`wordSet` を足したので、#76・#77 の `LocalScopeProvider` が渡し忘れると型エラーになる。
   - 判断：既存の条件ボタンの並びのテストは、履歴0件だと starter が混ざるので、履歴を1件入れて前提にした（`recordOneHistory`）。D4 の全件（約600個）は jsdom で重く、ファイルだけタイムアウトを30秒にした。
   - **未確認**：Chrome での 360px／1280px・日英の目視（ブラウザ操作の道具が無かった）。jsdom のテストまで。トーストの z-index（70）は D4 のオーバーレイ（60）より前面なので隠れない（コード上の確認のみ）。
   - **完了条件の移し替え**：S3-E・S4-E で ON が各ページの状態になる行は、画面がまだ無いので #76・#77 へ移した。
   - **次に壊れやすい点**：本番データ（#70）で空白や `OR` を含む query が入ると、1つのトークンとして `suggestionTokens` に入る。starter の件数が60を超える分は `query.starters` が切る。

# #30・#32 S1 ホーム（検索の組み立て・クエリ表示・警告欄・開くボタン）

1. Goal: ホーム `/` を画面仕様書 3・4章どおりに作る。部品は `SearchScope`（検索の組み立ての状態）だけを読む形にして、S3-E・S4-E で使い回せるようにする。
2. Plan:
   - [x] ブランチ `feature/home`。ユーザーの決定：#30 と #32 を一緒に作って両方閉じる（検索ワード集 D4・履歴0件の約60件は #89）
   - [x] ストア `home` slice（保存しない。`home_set`）とテスト（Red 確認）
   - [x] 辞書（ja／en）、`SearchScope`・`HomeScopeProvider`、`BlockedContext`（本文の画面から帯の下の表示を出す）
   - [x] #30：`QueryPreview`（実験的バッジ）・`WarningNote`
   - [x] 条件ボタン（値付き・サジェスト）・`ChipRow`・`PeriodPicker`・`DetailPanel`
   - [x] `Sheet`（radix Dialog）・`EnginePicker`・`OpenBar`・`SaveSheet`・`ConditionFrame`
   - [x] `FavoritesFold`（開閉は `prefs.favOpen`）・`HomePage`・`app/(site)/page.tsx`。旧 `page.test.tsx` は削除
   - [x] docs（api-spec 7.1、implementation-plan）
   - [x] make check（テスト675件）・format:check
   - [x] main へマージして push、#30・#32 の完了条件を直して閉じる
3. Verification: `make check`、`npm run format:check`。本物のバックエンド＋MemoryAdapter のテスト（入力→クエリ、Enter／IME、blockers で開く・コピー・保存が止まる、ON の保存と再読み込み、値付きの途中の値、期間指定中の日付ボタン、［もっと開く］の N、サジェスト、警告欄の位置、実験的バッジ、保存シート、お気に入りの開閉と実行、ページを移って戻っても検索語が残る）。`grep "Dialog|alert(|confirm("` が警告・クエリ表示のファイルで空。
4. Review:
   - 決定：ホームの検索の状態はストアの `home`（保存しない）。部品は `components/search` に置き、モックから import しない。値付きの入力は正しい値のときだけ保存（入力中の値は部品の中）。開くときは `built.stored`（`text` ではない）。
   - 判断：サジェストの候補は、この検索だけ ON にした候補を除いた検索から求める（そうしないと、押した候補が一覧から消えて外せない。テストで発見）。blockers のとき、開くボタンは `disabled`、Enter・コピー・保存も止める。
   - 判断：「新」バッジは表示の口（`isNew` prop）だけ。出どころ（サジェストの採用）は #74。検索ワード集（D4）・履歴0件の約60件は #89。
   - **未確認**：Chrome での 360px／1280px の目視（ブラウザ操作の道具が無かった）。書き出した HTML に要素があることと、jsdom のテストまで。#32 の完了条件「Chrome で確認」は残る。
   - **次に壊れやすい点**：jsdom は CSS が効かないので、折り返し・固定幅・ガタつきは目視が要る。`LocalScopeProvider`（S3-E・S4-E）は #76・#77 で同じ `SearchScope` の形で作る。`HomeScopeProvider` は `home` の差し替え（S7 の［ホームで編集する］）に対応する。

# #73 シェル（ヘッダー・興味の対象の切替・帯・フッター・左メニュー・トースト）

1. Goal: 以降の画面が載る全ページ共通の枠（画面仕様書 2章）を、辞書・`@/api`・ストア経由で作る。
2. Plan:
   - [x] ブランチ `feature/shell`、テスト先行（Red 確認：`format-date`・`app-shell` が無く失敗）
   - [x] route group `(site)` に AppShell、ルートの `layout.tsx` は Providers だけ（モックに二重に出ない）
   - [x] InterestPicker・GroupStrip（✓は `clock.isToday(lastRunAt)`）・BlockedNotice・SiteFooter（2行・固定）・SiteMenu（ドロワー／サイドバー）・SiteHeader・Toast・`useRunner`
   - [x] 辞書 ja／en、`formatRunAt`（`M/D HH:mm`）、`CorruptNotice` を帯の下へ・失敗はトースト
   - [x] docs（screen-spec 2.2、api-spec 7.1、implementation-plan）
   - [x] make check（テスト606件）・format:check
   - [x] main へマージして push、#73 を閉じ、#81・#77・#35 に追記
3. Verification: `make check`、`npm run format:check`。ピッカーの保存と再読み込み、帯の先頭2件・✓・両方で2タブ・ブロック表示、フッターの再実行が lastRunAt を動かさない、メニューのフォーカス・Esc・`aria-current`、/launch でフッター無し、CORRUPT で帯が空。
4. Review:
   - 決定（ユーザー）：帯でブロックされたら、帯の下に `role="status"` で件数・個別リンク・［×］。
   - 判断：`window.open` に `noopener` を渡さない（戻り値が常に null でブロックを検出できない）。開けたら `opener` を切る。コマンドパレットは #81（メニュー項目の定義 `menu-items.ts` は共用できる形）。VersionDialog はフッターからメニューへ移した。
   - **未確認**：Chrome での 360px／1280px の目視（拡張が使えなかった）。書き出した HTML に要素があることと、jsdom のテストまで。完了条件の「Chrome で確認」は残る。
   - **次に壊れやすい点**：jsdom は CSS が効かないのでサイドバーも DOM に出る（テストは nav の中に絞る）。`.next/dev/types` が古いと tsc が落ちる（git 管理外。該当ファイルを消す）。CORRUPT 中は興味の対象を選んでも保存されず見た目も変わらない。

# #87 保存データが壊れたときの初期化（data.reset）

1. Goal: 保存データが壊れて読めない（CORRUPT）とき、全ページ共通の表示と確認ダイアログ（D3）を経て、保存データをすべて破棄しプリセットから作り直せるようにする。
2. Plan:
   - [x] ブランチ `feature/data-reset`、テスト先行（Red 確認：dao・backend・store・i18n・notice の各テストが失敗）
   - [x] `kv-dao.ts`：表の名前を `TABLE_NAMES` に集め（`Table` の名前もこの型）、`wipeKv(kv)` が版1〜今の版の全表と meta を名前で消す
   - [x] 契約 `DataApi.reset()`、`backend/data.ts`（`wipeKv` → `opened = null` → 初回として開き直す）
   - [x] ストア `data_reset()`（corrupt のときだけ。それ以外は throw して何も消さない）
   - [x] `I18nProvider`：壊れている間に切り替えた言語を、corrupt → ready のときに保存する
   - [x] `ConfirmDialog`（D3。radix AlertDialog、初期フォーカスは［キャンセル］）、`CorruptNotice`（`layout.tsx` の本文の上）、辞書 ja／en
   - [x] ESLint：`src/components/**/*.test.*` も `@/backend` を許可（ストアのテストと同じ理由）
   - [x] docs（api-spec、implementation-plan）
   - [x] make check（テスト586件）・format:check
   - [x] main へマージして push、#87 の完了条件を直して閉じ、#73 に `CorruptNotice` の配置を追記
3. Verification: `make check`、`npm run format:check`。書かれたキーを記録して wipe 後に1つも残らないこと、CORRUPT の init が set／remove を1回も呼ばないこと、壊れた meta／表／新しい版／版1の残りからの reset、ready での `data_reset` が throw すること、D3 のキャンセル・Esc で何も消えないこと。
4. Review:
   - 判断：表の名前は `kv-dao.ts` の `TABLE_NAMES` 1か所。`migrate.ts` の `TABLES`（版1固定）は流用しない。`KeyValueAdapter` にメソッドは足さず `remove` だけを使う（スキーマの検証を通さず生のキーを消すため KV の DAO 層に置いた）。Issue の完了条件1行目はこの形に直す。
   - 判断：reset が失敗したら表示はそのまま残し `console.error`（トーストは #73 まで無い）。`CorruptNotice` は `role="alert"`（読み上げ用）だがフォーカスは移さない。
   - **未確認**：ブラウザ（dev サーバー・実際の localStorage）での目視。jsdom のテストと `MemoryAdapter` まで。
   - 観測：`make check` の初回で `site-footer.test.tsx` が5秒のタイムアウト（単独と2回目は通過）。jsdom の並列の負荷による不安定さとみられ、原因は未調査。
   - **次に壊れやすい点**：今より新しい版（v3 以降）のキーは名前で消せない（`SCHEMA_VERSION` までを消す）。版3を作るとき `TABLE_NAMES` を見直す。#73 のシェルができたら `CorruptNotice` を帯の下へ移す。

# #86 いつものエゴサに lastRunAt を足す（スキーマ版2）

1. Goal: 「今日は実行済み」を履歴ではなく `Group.lastRunAt` で決めるため、版2のスキーマ・移行・`history.record` による更新・契約の判定 `clock.isToday` を作る。
2. Plan:
   - [x] ブランチ `feature/last-run-at`、テスト先行（Red 確認：19件失敗）
   - [x] `GroupSchema.lastRunAt`、`SCHEMA_VERSION = 2`、`migrate.ts` の1→2（5表を版2のキーへ。groups だけ変換、他は文字列のまま。版1のキーは消さない）
   - [x] `groups.save`・`saveSearch` が `lastRunAt` を引き継ぐ
   - [x] `history.record` が、一致するお気に入りすべてと `source.groupId` のいつものエゴサの `lastRunAt` を更新（`updatedAt` は動かさない）
   - [x] 契約 `AppClock`（`clock.isToday`）、`StorageCorruptError` を `corrupt-error.ts` へ（migrate との循環 import を避ける）
   - [x] docs（api-spec、implementation-plan、requirements）
   - [x] make check（テスト572件）・format:check
   - [x] main へマージして push、#86 を閉じ、#87 に版1のキーの消去を追記
3. Verification: `make check`、`npm run format:check`。移行（バイト不変・壊れた groups は何も書かない・再実行）、`isToday` の日付の境目（日本時間 0:00）、履歴の全件削除後も判定が変わらない、編集しても `lastRunAt` が残る。
4. Review:
   - 判断：版が上がるとキー名が全部変わるため、移行は5表すべてを運ぶ。壊れた groups は `CORRUPT`（版1のデータと meta は変えない）。
   - 判断：無い・削除済みの `groupId` は例外にせず黙って飛ばす（タブは開いた後）。実行は編集ではないので `updatedAt` は動かさない。
   - 判断：「今日は実行済み」は画面が `lib/*` を import できないので、契約の `clock.isToday` にした（注入する `Clock` は変えない）。
   - **未確認**：ブラウザ（実際の localStorage）での移行。jsdom のテストと `MemoryAdapter` まで。
   - **次に壊れやすい点**：#87 の `data.reset` は版1のキー（`egosearch:v1:*`）も消すこと。#73 は `api.clock.isToday`、#76 の「前回」は `Favorite.lastRunAt` を現地時刻で整形する。localStorage の1つの版1キーが残るので、版3を作るときも同じ「全表を運ぶ」規則にする。

# #72 i18n の基盤（辞書 ja／en、言語の判定と切替）

1. Goal: 以降の画面が最初から辞書の文言で作れるよう、辞書（ja／en）・言語の判定と保存・`ISSUE_CODES` の文言を用意する。
2. Plan:
   - [x] ブランチ `feature/i18n`、テスト先行（Red 確認：`@/messages`・`i18n-context`・`language-switch` が無く失敗、`lang: null` の3件が失敗）
   - [x] `Prefs.lang` を nullable に（null＝ブラウザの言語。版は上げない）
   - [x] `src/messages`（`ja`・`en`・`engine`・`index`）、`store/i18n-context.tsx`、`LanguageSwitch`
   - [x] フッター・バージョン情報を辞書へ（`formatBuildTime` は不正なとき null を返す）
   - [x] docs（requirements 11章、api-spec 実装の状態、implementation-plan 5章）
   - [x] make check（テスト557件）・format:check、en のキーを1つ消してビルドが失敗することを確認
   - [x] main へマージして push、#72 を閉じ、#73 に `LanguageSwitch` の配置を追記
3. Verification: `make check`、`npm run format:check`。`ISSUE_CODES` × ja／en の網羅、`detectLang` の境界、言語が再読み込み後も残ること、ほかの設定を保存しても `lang` が null のままであること。
4. Review:
   - 決定（承認済み）：ライブラリは使わず自前。`Prefs.lang` を nullable に（以前は `set` が既定の `ja` を丸ごと保存し、英語のブラウザでも日本語に固定されたため）。言語切替の置き場所は左メニュー下部＝#73（#72 は部品まで）。
   - 判断：読み込み中と事前描画は ja。読み込み後は 保存 → ブラウザの言語。`CORRUPT` のときもブラウザの言語で出し、切替はその画面だけに効く（何も書かない）。ブラウザの言語は `useSyncExternalStore`（サーバー側は ja）。`Provider` が無いときの既定は ja（部品の単体テスト用）。
   - 判断：en の文言は暫定（#67 で確定）。`ENGINE_LABEL` の英語名も同じ正式名のまま。`layout.tsx` の metadata は静的なので #75 に残す。
   - **未確認**：dev サーバー・ブラウザでのハイドレーション確認はしていない（`make check` のビルドと jsdom のテストまで）。
   - **次に壊れやすい点**：#73 が `LanguageSwitch` を置くこと。画面を足すとき、文言は `t.<画面>.…` に足し、en の抜けは型エラーで気づく。警告の文言は `t.issues[code](params)`。モックの文言は辞書に移していない（破棄予定）。

# #24 ストア（zustand）と API（契約）の接続

1. Goal: ストアが `@/api` だけを使って `data.init()` で読み、変更のたびに `data.*` を呼んで戻り値を状態へ反映する。
2. Plan:
   - [x] ブランチ `feature/store-api`、zustand 導入
   - [x] `store/app-store.ts`（`createAppStore(api)`）、`store-context.tsx`（`StoreProvider`・`useAppStore`）、`providers.tsx` に接続
   - [x] ESLint：`src/store/**/*.test.*` だけ `@/backend`・`MemoryAdapter` を許可（テスト以外の違反は lint で失敗することを確認）
   - [x] docs（api-spec 7.1、implementation-plan）
   - [x] make check（テスト492件）・format:check、main へマージして push、#24 を閉じる
3. Verification: `make check`、`npm run format:check`。再読み込み・壊れたデータ（kv が1バイトも変わらない）・お気に入り削除／編集／undo・LIMIT のテスト。
4. Review:
   - 判断：エンティティを返す操作は戻り値を差し込み、戻り値の無い操作と `history.record` は `data.init()` で読み直す（履歴の上限・lastRunAt・削除済みの位置の規則をストアに持たない）。`corrupt` の間は操作が `CORRUPT` を throw し、何も書かない。
   - **テスト先行（Red）は確認していない**：テストを先に書いたが、実装前に実行しなかった。
   - **未確認**：dev サーバーで `/`・`/mock` が 200 でログにエラーが無いことまで。ブラウザでのハイドレーション確認はしていない。dev サーバー（ポート 3124）は、プロセス停止が許可されず残っている。
   - **次に壊れやすい点**：画面で配列・オブジェクトを新しく作るセレクターは `useShallow` で包む（zustand v5 で再描画が止まらなくなる）。#87 の `reset()` 後に status を `ready` へ戻す処理をストアに足す。#86 は `history.record` が読み直すので、ストアの変更は不要。

# #85 API 層（契約・createBackend・useApi・import の制限）

1. Goal: 画面が `@/api` だけで動けるよう、境界の `EgoSearchApi` と実装 `createBackend({ kv, clock })`、`useApi()`、画面からの内部 import を禁じる ESLint を作る。
2. Plan:
   - [x] ブランチ `feature/api-layer`、テスト先行（`chip.test.ts`・`suggest.test.ts`・`backend.test.ts`）
   - [x] 契約 `src/api/api.ts`（`chip.labelRequired` を削除、`CHIP_LABEL_MAX` を定数に）
   - [x] `lib/query/chip.ts`（`validateChip`・`labelFromQuery`）、`suggest.ts`（`suggest`・`starters`）
   - [x] `src/backend`（`index`・`query`・`data`・`errors`）
   - [x] `src/store/api-context.tsx`、`src/app/providers.tsx`、`layout.tsx`
   - [x] ESLint `no-restricted-imports`（わざと違反を入れて失敗を確認し、戻した）
   - [x] docs（api-spec・screen-spec・implementation-plan）
   - [x] make check（テスト477件）・format:check、main へマージして push、#85 を閉じる
3. Verification: `make check`、`npm run format:check`。`MemoryAdapter`＋固定の clock のテスト（初回だけプリセット／壊れたデータは書かない／LIMIT・NOT_FOUND・INVALID／`favorites.update` と `undo`）。
4. Review:
   - 決定（ユーザー、2026-11-19）：`suggest`・`starters`・`validateChip` の中身も #85 で作る。`favorites.duplicate` は廃止（画面が辞書で名前を作って `save`）。D1 のラベルが空なら検索文字列から作る（「ファボ数」の自動ラベルは廃止、`chip.labelRequired` も削除）。サジェスト採用のラベルは20文字に収める。新しい版の保存データは `CORRUPT`。
   - 範囲外：`data.reset()`（#87）、`lastRunAt` と `history.record` による更新（#86）。
   - 判断：初回判定は `openDao`（meta を書く）の前に meta の有無で行う。DAO は最初の呼び出しで1回開く（失敗は覚えない）。`createBrowserBackend` は `window` が無いとき `MemoryAdapter`（事前描画で落ちない）。
   - **次に壊れやすい点**：#86 が `history.record` に `lastRunAt` を足すとき、`guarded` の外で書かないこと。localStorage が使えない端末（プライベートモードなど）では `createBrowserBackend` が例外になりうる（未対応）。`crypto.randomUUID` は https／localhost だけ。localStorage の容量超過や、壊れた prefs の `JSON.parse`（DAO の `prefs.set`）は `ApiError` にならず素の例外で届く（契約にコードが無いので足していない）。

# #21 マスタ JSON 4つと zod スキーマ

1. Goal: 興味の対象・プリセット・サジェスト規則・検索ワード集を `src/data/*.json` に置き、zod で検証して、不正な値でテストとビルドが失敗するようにする。
2. Plan:
   - [x] ブランチ `feature/master-json`、テスト先行（Red 確認：`./index` が無く失敗）
   - [x] `schema.ts`（`MasterSchema` でファイルをまたぐ検証）、`index.ts`（`interests`・`presetsFor`・`suggestRules`・`wordSet`）、JSON 4つ（モックの仮の値）
   - [x] `WordGroupSchema.words` に `.min(1)`（`src/api/types.ts`）
   - [x] `prebuild`（`vitest run src/data`）でビルドを止める
   - [x] docs（requirements 11.1・11.2・13章、api-spec 4.1・実装の状態、implementation-plan 2章）、Issue #21 のタイトルを4つに
   - [x] make check・format:check、main へマージして push、#21 を閉じる
3. Verification: `make check`（テスト418件）、`npm run format:check`。word-set.json の英語のグループ名を空にして `npm run build` が終了コード1で止まることを確認し、元に戻した。
4. Review:
   - 決定（ユーザー、2026-11-19）：`label`／`name` は `{ ja, en }` に揃える（requirements の11章が古かった）。presets は Excel と同じ1本の並び（`interest` が `common` か対象 ID）、既定リストは `{ defaultList: true }` の目印の位置、`starter` の件数は検証しない。
   - 判断：重複の判定は `normalize` した `query`（プリセットは対象ごと、検索ワード集は対象内の全グループ）。`common` は対象 ID に使えない。検索ワード集が無い対象は許す（`wordSet` は `[]`）。
   - 判断：JSON は ID をキーにした Record で、値に `id` を持たない（`interests()` が付ける）。
   - 「ビルドで失敗」は、今のビルドが JSON を読まないため `prebuild` にした。
   - **次に壊れやすい点**：#85 が `@/data` を束ねるときの import 制限（モックは除外）。#70 で本番値を入れるとき、ラベルは20字以内・同じ対象内の `query` の重複なし。starter が60件を超えたら表示側（`query.starters`）が切ること。

# #20 ランチャー codec

1. Goal: いつものエゴサ（名前＋項目）を `/launch#` の後ろのハッシュ（`v1.`＝圧縮／`v1u.`＝非圧縮）に出し入れする `encodeLauncher`／`decodeLauncher` を `src/lib/launch/codec.ts` に置く。
2. Plan:
   - [x] ブランチ `feature/launcher-codec`、テスト先行（Red 確認：`./codec` が無く失敗）
   - [x] `codec.ts`（版・接頭辞・形式名は定数1か所）
   - [x] ブックマーク URL 全体の長さ警告（`launcher.tooLong`・`LIMITS.launcherUrlWarn`）を廃止。モック D2 のダミー警告も削除
   - [x] docs（requirements F8、api-spec 2・4.4・5・7、screen-spec D2・6章・未確定、implementation-plan 2章）
   - [ ] make check・format:check、main へマージして push、#20 を閉じる
3. Verification: `make check`、`npm run format:check`。往復（圧縮／非圧縮）、壊れた入力、知らない版のテスト。
4. Review:
   - 決定（ユーザー、2026-11-19）：2000文字に根拠が無く、効く制限は X のクエリ（約500文字）なので、長さは各クエリで判定する（`query.tooLong`）。ブックマーク URL 全体では判定しない。このため `encode` は hash（string）だけを返し、オリジンを知る必要が無くなった。
   - 判断：失敗の分け方は、`v<数字>` が1以外なら `LAUNCHER_VERSION`、それ以外（形・base64url・解凍・JSON・スキーマ・`DecompressionStream` が無い端末の `v1.`）は `LAUNCHER_BROKEN`（`cause` 付き）。`encode` は不正な入力を zod のエラーで拒否する。
   - Issue #20 の完了条件（長さの行）の修正は、`gh issue edit` が許可されなければ未対応。
   - **次に壊れやすい点**：#85 が `encode` の戻り値を hash 文字列として扱い、フロントが `<オリジン>/launch#` を付けること。D2（#77）は長さの警告を出さない。

# #19 URL 解析とリスト ID

1. Goal: 貼った URL（x.com／twitter.com／Yahoo!リアルタイム検索）を保存形（X の構文）に直す `parseUrl` と、リストの URL／数字から ID を取り出す `parseListId` を `src/lib/url/` に置く。
2. Plan:
   - [x] ブランチ `feature/url-parse`、テスト先行（Red 確認：`./parse`・`./list-id` が無く失敗）
   - [x] `parse.ts`、`list-id.ts`（ホスト・パス・接頭辞は `build.ts`・`operators.ts` から導く）
   - [x] docs（api-spec 4.3・7.1、implementation-plan 2章）
   - [x] make check・format:check、main へマージして push、#19 を閉じる
3. Verification: `make check`、`npm run format:check`。往復（保存形 → `planRun` → `parseUrl`）と F4 の逆変換表のテスト。
4. Review:
   - 決定（ユーザー、2026-11-19）：数字でない `lts`／`uts` は無視。`url.listId` は #19 に含める（api-spec の担当と Issue の完了条件の食い違いを解消。Issue #19 の完了条件への追記は `gh issue edit` が許可されなければ未対応）。
   - 判断：Yahoo の根以外の AND グループ（括弧）は OR に直す（再帰。`(ID:a ID:b)` の中の `ID:` も `from:` に戻す）。表に無い演算子（`from:`・`list:`・`lang:`・`filter:`・`-@x` など）は raw で入力のまま保持。
   - 判断：`p` が空で `lts` だけの URL は `url.noQuery`（期間だけで保存形を作らない）。Yahoo の通常検索（`/realtime` 以外）は `url.unsupportedHost`。
   - 戻らない形（テストで期待値にした）：`@x`→`to:x`、Yahoo で除かれた `list:`・`filter:`・`lang:`・`min_*`・`-from:`、否定した OR → `-A -B`。
   - **次に壊れやすい点**：Yahoo が括弧の意味や `lts`／`uts` を変えたら `fromYahoo`・`YAHOO_PERIOD_PARAMS` を直す。S7（#31）が `ParsedUrl.tokens` の `raw` で「生トークン」表示を出すこと。

# #18 X／Yahoo の URL 生成

1. Goal: 保存形の検索（`PlanItem`）から、X と Yahoo!リアルタイム検索の URL と警告を `RunPlan` で返す純粋関数 `planRun(items, today)` を `src/lib/url/build.ts` に置く。
2. Plan:
   - [x] ブランチ `feature/url-build`、テスト先行（Red 確認：`./build` が無く失敗）
   - [x] `build.ts`（X は `f=live`＝定数 `X_TAB`、Yahoo は `p`・`ei=UTF-8`・`lts`／`uts`）
   - [x] docs（api-spec 4.3・5章・7.1、implementation-plan 2章）
   - [ ] make check・format:check、main へマージして push、#18 を閉じる
3. Verification: `make check`、`npm run format:check`。`searchParams` のキー集合の一致で `rkf`・`ifr`・`utm_*` が無いことを確かめる。
4. Review:
   - 判断：`RunPlan.warnings` は target の警告の重複なしの和集合（仕様に明記が無い）。クエリ長は展開後の文字数を `LIMITS.urlWarn` と比べる（URL エンコード後ではない）。
   - 判断：X の `q` は展開済みの文字列をそのまま入れ、`serializeX` で組み直さない（履歴の `query` と一致させる）。
   - `url.listId`（`list-id.ts`）は #18・#19 のどちらの完了条件にも無いので作っていない。
   - **未対応**：Issue #18 の本文の `lib/limits.ts`（正しくは `src/api/limits.ts`）は、`gh issue edit` が許可されず直せていない。
   - **次に壊れやすい点**：#85 が `today` に `localDate` の結果を渡すこと。#19 が `X_SEARCH_URL`・`YAHOO_SEARCH_URL` を同じ定数から読むこと。

# #17 相対期間の展開と until の出力

1. Goal: 相対期間（`since:yesterday` など）が月末・年末・うるう日でも正しい日付に展開され、`until:` が終了日そのままになることをテストで保証し、展開の基準日（現地の今日）を求める `localDate` を置く。
2. Plan:
   - [x] ブランチ `feature/relative-period`
   - [x] `model.test.ts`（年末・月末・うるう日・混在・until）、`merge.test.ts`（元日の展開）、`dates.test.ts`（`localDate` の境界。Red を確認）
   - [x] `dates.ts` に `localDate`、冒頭コメントと docs（implementation-plan 2章、api-spec 7.1）を同期
   - [x] make check・format:check、main へマージして push、#17 を閉じる
3. Verification: `make check`、`npm run format:check`。
4. Review:
   - 展開の本体（`expandRelative`／`addDay`）は #71 で model.ts に移済みで、バグは無かった。足したのは境界テストと、基準日 `localDate`。
   - `localDate` は `toISOString` を使わない。UTC だと日本時間の 0:00〜8:59 に前日になり、［昨日から］が一昨日に展開される。
   - **次に壊れやすい点**：#85 の `clock.today()` が `localDate` を通ること（`toISOString().slice(0,10)` で書くと上の不具合になる）。`tokenize` は括弧を1語として扱うので、`(a OR since:yesterday)` の中の記号は展開されない（Yahoo では `yahoo.rawUnverified`）。

# #15 Yahoo シリアライザーと変換警告

1. Goal: AST から Yahoo!リアルタイム検索のクエリ文字列を `{ text, warnings, lts?, uts? }` で返す純粋関数を作る。使えない演算子は黙って消さず警告する。
2. Plan:
   - [x] ブランチ `feature/serialize-yahoo`、テスト先行（Red 確認：`./serialize-yahoo`・`./dates` が無く失敗）
   - [x] `dates.ts`（`localMidnightSec`）、`serialize-yahoo.ts`、警告コード `yahoo.groupUnverified`、`vitest.config.mts` で `TZ=Asia/Tokyo` に固定
   - [x] docs（implementation-plan 2章、api-spec 2.4・7.1、requirements F5）
   - [x] make check・format:check、main へマージして push、#15 を閉じる
3. Verification: `make check`、`npm run format:check`。TZ の固定は `dates.test.ts` の1件で確かめる。
4. Review:
   - 決定（ユーザー、2026-11-18）：Yahoo は括弧が OR なので、否定した OR は `-A -B` に直す（警告なし）。OR の中の AND と否定した AND は X の形のまま出して `yahoo.groupUnverified`。期間は OR の中でも `lts`／`uts` へ移す。
   - 判断：期間が複数あれば共通部分（`lts` は最大、`uts` は最小）。読めない値（未展開の `since:yesterday`、存在しない日付）と否定した期間は、そのまま出して `rawUnverified`。
   - 相対期間の展開は #17。ここは展開済みの日付を前提にする。
   - **次に壊れやすい点**：#18 が `lts`／`uts` を URL パラメータにし忘れると期間が黙って消える。#72 の辞書に `yahoo.groupUnverified` の文言が要る。

# #14 X シリアライザーと往復テスト

1. Goal: AST から X のクエリ文字列を `{ text, warnings }` で返す純粋関数を作り、parse → serialize → parse で木が変わらないことをテストで保証する。
2. Plan:
   - [x] ブランチ `feature/serialize-x`
   - [x] テスト先行（赤を確認）：往復コーパス・正規形・無効／空ノード・variants・期間・警告
   - [x] `src/lib/query/serialize-x.ts`、`strip` を `test-utils.ts` に共有
3. Verification: `make check`（テスト142件を含む）・`format:check` が通る。
4. Review:
   - 根以外のグループは、有効な子があれば常に `(…)`（子が1つでも外さない。`(A)` は AND グループ、`-(-A)`→`--A`、`-(list:x)`→`-list:x`（X でエラー）を防ぐ）。
   - 例外：根の直下の OR が、閉じていない引用符・括弧の raw を含むときだけ括弧なしで出す（`A OR "b` が括弧の `)` を飲み込むため。OR は先に結ばれるので同じ木に戻る）。
   - 「`since_time:` を出力しない」は、期間（`since`／`until` の日付ノード）から生成しない意味。貼り付けで得た `since_time:` は往復のため保持する（`PARSE_ONLY_OPS`）。
   - 警告は常に空。`query.tooLong` は #16・#18 が出す。
   - **次の脆い点**：`swallowsClose` は文字数の数え方（引用符の偶奇・括弧の数）で判定している。パーサーの raw の作り方が変わったら、往復コーパスが先に赤になる。

# 全体計画（新仕様）：作業計画の作り直し

1. Goal: 新仕様（モックが正、検索文字列が本体、DAO 作成済み）に沿って、残りの作業を M0〜M7 の Issue に揃え、ユーザーの作業を先頭に出す。
2. Plan:
   - [x] ブランチ `docs/replan`
   - [x] マイルストーン名の変更（M3 マスタとプリセット／M4 永続化と i18n 基盤／M5 ホームと条件ボタン／M6 保存・一括実行・ランチャー）
   - [x] 旧仕様の Issue を閉鎖（#3・#22・#23・#25〜#29・#33・#34・#38・#39）
   - [x] 残す Issue を新仕様に書き直し（#12〜#21・#24・#30〜#32・#35〜#37・#40・#41・#61・#67・#70）
   - [x] 新規 Issue（#71〜#84）
   - [x] `docs/implementation-plan.md` 5章（マイルストーン名、i18n の基盤を M4 へ）
   - [ ] 以降は下の「Claude の作業順」

## あなた（ユーザー）の作業
| # | 作業 | いつ | Issue |
|---|---|---|---|
| U1 | プリセット・サジェスト規則・**検索ワード集（約200件×対象、グループ名の日英）**を Excel に記入（先に Claude がひな形を作る＝T1。タグ・ワード・ハンドルは確認した値だけ） | 最優先。M3 の本番値と #40 に必要 | #70 |
| U2 | （済）X のタイムゾーン確認。#49 のコメントのとおり日本時間・`until:` は指定日を含む。仕様に反映して閉鎖 | 済 | #49 |
| U3 | （済）英語の画面では興味の対象を英語表記（hololive／NIJISANJI／Others）にする。英語の文言の確認だけ M7 で残る（Claude が下書きを作る） | M7 | #67 |
| U4 | （保留）#69 背景。しばらく保留 | 保留 | #69 |
| U5 | （除外）Yahoo の `uts` の境界。差は1秒で不要なため閉鎖 | 除外 | #84 |
| U6 | リリース前に、本番 URL で一括オープン（ポップアップの許可）を自分のブラウザで確認 | M7 | #41 |

## Issue の割り当て（開いているもの）
| マイルストーン | Issue |
|---|---|
| M0 | #82 format:check の CRLF、#83 旧 `.gitkeep` の整理 |
| M1 クエリの中核 | #88 契約の型（`src/api`。`Word`・`WordGroup`・`LIMITS.wordSetStarter` を含む）、#71 `lib/query/model.ts`、#12 AST・operators、#13 パーサー、#14 X シリアライザー、#15 Yahoo シリアライザー、#16 合成、#17 相対期間・until |
| M2 URL・ランチャー | #18 URL 生成、#19 URL 解析、#20 codec |
| M3 マスタとプリセット | #21 マスタ JSON（`word-set.json` を含む）＋zod、#70 プリセット・サジェスト規則・検索ワード集の中身（ユーザー作業） |
| M4 永続化と i18n 基盤 | #85 API 層の束ね、#24 ストア⇄API、#86 `lastRunAt`、#87 壊れたデータの初期化、#72 i18n 基盤（画面より先） |
| M5 ホームと条件ボタン | #73 シェル、#32 S1 ホーム、#30 クエリ表示・警告欄、#89 検索ワード集（D4・履歴0件のホーム表示）、#74 S2＋D1、#31 S7、#75 S10＋SEO |
| M6 保存・一括実行・ランチャー | #76 S3／S3-E、#77 S4／S4-E＋D2、#78 S5、#79 S6、#80 サジェスト、#81 コマンドパレット、#35 S9 |
| M7 | #36 レスポンシブ、#37 キーボード、#67 文言の網羅と英語、#40 本番データ、#61 モック破棄、#41 リリース、#69（保留） |
| 実機検証 | （なし。#49・#84 は閉鎖）|

## Claude の作業順
- [x] T1 #70 の Excel ひな形を `docs/data/presets-and-suggest-rules.xlsx` に作成（シート：興味の対象／プリセット／サジェスト規則。例の行は仮の値。ユーザー作業 U1 で記入）。元の指定：2シート（プリセット／サジェスト規則。例の行は1行だけ仮の値。興味の対象の英語表記の列を含める）を作ってユーザーへ渡す
- [x] T2 モックの「未確認」の目視をまとめて確認（ユーザーが自分で確認済みのためクローズ。2026-11-18）
- [x] T3 M0 の残り（#82、#83）
- [ ] M1（#88 から）→ M2 → M3 → M4（i18n 基盤を含む）→ M5 → M6 → M7。画面の Issue は毎回 Chrome で 360px／1280px を確認する

3. Verification: 開いている Issue がすべてマイルストーンとラベル1つを持つ（`gh issue list` で確認済み）。旧用語（スタジオ・メンバー選択・テンプレート・S8）が開いている Issue に無い。`make check`。
4. Review:
   - 「Issue の処置」の判断：#34 は新規の #77 に統合して閉鎖。#70 は M7 から M3 へ移した（本番値の入力を早めるため）。
   - **未確認**：#12〜#37 の書き直しは新仕様の文書に照らして書いたが、完了条件の細部は着手時に見直す。
   - 追記（2026-11-18）：#49 の結果（日本時間、`until:` は指定日を含む）を反映し、翌日変換をやめた（モック・テスト・CLAUDE.md・docs）。#84 は不要として閉鎖、#69 は保留。

# 画面仕様書をモックに合わせて再構築する

1. Goal: モックを正として画面仕様書を書き直し、重複・経緯・食い違いを無くす（ユーザーの決定でモック側も直す）。
2. Plan:
   - [x] ブランチ `docs/screen-spec-rebuild`
   - [x] モック：詳細条件にアカウントの除外4欄（テストを先に書き、赤を確認）、フッターに非公式の表記、メニューに言語切替、ランチャーの［ホームへ］、ホームのお気に入りは全件
   - [x] `docs/screen-spec.md` を全面的に書き直す（部品は3章に1回だけ書き、データ規則は要件定義書を参照）
   - [x] CLAUDE.md（ランチャーは保存しない）、requirements（F3 の除外は experimental、F8、言語切替、章番号）、research-phase0（5章に6を追加）、implementation-plan（章番号）
   - [x] lessons に1件追記
3. Verification: `make check`（tsc／test 107件／lint／build）が通る。書き出した HTML に、フッターの非公式表記・［ホームへ］・除外の欄・言語切替がある。仕様書に「巡目／廃止／以前は／旧／グループ」が無い。「Yahoo」の短縮は許された場所だけ。
4. Review:
   - 旧仕様から消した行を、理由ごとに分けた。
     - モックと矛盾：
       - 期間の注記は2行分 → 1行分
       - 条件ボタンのリストの印
       - S7 のツリー表示
       - メニューのページの2カラム
       - コマンドパレットの幅（480px → 448px）
       - 帯が0件のときの「まだありません」
     - ユーザーの決定：
       - パンくず
       - S3 の行の「最終実行」「［複製］」
       - 帯でブロックされたときの1行の案内
       - S9 の保存の確認
     - 重複：
       - 警告の置き場所（2.3・3.2・3.4・6.1 → 3.8 に1回）
       - クエリ表示の2回目
       - 帯がランチャーにも出ること
       - 状態の表の「上限」「食い違い」（S2 と D1 へ）
     - 経緯：
       - 「5巡目で廃止」
       - 「以前のテキスト欄のシート」
       - 旧 `/studio`
       - 旧番号の参照
     - 要件定義書への参照に置き換え：
       - 展開の規則（11.4）
       - Yahoo の変換（F5）
       - 期間の出力（F2）
       - サジェストの作り方（F6）
       - 未確定事項のうち確定済みの行（`since_time:`、`list:`＋`to:`）
     - 削った情報：
       - 画面一覧の「主な利用者」の列
       - 「実装は GitHub の Issue で管理する」
       - S4 の例
   - 判断：言語切替の状態はストアではなく Shell に持った（モックだけの状態で、ほかの画面から読まないため）。
   - **未確認**：ブラウザでの目視はしていない（フッターが2行のときにトーストと重ならないか、360px での言語切替の並び）。書き出した HTML に要素があることだけを確認した。
   - **未作成**：アカウント除外の実機検証の Issue（research-phase0 5章の6）。

# CLAUDE.md の見直しとダイアログ記号の変更（M1〜M3 → D1〜D3）

1. Goal: ダイアログ番号をマイルストーンと重ならない D1〜D3 に変え、CLAUDE.md からほかと重複する行と画面の細部を削って短くする。
2. Plan:
   - [x] ブランチ `docs/claude-md-review`
   - [x] screen-spec・implementation-plan・requirements・mock のコメントで、ダイアログの M1〜M3 を D1〜D3 に（実装計画の注記を削除、付録B に改名の注記）
   - [x] Issue #67 の本文を D1〜D3 に直す
   - [x] CLAUDE.md を書き直す（84行 → 63行）
   - [x] lessons に1件追記
3. Verification: `grep -rn "\bM[123]\b" docs src` で残りがマイルストーンと付録B の旧番号だけ。`make check`（tsc／test 103件／lint／build）が通る。
4. Review:
   - 削った行：コマンドの手順（`make check` に集約）、`any` の禁止（ESLint のエラー）、テスト規約（`testing.md`）、lessons の参照・Issue タイトルの形式・秘密情報（ユーザースコープ）、画面の細部（ホームの並び・トースト・自動追加・レイアウトの数値など。screen-spec／requirements にある）。
   - リスク：ユーザースコープの CLAUDE.md は他の協力者に見えないため、Issue タイトルの形式は伝わらない。
   - 未対応：Issue #31・#33・#34 は旧番号のままで、内容も廃止された機能（報告のみ）。

# モックを正として要件を見直し、データ構造（検索文字列が本体）と DAO を定める

1. Goal: モックを正として文書を照合し直し、条件ボタン・お気に入り・いつものエゴサの本体を検索文字列に揃え（相対期間は記号）、興味の対象を増やせる形にし、保存先を差し替えられる DAO を設計・実装する。
2. Plan:
   - [x] ブランチ `feature/string-model-dao`
   - [x] 純粋関数 `query-model.ts`（分割・正規化・相対期間・展開・編集の連動・サジェスト規則）とテスト
   - [x] モック：データ・ストア・各画面を新しい型へ。お気に入りの編集を専用ページ（S3-E）に。興味の対象に「その他」、条件ボタンを対象ごとに
   - [x] DAO（`src/lib/storage`：schema／types／kv-adapter／kv-dao／migrate）と `lib/limits.ts`、テスト。zod を導入
   - [x] 要件定義書（F1・F2・F4〜F8・F11・F12・5〜7章、新10〜13章）、画面仕様書（S3-E など）、実装計画、CLAUDE.md、design-lessons
   - [x] Issue #70（プリセットとサジェスト規則のデータ整備）を作成、#69 から「その他」を外す
   - [x] 検証（tsc／test 103件／lint／build）→ コミット → main にマージ → push
3. Verification: tsc／test／lint／build。古い用語（「期間を文字列に入れず」「コピー」「default-lists」）の grep。
4. Review:
   - 判断：「DAO を作成」は設計（要件定義書 12章）＋コード（`src/lib/storage`）と解釈。画面とはまだつないでいない（M4）。
   - 判断：比較は正規化した文字列。保存する `until:` は X と同じ意味（含まない）。展開は今の対象の「表示」のボタンだけ。
   - **未実施**：DAO のテストは実装と同時に書いたため、赤の状態を確認していない。
   - **未確認**：ブラウザでの目視（お気に入りの編集ページの展開、連動のトースト、「その他」の切替）。

# お気に入りの検索先を保存・編集できるようにする（mock）

1. Goal: お気に入りの検索先（X／Yahoo!リアルタイム検索／両方）を、作る・直すすべての画面で選べるようにし、実行時に使う。あわせて管理の行を詰め、詳細条件の［構造］タブとエンジン選択を削除する。
2. Plan:
   - [x] `EnginePicker` を作り、☆ 保存・お気に入りの編集・いつものエゴサの追加②で使う
   - [x] 履歴・URL解析からの保存は元の検索先を引き継ぐ
   - [x] `runFav`／`runGroup` が検索先で開く（両方は2件）。ランチャーの表示も直す
   - [x] 詳細条件からエンジン選択と［構造］タブを削除（`Detail.engine`／`offTokens` も削除）
   - [x] お気に入りの管理の行：短縮バッジ（`ENGINE_SHORT`）、名前の「…」省略
   - [x] requirements・screen-spec・implementation-plan・CLAUDE.md・lessons・design-lessons
3. Verification: tsc／test（55件）／lint／build。
4. Review:
   - tsc／test（55件）／lint／build は通過。
   - **未確認**：ブラウザ自動化ツールが無く、360px での行の収まり・保存シートの見た目は目視していない。
   - 判断：検索先の初期値は X。「両方」の選択肢名は「両方」（正式名の範囲外）。ランチャーの「N件の検索」は検索の数のまま（両方を含むとタブ数とは違う）。

# モックの調整（Yahoo の「!」・入力欄の中央寄せ・用語・サジェストの文言と余白）

1. Goal: ［Yahoo で開く］の「!」を外し、値付きボタンの入力を中央寄せにし、「Yahoo!リアルタイム検索」の用語を正し、サジェストの文言（「など」）と余白を直す。
2. Plan:
   - [x] 「!」と `yahooWarnings` を削除
   - [x] 数値・日付の入力欄を中央寄せ
   - [x] 表示名を `ENGINE_LABEL` に集約し、警告・トースト・バッジ・選択肢・ランチャー・説明文を正式名に（ボタンと［⋯］の項目は短縮のまま）
   - [x] サジェストの文言を「直近の検索などから」に、上の余白を広げる
   - [x] screen-spec・requirements・implementation-plan・research-phase0・CLAUDE.md を更新
   - [x] lessons・design-lessons に追記
3. Verification: typecheck／test／lint／build、grep で短縮した「Yahoo」が残っていないか確認、main にマージして push。
4. Review: 画面の目視（中央寄せ、余白、長くなったバッジの折り返し）は Playwright が無いため未実施。開発文書の技術的な記述の「Yahoo」は略記として許し、各文書の冒頭に用語の注を置いた。

# モックの改善（数値入力・プレビュー・コピー・警告・キャンセル・メニュー・もっと開く）

1. Goal: モックへの指摘（数値の上下ボタンで見切れる、プレビューの余白、警告の置き場所、コピー、キャンセルの戻り先、管理アイコン、もっと開くの件数、追加画面から開く）を直し、仕様書を更新する。
2. Plan:
   - [x] 値付きボタンの入力欄（上下ボタンを消す、数値4桁・日付を詰める）
   - [x] クエリ表示の上下の余白を対称にし、スクロールバーを細く
   - [x] クエリ横の⚠をコピーボタンに（［⋯］のクエリのコピーは外す）
   - [x] 警告を「条件」の枠の一番下へ、［Yahoo で開く］に⚠
   - [x] 追加画面②に［X で開く］［Yahoo で開く］
   - [x] キャンセルで遷移前の画面へ
   - [x] メニューの管理ページに管理アイコン
   - [x] ［もっと開く（+N）］にサジェストを含める
   - [x] screen-spec・requirements・implementation-plan・CLAUDE.md の警告の置き場所を更新
   - [x] design-lessons に追記
3. Verification: typecheck／test／lint／build、dev で 360px と PC 幅を確認し、main にマージして push。
4. Review: typecheck／test（55件）／lint／build は通過。ブラウザ自動化（Playwright）が入っていないため、画面の実測（入力欄の見切れ・`getBoundingClientRect` の前後比較）は未実施で、目視の確認はユーザーに依頼する。解釈：「スクロールバーを補足」＝「細く」。ボタン8個以下でもサジェストがあれば［もっと開く］を出す（仕様変更）。［⋯］の「クエリをコピー」は［コピー］と重複するので外した。Yahoo の警告は `buildQuery` の `yahooWarnings` に分けて返す（`warnings` は全件のまま）。

# #60 画面モック（紙芝居）【破棄予定】

1. Goal: 画面仕様書 S1〜S4・M1〜M3 の見た目と遷移を確認するための使い捨てモックを `src/app/mock/` に作る（破棄は #61）。
2. Plan:
   - [x] Issue #60（作成）・#61（破棄）を作り、#61 を #41 の依存に追加
   - [x] `src/app/mock/` に S1〜S4 と M1〜M3 をダミーデータで実装（破棄予定バナー、README、マーカー付き）
   - [x] make check（typecheck / test / lint / build）
   - [ ] PR → CI → main にマージ
3. Verification: make check、dev で `/mock` 配下4ルートが 200 でバナーを含むこと、mock 外からの参照が無いこと。
4. Review: 新規テストは書かない（破棄前提の例外）。Vercel Preview / 本番の `/mock` から画面を確認できる。破棄は #61（#41 より前）。

# 実機検証 #42〜#46 の結果の反映

1. Goal: 実機検証の結果を仕様書に反映し、未公認の挙動のリスクを記録したうえで、検証の Issue を閉じる。
2. Plan:
   - [x] research-phase0.md 6章に結果と採用方針を追加
   - [x] requirements.md（F2・F5・F7・7章・8章）、screen-spec.md、implementation-plan.md、CLAUDE.md を更新
   - [x] 実装の Issue（#12・#15・#19・#23）に反映する項目を引き継ぐ
   - [x] 残る確認項目（X の since:/until: のタイムゾーン）を新しい Issue にする
   - [x] #42〜#46 に結果をコメントして閉じる
3. Verification: 文書間で「期間は X だけ」「引用符の警告」「experimental の対象」の記述が残っていないか grep で確認する。
4. Review: 方針は「代替手段があれば未公認の方法を使わない。無ければ実機を優先し、リスクを記録する」。Yahoo の OR は `(A B)` を維持、引用符と lts/uts は採用、X の期間は日付形式で出力する。

# #4 Claude Code フックによるガードレール

1. Goal: 破壊的コマンドと秘密情報ファイルの書き込みをブロックし、編集後に format/lint を走らせ、完了前に検証を促すフックを `.claude/settings.json` に設定する。
2. Plan:
   - [x] 判定ロジック `rules.mjs` をテスト先行で実装
   - [x] guard-bash / guard-files / post-edit / stop-verify を実装
   - [x] `.claude/settings.json` にフックを登録
   - [x] `vitest.config.mts` の include にフックのテストを追加
   - [ ] 検証してコミット、main へマージ
3. Verification: `npm test`、JSON を stdin に流した単体確認、無害なプローブでの実機確認、tsc / lint / build。
4. Review:
   - 判定ロジックは `.claude/hooks/rules.mjs` に集約し、`npm test` に載せた。
   - 実機で確認済み：`rm -rf`、`git push --force`、`.pem` の Write はブロック、編集後の整形と `any` の lint フィードバックも動作。
   - `.env` の Write は既存の権限 deny ルールが先に拒否したため、フック単体は stdin 経由（`\` と `/` 両方）で確認した。
   - 制約：コマンド文字列全体を走査するため、コミットメッセージ等に禁止パターンを書いてもブロックされる（安全側）。不正な JSON が来た場合は通す（fail-open）。

# #5 Git フック（husky + lint-staged）

1. Goal: コミット時に lint-staged と秘密情報の検出、push 前に tsc とテストを走らせ、型エラーや秘密情報の混入を止める。
2. Plan:
   - [x] husky・lint-staged・secretlint を導入（`prepare: husky`）
   - [x] pre-commit：`lint-staged`（secretlint、tsc（関数形式でプロジェクト全体）、eslint --fix、prettier）
   - [x] pre-push：`tsc --noEmit && npm test`
   - [x] `.gitattributes` で `.husky/*` を LF に固定
   - [x] 捨てブランチで実機確認し、main へマージ
3. Verification: 型エラーのコミット拒否、ダミーの GitHub トークンのコミット拒否、`--no-verify` で作った型エラーのコミットの push 拒否（リモートに残らないことも確認）。tsc / test / lint / build。
4. Review:
   - 完了条件の「CI で同じ検証が走る」は #8 で満たす。
   - `npm run format:check` は既存の17ファイル（今回未変更）で失敗する。改行コード（CRLF）が原因とみられ、別途対応が必要。→ #82 で解消（`.gitattributes` で LF 固定）。

# #6 リポジトリ保護

1. Goal: Dependabot とシークレットスキャン、push protection を有効にする。
2. Plan:
   - [x] ブランチ保護は要件から削除（ユーザー指示。Issue #6 を修正済み）
   - [x] `.github/dependabot.yml`（npm・github-actions、weekly）を追加し、main へマージ
   - [x] API で脆弱性アラート、セキュリティ更新、シークレットスキャン、push protection を有効化
3. Verification: `gh api` で設定値を読み戻す。
4. Review:
   - API で読み戻して確認：vulnerability-alerts 204、automated-security-fixes enabled、secret_scanning / push_protection / dependabot_security_updates が enabled。
   - ブランチ保護は行わない（ブランチで作業し main へ直接マージする運用を続けるため）。

# #7 Issue / PR テンプレート

1. Goal: 工程名ごとの Issue フォームと PR テンプレートを作り、タイトル形式とラベル1つの運用をテンプレートに書く。
2. Plan:
   - [x] `.github/ISSUE_TEMPLATE/` に工程名ごとのフォーム6つ（`title: "[工程名] "`、`labels` は工程名1つ、本文は概要／参照ドキュメント／完了条件／依存）
   - [x] 各フォームの冒頭に運用（ラベルは工程名1つ、マイルストーンは手動設定）を記載
   - [x] `.github/pull_request_template.md`（関連 Issue、変更内容、検証結果のチェックリスト）
   - [x] main へマージし、GitHub 上での認識を確認
3. Verification: 公開ページの blob ビューで GitHub が解析した結果（`isIssueTemplate: true`、`errors: []`）を6ファイル分確認。PR テンプレートは community profile API で検出を確認。
4. Review:
   - 初回は「実装」フォームが `Name is too short (minimum is 3 characters)` で無効だったため、名前を「実装タスク」に修正した（ラベルとタイトルは「実装」のまま）。
   - Issue フォームはマイルストーンを設定できないため、作成後に手動で設定する旨をフォームに書いた。
   - 選択画面（`/issues/new/choose`）はログインが必要なため、ブラウザでの目視は未実施。

# #8 CI ワークフロー

1. Goal: PR と main への push で tsc / test / lint / build を実行し、失敗したら赤くなる CI を作る。
2. Plan:
   - [x] `.nvmrc`（24.18.1）で Node を固定し、`setup-node` の `node-version-file` と `cache: npm` を使う
   - [x] `.github/workflows/ci.yml`：4ジョブ（typecheck / test / lint / build）を並列に実行。`permissions: contents: read`
   - [x] PR #57 で全ジョブ成功を確認
   - [x] 意図的に壊した PR #58（型エラー・`any`・失敗するテスト）で4ジョブとも失敗することを確認し、クローズ
3. Verification: `gh pr checks`、失敗ログで原因が TS2322 / no-explicit-any / AssertionError / next build の型エラーであることを確認。
4. Review:
   - `format:check` は既存ファイルの改行コード問題で失敗するため CI に含めていない（#5 の Review 参照）。→ #82 で解消し、`format` ジョブとして CI に追加した。
   - アクションは最新メジャー（checkout v7 / setup-node v7）。
   - 確認用 PR では claude-code-review が自動で走るため、実行をキャンセルした。

# #10 Vercel プロジェクト作成と仮デプロイ

1. Goal: Vercel にプロジェクトを作り、仮デプロイで空のページを表示する。Git 連携の自動デプロイは無効にする。
2. Plan:
   - [x] `vercel link --yes --project egosearchx` でプロジェクトを作成
   - [x] `vercel deploy --prod` で仮デプロイ
   - [x] Git 連携が無効なことを API で確認
   - [x] 組織 ID・プロジェクト ID を控える（#11 で使う）
3. Verification: `https://egosearchx.vercel.app` が HTTP 200 で `<title>EgoSearch Studio` を返す。`/v9/projects/egosearchx` に `link` が無く、`gitProviderOptions.createDeployments` が `disabled`。`git status` に `.vercel/` が出ない。
4. Review:
   - 組織 ID（`VERCEL_ORG_ID`）：`team_ysndceqTSNJaxb6KPrCKFxPJ`
   - プロジェクト ID（`VERCEL_PROJECT_ID`）：`prj_BOC5P5PfVivPlB6EeKy2FvalwdkU`
   - `VERCEL_TOKEN` の値は #11 でユーザーが GitHub のシークレットに登録する。ここには書かない。
   - `vercel link` が GitHub リポジトリの接続を試みて失敗した。結果として Git 連携は無効のまま。
   - `vercel link` が `.gitignore` に重複行を追記し、`.env.local`（OIDC トークン）を作ったため、`.gitignore` は戻し、`.env.local` は削除した。

# #11 GitHub Actions による Vercel 自動デプロイ

1. Goal: PR で Preview、main へのマージで Production に自動デプロイし、PR に Preview URL をコメントする。
2. Plan:
   - [x] `ci.yml` に `deploy` ジョブを追加（`needs` は CI の4ジョブ。同一リポジトリの PR と main への push のみ）
   - [x] `VERCEL_ORG_ID`／`VERCEL_PROJECT_ID`／`VERCEL_TOKEN` を GitHub Secrets に登録
   - [x] PR #59 で Preview URL のコメントを確認、main へのマージ後に Production のデプロイ成功を確認
3. Verification: PR #59 のコメントに Preview URL。main の CI 5ジョブ成功。Lint が失敗した最初の実行では deploy がスキップされた。`https://egosearchx.vercel.app` が 200。
4. Review:
   - main の CI は Dependabot の eslint-config-next 16 への更新以降 lint が失敗していた（FlatCompat 経由の読み込みが循環参照で壊れる）。`eslint.config.mjs` を flat config の直読みに直した。
   - コメントは `<!-- vercel-preview -->` の目印で更新し、push のたびに増やさない。

# #60 モックの別デザイン案（mock1〜5）

1. Goal: 現行モックを mock1 とし、別デザインの mock2〜5 を追加して、`/mock` の一覧から比べられるようにする（破棄は #61）。
2. Plan:
   - [x] 現行を `src/app/mock/mock1/` へ移動、一覧ページと戻りリンクを追加
   - [x] mock2（左ドロワー）、mock3（お気に入り）、mock4（Bento＋パレット）、mock5（配信者目線）
   - [x] README と todo を更新
   - [ ] make check、ルートの疎通確認、PR → main にマージ
3. Verification: make check、dev で全ルートが 200 かつバナーと一覧への戻りリンクを含むこと、全ファイルにマーカーがあること。
4. Review: 新規テストは書かない（破棄前提の例外）。検索結果は表示しない。実在の名前は使わない。

# 要件・画面仕様書の改訂（mock6 の方針）と文書の同期

1. Goal: mock1〜5 への感想を反映して要件定義書・画面仕様書を改訂し、mock6 を作る。実装計画・調査資料の旧用語を新仕様に合わせる。
2. Plan:
   - [x] `docs/requirements.md`（F1〜F12、付録B 旧→新対応）、`docs/screen-spec.md`（S1〜S9、M1〜M3）を全面改訂
   - [x] CLAUDE.md の最小修正、`tasks/design-lessons.md` の新規作成
   - [x] mock6 を `src/app/mock/mock6/` に追加（`@dnd-kit/react` 導入）。PR #65 でマージ
   - [x] `docs/implementation-plan.md`（構成・データ構造・M0〜M7 の内容）と `docs/research-phase0.md` を新仕様に同期
3. Verification: make check 相当（tsc / test / lint / build）と CI。mock6 は全ルート 200 と、削除→削除済み→復元の使い捨てテストで確認。360px／1280px の目視は未実施。
4. Review:
   - 上の #60 の記述（S1〜S4・M1〜M3）は mock1 当時の旧画面番号。履歴として残す。
   - GitHub の Issue #12〜#41 は未更新（指示により触っていない）。旧番号・旧内容（プリセット、メンバー選択、スタジオなど）のままなので、実装に着手する前に新仕様へ書き直す必要がある。

# mock6 の簡素化と日英対応の仕様化

1. Goal: mock6 を「表示と編集を分けた直感操作の画面」に簡素化し、UI の日本語・英語の両対応を MVP の要件として仕様書に明記する。
2. Plan:
   - [x] ヘッダーにエゴサグループ先頭2件（`配信後エ…(3)` の省略）、フッターに最後の履歴1件、［≡］メニューに「コマンドパレット」
   - [x] ホームを1カラムに。条件ボタンは押すだけ（取っ手・鉛筆・×・＋を外す）。ON/OFF でアイコン枠・枠線・文字の太さを揃え、「新」バッジは重ねて置く
   - [x] ［⋯］（Yahoo で開く・リンクのコピー・クエリのコピー）、お気に入りは実行だけ、履歴はホームから外す
   - [x] 「詳細設定（この検索だけ）」を「詳細条件」に改名
   - [x] `docs/requirements.md`・`docs/screen-spec.md`・`docs/implementation-plan.md`・CLAUDE.md を更新（日英対応は MVP の必須要件）
   - [ ] 検証（tsc / test / lint / build、360px・1280px の目視）
   - [ ] Issue「[実装] UI の日英対応（i18n）」を作成
   - [ ] コミット → push → PR → main にマージ
3. Verification: tsc / test / lint / build。dev で、条件ボタン・期間ボタンを押しても［X で開く］の位置と条件ボタンの幅が変わらないこと、360px でヘッダーのグループが2件に収まること、［⋯］の開閉、フッターとトーストが重ならないこと。
4. Review:
   - PR #68。Issue #67（[実装] UI の日本語・英語の両対応）を M7 に作成。
   - tsc / test（54件）/ lint / build は通過。dev で mock6 全ルートが 200。
   - **未確認**：360px・1280px の目視と、押したときの位置のずれの計測（ブラウザ操作ツールが無かった）。CSS で幅・高さを固定した設計のため、実機での確認が必要。
   - 仕様の判断：コマンドパレットのヘッダーボタンは外した（Ctrl/⌘+K とメニューの項目は残る）。ランチャー（S9）ではヘッダーのグループとフッターを出さない。
   - `next dev` が `AGENTS.md` を自動生成してコミットに入ったため、別コミットで外した。
   - Issue #12〜#41 は旧仕様のまま（実装前に新仕様へ書き直す必要がある）。

# mock6 の整理（2巡目）：いつものエゴサの移動とお気に入りの分離

1. Goal: 画面の煩雑さを減らすため、アイコン・期間ボタン・プレビューの2行・お気に入りの主張を整理し、いつものエゴサを全ページの本体上部に移す。
2. Plan:
   - [x] 条件ボタンのリストアイコンと ×N を削除
   - [x] プレビューを1行固定（横スクロール）、［X で開く］を最小幅に、［⋯］に Yahoo リンクのコピーを追加
   - [x] 期間ボタンから「日付」を外し、詳細条件で指定中の期間を注記に表示
   - [x] お気に入りを閉じた1行にし、開閉を localStorage に記憶
   - [x] いつものエゴサをヘッダーから外し、ヘッダー下の帯に（ランチャーを含む全ページ）
   - [x] CLAUDE.md・docs・design-lessons を更新
   - [ ] ブラウザでの目視（360px／1280px）
   - [ ] コミット → main にマージ
3. Verification: tsc / test / lint / build。dev で、全ページに帯が出ること、グループ・条件ボタン・期間ボタンを押しても幅と位置が変わらないこと、360px でプレビューが1行のままなこと、お気に入りの開閉がリロード後も残ること。
4. Review:
   - tsc / test（54件）/ lint / build は通過。
   - **未確認**：360px／1280px の目視と、押したときの位置のずれの計測（下記の目視確認を参照）。
   - Yahoo のリンクコピーは、モックに変換器が無いため、X のクエリをそのまま `search.yahoo.co.jp/realtime/search?p=` に付けるだけ。トーストで本実装での変換を案内している。

# mock6 の改訂（3巡目）：用語統一・いつものエゴサの追加・サジェスト・削除済み

1. Goal: 用語を「いつものエゴサ」に統一し、帯の［＋］から2通りで追加でき、お気に入りの削除が連動し、サジェストと3種類の削除済みを備えた mock6 にする。
2. Plan:
   - [x] ブランチ `feature/mock6-revise-3`、前回の未コミット（バージョン情報）を別コミット
   - [x] データ・ストア（種類ごと20件、連動削除 batch、サジェスト、自動追加と設定の廃止）
   - [x] ヘッダーの機能タイトル、帯の［＋］、追加・編集シート（方法①②）
   - [x] 条件ボタン列（［閉じる］廃止、編集リンクは行の右端、サジェスト）、条件ボタンの編集にサジェスト
   - [x] お気に入り削除の確認（列挙、2件以上は再確認）、削除済み（タブ・中身・まとめて復元）
   - [x] URL解析、履歴（再実行と保存だけ）、設定ページの削除
   - [x] 要件定義書・画面仕様書・実装計画・CLAUDE.md・design-lessons を更新
   - [ ] ブラウザでの目視（360px／1280px）
   - [ ] コミット → main にマージ
3. Verification: tsc / test / lint / build、dev で mock6 全ルート 200（`/settings` は 404）、用語の grep。
4. Review:
   - tsc / test（54件）/ lint / build は通過。dev で全ルート 200、`/mock/mock6/settings` は 404。
   - **未確認**：360px／1280px の目視。特に条件ボタン列の「2行目の末尾に［もっと開く］と編集リンクを収める」計測（`chips.tsx` の `calc`）と、削除→再確認→元に戻すの一連の操作（ブラウザ操作ツールが無かった）。
   - 判断：自動追加は廃止してサジェストに置き換え、お気に入りの連動削除は「使っているいつものエゴサも一緒に削除済みへ」（ユーザー回答）。［ホームに読み込む］は［ホームで編集する］。
   - 内部の変数名・型名（`groups`、`Group`）は mock のためそのまま。URL も `/mock/mock6/groups` のまま。
   - 検証で起動した dev サーバー（ポート 3111）は、プロセス停止が許可されなかったため残っている。`next dev` が生成した `AGENTS.md` はコミットしない。

# mock 4巡目：ダークモード・期間・実体で持つデータ・mock6 を /mock に昇格

1. Goal: 4巡目の指摘（ダーク、主ボタンの強調、条件ボタン8個、期間3つ＋日付、複製・表示、検索文字列を実体として持つ、名前の二重入力の解消）を mock に反映し、mock6 を `/mock` に昇格して仕様書も直す。
2. Plan:
   - [x] ブランチ `feature/mock6-revise-4`。mock1〜5 と一覧・`_components` を削除、mock6 を `/mock` へ移動
   - [x] ダーク固定、主ボタンを青、`toggleClass` にトグルの見た目を集約、完全一致をチェックボックスに
   - [x] 条件ボタン：先頭8個で折りたたみ、「表示」、複製
   - [x] `PeriodPicker`（昨日から／3日前から／1週間前から／日付）をホーム・詳細条件・追加シート・お気に入り編集で共有
   - [x] お気に入り・いつものエゴサを検索文字列（＋期間）の実体に変更。連動削除を廃止
   - [x] いつものエゴサの追加：名前は1つ、お気に入りの名前は自動
   - [x] 画面仕様書・要件定義書・実装計画・CLAUDE.md・README・lessons を更新
   - [x] Issue #17 を修正
   - [ ] main へマージして push
3. Verification: tsc / test（54件）/ lint / build 通過。静的書き出しで `/mock` 直下の全ルートが 200、`/mock/mock1`・`/mock/mock6` は 404。
4. Review:
   - **未確認**：ブラウザが使えず、ダークの見た目、［X で開く］の目立ち方、360px の日付入力行の収まり、押してもガタつかないこと（`getBoundingClientRect`）は目視していない。
   - 判断：「条件のコピー」は複製と解釈。「いつものエゴサの追加」の②で作るお気に入りは自動命名。
   - 既存の dev サーバー（ポート 3111、前のセッションのもの）は残っている。`.next` を build で更新したため 500 を返す。再起動が必要。
   - 変数名・型名（`groups`、`Group`）は mock のためそのまま。

# mock 5巡目：ホームの第一印象（初回の好みの選択・入力と開くボタンの隣接・条件の枠・サイト説明）

1. Goal: 初めて開いた人にも便利さが伝わるよう、初回カード、入力〜開くボタンの隣接、「条件」の枠、サイト説明を mock に入れる。
2. Plan:
   - [x] ブランチ `feature/mock-first-impression`
   - [x] 初回カード（興味の選択＋名前・タグ→「推しエゴサ」）、バナーの［初回の状態で見る］
   - [x] OpenBar（クエリ＋X／Yahoo／保存／⋯）をホームと詳細条件の末尾に、Enter で開く
   - [x] 「条件」の枠、期間のセグメント化、空行の削減
   - [x] ホームの説明文と「このサイトについて」（`/mock/about`）
   - [x] 要件定義書・画面仕様書（S10）・CLAUDE.md・README・design-lessons
   - [ ] main へマージして push
3. Verification: tsc / test（54件）/ lint / build 通過、静的書き出しに `/mock/about` が出ること。
4. Review:
   - **未確認**：ブラウザ操作ツールが無く、360px／1280px の目視、押したときのずれの計測（`getBoundingClientRect`）、IME の Enter の挙動は未実施。特に360px で［X で開く］［Yahoo で開く］［☆］［⋯］が1行に収まるか。
   - 計画から変えた点：`?fresh=1` は、effect 内の setState が lint で禁止されるため、バナーのボタン［初回の状態で見る］に変えた。初回カードの完了は localStorage ではなくモックの状態（再読み込みで戻る）で持つ。
   - サジェストの空き枠表示は、ユーザーの意図（個人の好みの反映）と違うため採用しなかった。

# 脆弱性の修正と条件ボタンの［コピー］

1. Goal: Dependabot の minimatch の脆弱性（moderate）を解消し、条件ボタンの［複製］をクリップボードへの［コピー］に直す。
2. Plan:
   - [x] `package.json` の `overrides` に `"minimatch@^10.0.0": "^11.0.1"`（eslint・typescript-eslint・ts-morph 経由。3.x は対象外のため触らない）
   - [x] 条件ボタンの［複製］を［コピー］（条件の文字列をクリップボードへ）に変更。`duplicateChip` を削除し、文書を更新
   - [x] tsc / test / lint / build、`npm audit`、main へマージして push
3. Verification: `npm audit` が 0 件、`npm ls minimatch` に 10.x が残らない。
4. Review: 「条件のコピー」の解釈を取り違えた（複製と解釈）。ユーザーの訂正で修正。

# ホロライブ前提への変更（興味の切替・作った理由・サイト名と SEO）

1. Goal: 初回カードをやめ、ホロライブ前提＋ヘッダーで興味の対象を切り替える形にし、サイト名を「Hololive EgoSearch」に変えて、説明を「作った理由」にする。
2. Plan:
   - [x] テスト先行：`page.test.tsx`（見出し）と `site-footer.test.tsx`（非公式の表示）を Red → Green
   - [x] 実アプリ：`page.tsx`、`layout.tsx` の metadata（title の default／template、description）、`SiteFooter` に非公式の1行
   - [x] モック：`interest-picker.tsx`（ヘッダーの［ホロライブ▾］）、store の `interest`、初回カードと推しエゴサの自動作成を削除、about を「作った理由」に
   - [x] 仕様書：requirements（1章・F6・F11・7章・9章 SEO・付録A）、screen-spec、implementation-plan、CLAUDE.md、README
   - [x] design-lessons を改訂・追加
   - [ ] make check、画面確認、grep、コミット、main へマージして push
3. Verification: make check、`out/index.html` の title・description、dev で［ホロライブ▾］の切替（キーボード、リロード後の保持、360px）、旧用語の grep。
4. Review: 数字の根拠は aramakijake.jp の推定値（Yahoo は Google の1/4の固定比で独立根拠ではない。X 系の語は過小評価の可能性）。公式誤認のリスクは requirements 7章に記録。説明文の「検索出来なかった」は「保存してまとめて実行できなかった」と中立に書いた。

# X のリスト除外（-list:）の削除と、アカウント除外の実機検証結果の反映

1. Goal: X でエラーになる `-list:` をモック・文書から外し、`-from:`／`-to:`／`-@` を実機確認済み（stable）にする。
2. Plan:
   - [x] テスト先行：`-list:123` は除外の欄に入らず raw に入る（Red を確認 → Green）
   - [x] モック：`exList` の型・初期値・解析・出力・詳細条件の欄を削除
   - [x] 文書：research-phase0（5章 #6、6章 E6）、requirements F3、screen-spec（詳細条件・未確定事項）、implementation-plan 4章
   - [x] make check
   - [x] コミット（17b9600、114912a でマージ済み）
3. Verification: make check（テスト109件）、`-list:`／`exList` の grep で記録とテスト以外に残らないこと。
4. Review:
   - `-filter:follows` はもともと文書・コードに無く、E6 に「使わない」とだけ記録した。
   - **未確認**：ブラウザでの目視（詳細条件の除外が3欄になった並び）。

# API仕様書：フロントエンドとバックエンドの境界

1. Goal: 画面（フロントエンド）と規則・保存（バックエンド）を、同じブラウザの中で分けて実装できるように、両者のインターフェースを `docs/api-spec.md` に決める。
2. Plan:
   - [x] ブランチ `docs/api-spec`
   - [x] `docs/api-spec.md`（責務、依存の向き、共通の決まり、型、API 一覧、外部 URL、画面ごとの呼び出し、実装の状態、未決定）
   - [x] 参照の付け替え：要件定義書 10.2・12.1・12.3、実装計画 2章・5章、CLAUDE.md
   - [x] Issue #85「[実装] API 層（契約の型・バックエンドの束ね・import の制限）」を M4 に作成。#24 を「ストア⇄API」に直した
   - [x] `make check`、コミット（b386f3d でマージ済み）
3. Verification: `make check`。作成済みとして書いた名前（DAO のリポジトリ、モックの query-model の関数）が実在する export と一致する。「グループ」が無い。「Yahoo」の短縮が無い。画面仕様書 S1〜S10・D1〜D3 の操作が6章の表に対応する。
4. Review:
   - 解釈：依頼の「API」は、将来の REST ではなく、**同じブラウザ内の2層（フロント／バック）の境界**（ユーザーに確認済み）。コードはまだ書かない（実装は新しい Issue）。
   - 決めたこと：計算は同期の純粋関数、保存は async。失敗しうる同期の関数は `Result`、async は `ApiError`。文言は返さずコードで返す。スキーマと `LIMITS` は契約が持つ。
   - **未決定12件は 0a2b8a8 で全件決定**（下の節）。当初の未決定は（`isNew` の保存先、`lastRunAt` の使い道、`f=live` の保存、Yahoo!リアルタイム検索 URL の逆変換、「今日は実行済み」の定義など）。推測で埋めていない。

# todo.md と Issue を API 仕様の決定に合わせる

1. Goal: 0a2b8a8（API 仕様書の未決定12件の決定）などを、todo.md と GitHub Issue に反映する。
2. Plan:
   - [x] ブランチ `docs/sync-todo-issues`
   - [x] 新しい Issue #88（M1：契約の型・`IssueCode`・`LIMITS`・zod スキーマ）。#85 は束ね（M4）だけに絞った（ユーザーに確認済み）
   - [x] Issue の修正：#85・#24・#20・#18・#15・#19・#80・#35・#32・#73・#76・#77、#12・#14・#16・#17 の依存に #88、画面の Issue の参照に api-spec 6章
   - [x] implementation-plan 5章の M1、todo の割り当てと作業順
   - [x] make check、コミット、main へマージして push
3. Verification: 開いている Issue がマイルストーンとラベルを1つずつ持つ。開いている Issue に「7.3」の参照が無い。`make check`。
4. Review:
   - 0a2b8a8 で決めたこと：X は常に `f=live`、ランチャーの接頭辞 `v1.`／`v1u.`、`LIMITS.launcherUrlWarn`（暫定2000）、Yahoo URL の逆変換、`yahoo.rawUnverified`、いつものエゴサとお気に入りの `lastRunAt`（#86）、壊れたデータの初期化 `data.reset`（#87）。
   - モックが追いついていない4点（最新タブの設定、今日は済、前回の表示、壊れたデータの表示）を、#32・#73・#76・#77・#87 に書いた。

# 検索ワード集（モックの仕様追加）を仕様書・Excel・Issue に反映する

1. Goal: モックに足された検索ワード集（約200件、チャンネル単位のグループ、D4 ダイアログ、履歴0件のとき約60件をホームに出す）を、要件定義書・画面仕様書・API 仕様書・実装計画・Excel・todo・Issue に反映する。
2. Plan:
   - [x] ブランチ `docs/word-set`
   - [x] 要件定義書：F6（検索ワード集）、7章の上限、10章、11章（ER・Word／WordGroup・11.4・11.6）、13章、付録A
   - [x] 画面仕様書：D4、3.1・3.3・3.12、8章（モーダルは D3 と D4）、10章
   - [x] API 仕様書：`master.wordSet`、`query.starters`、型 `Word`／`WordGroup`、画面ごとの呼び出し、7章
   - [x] 実装計画：`word-set.json`、`chips/starters.ts`、M3・M5、`LIMITS`
   - [x] Excel：シート「ワード集グループ」（日英の対応表）と「検索ワード集」を追加
   - [x] Issue：#89 を新規。#21・#70・#80・#32・#88・#67 を修正
   - [x] make check、コミット、main へマージして push
3. Verification: `make check`。仕様書内で `D1〜D3`・`wordSetStarter`・`word-set.json` の言及が一致している（grep）。Excel を開き直して5シートと入力規則が残っている。
4. Review:
   - 判断：D4 は「選ぶためのダイアログ」で、確認ではないため、CLAUDE.md の「確認のモーダルは元に戻せない操作にだけ」とは両立する（画面仕様書 8章に D3 と D4 の2つと明記）。
   - 判断：グループ名だけ日英の対応を持つ。ワードの表示名・検索文字列は固有名詞なので言語で変えない（ユーザーの指示は「グループ分けを Excel で日本語入力、英語対応表」）。
   - 判断：モックはホームの検索ワード集のボタンのラベルを検索文字列で出し、D4 では表示名で出す。そのまま仕様にした。
   - **未確認**：「履歴があるとき」はホームにワード集を出さない。履歴が消えると（削除）また出る。モックの挙動のとおり。
   - 次の脆い点：検索ワード集の約200件の中身（実在のタグ）はユーザー作業（U1）。JSON の件数の検証（60件に満たない場合の扱い）は #21 で決める。

# M0 の残り（#82 format:check の CRLF、#83 旧 .gitkeep）

1. Goal: `npm run format:check` を通し、CI に含め、廃止した機能の `.gitkeep` を整理する。
2. Plan:
   - [x] ブランチ `chore/m0-cleanup`
   - [x] `.gitattributes` を `* text=auto eol=lf` にし、作業ツリーを LF に揃える
   - [x] `claude-code-review.yml`・`claude.yml` を整形
   - [x] `ci.yml` に `format` ジョブを追加し、`deploy` の `needs` に加える
   - [x] `src/components/studio`・`src/lib/templates`・`src/data/agencies` の `.gitkeep` を削除
3. Verification: `npm run format:check`、`make check`、push 後の CI。
4. Review:
   - 原因：`core.autocrlf=true` で作業ツリーが CRLF になり、Prettier（`endOfLine: lf`）が55ファイルで失敗していた（index はすべて LF）。本当に整形が崩れていたのは yml 2つだけ。
   - 方針：format:check は CI に含める。`make check` の順序（typecheck → test → lint → build）は変えない（pre-commit の lint-staged が整形済み）。
   - T2（モックの目視）はユーザーが確認済みのためクローズした。


# #88 契約の型（src/api）

1. Goal: 画面とバックエンドの境界の型・警告コード・定数・zod スキーマを `src/api` に置き、DAO の定義を契約へ移す。
2. Plan:
   - [x] ブランチ `feature/api-contract`、テスト先行（Red 確認）→ `src/api` 実装
   - [x] `lib/limits.ts` 削除、`lib/storage/schema.ts` は `SCHEMA_VERSION` だけ、`lib/storage` が `@/api` を import
   - [x] CLAUDE.md・docs の参照を更新
   - [ ] main へマージして push、#88 を閉じる
3. Verification: `make check`（テスト124件）と `npm run format:check` は通過。`@/lib` を `src/api` が import していない。
4. Review: `EgoSearchApi` と入力型は #85 の完了条件のため作らず。`ApiError` は `{ cause }` を受ける。`EMPTY_DETAIL.flt` は全キー `"any"`。

# #71 検索文字列の規則を lib/query/model.ts へ移す

1. Goal: モックの `query-model.ts` とテストを、契約（`@/api`）の型で動く `src/lib/query/model.ts` へ移し、モックはそれを参照する。
2. Plan:
   - [x] ブランチ `feature/query-model`、`git mv` で移動
   - [x] テストを先に契約の型へ直し、赤（import エラー）を確認
   - [x] model.ts を `@/api` の型・定数へ（`PARAM_OP_TYPES`、`FILTER_KEYS`、`flt` は `"any"` 初期値、`onIds` → `onChipIds`）。`REL_PERIODS`（ラベル無し）と `SuggestRule` は model.ts に置く
   - [x] モックの約10ファイルを `@/lib/query/model` へ。契約の `Detail` に無い `live` はモックの `toMockScope` で補う
   - [x] parse → build の往復と Yahoo 警告のテストは、モックの `buildQuery` に依存するので `_parts/query.test.ts` に残す（#16 で lib へ）
   - [x] docs（api-spec・requirements・implementation-plan・mock README）
3. Verification: `make check`（テスト124件）、`npm run format:check` が通る。lib のテストに `flt` の振り分け（`filter:images` → inc、`-filter:replies` → exc）。`grep query-model src docs` が 0 件。
4. Review:
   - 変えたのは、型と定数の取り先、`onIds` → `onChipIds`、`flt` の初期値と判定だけ。規則は変えていない。
   - **未確認**：`make dev` でモックの画面（お気に入りの編集・URL解析）を目で見る確認はしていない。型・テスト・build で代替。
   - **次に壊れやすい点**：#85 で `@/lib/query` を `no-restricted-imports` で禁止するとき、`src/app/mock/**` を除外する（モックは lib を使う）。#16 で往復テストを lib へ移す。

# #12 AST の型と演算子の定義（operators.ts）

1. Goal: 検索条件モデル（AST）の型と、演算子の定義（エンジン別の対応・status）を `src/lib/query` に1か所で置く。
2. Plan:
   - [x] ブランチ `feature/ast-operators`、テスト先行（Red 確認）
   - [x] `ast.ts`（全ノードに `negate`。期間は契約の `Period` を使う）、`operators.ts`（`PARAM_OP_TYPES`・`FILTER_KEYS` を `satisfies Record` で網羅、`list` は否定不可、`since_time`／`until_time` は生成しない、実機だけが根拠の定義に根拠と代替手段をコメント）
   - [x] ユーザー決定（2026-11-18）：`@x` は `@` のまま出して `yahoo.mentionAsReply`、`lang:` は `yahoo.langUnsupported`、`min_*` は `yahoo.minCountUnsupported`、`since_time`／`until_time` は `lts`／`uts` へ。`issues.ts`・api-spec 2.4・requirements F5 に反映
   - [x] implementation-plan（`PeriodSpec`→`Period`、`negate`、`warnings.ts` を削除）
   - [ ] main へマージして push、#12 を閉じる
3. Verification: `make check` と `npm run format:check` が通る。
4. Review:
   - 変えたのは新規の `ast.ts`・`operators.ts`・テストと、警告コード3件の追加だけ。
   - Yahoo の `lang:`・`min_*` は実機で効かないことを確認した（2026-11-18、E8）。「除いて警告」の根拠が実機になった。
   - **次に壊れやすい点**：#15 の Yahoo シリアライザーと、#72 の辞書が、新しい警告コード3件の文言を持つこと。

# #13 トークナイザーと X クエリのパーサー

1. Goal: X のクエリ文字列を AST に変換するパーサーを `src/lib/query` に置く。解析できないものは raw で保持し、内容を欠かさない。
2. Plan:
   - [x] ブランチ `feature/parser-x`、テスト先行（Red 確認：`./parse-x` が無く失敗）
   - [x] `tokenizer.ts`（`lex`。括弧・OR・否定・閉じない引用符を区別し、入力の位置を持つ）、`parse-x.ts`（`parseX`）
   - [x] 演算子の判定は `operators.ts` の定義から導く（アカウントは `negatable`、`-list:` は定義の結果として raw）。`ast.ts` に `ParseOnlyOp` を追加し、`PARSE_ONLY_OPS` を型で結ぶ
   - [x] research-phase0 6章 E9、要件定義書 F4・7章、実装計画 2章、API 仕様書の実装の状態
   - [ ] make check・format:check、main へマージして push、#13 を閉じる
3. Verification: `make check`、`npm run format:check`。
4. Review:
   - 決定（ユーザーが実機で確認、2026-11-18）：括弧なしの OR は、X も Yahoo も OR を先に結ぶ（ぺこら AND (配信 OR 歌枠)）。E9 に記録。
   - 判断：値付きの演算子（lang・min_*・since・until・since_time）の否定は、定義に無いので推測せず raw。相対期間の記号は `since` の値（`yesterday` など）として解析し、`until` には使えない。
   - 往復（parse → serialize → parse）は #14 で作る。ここでは raw の `text` が入力の該当部分と一致することを確かめた。
   - **次に壊れやすい点**：#14 のシリアライザーが、`since` の相対記号の値（`yesterday`）をそのまま `since:yesterday` に戻すこと。#17 で日付に展開する。
