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
