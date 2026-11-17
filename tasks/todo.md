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
   - `npm run format:check` は既存の17ファイル（今回未変更）で失敗する。改行コード（CRLF）が原因とみられ、別途対応が必要。

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
   - `format:check` は既存ファイルの改行コード問題で失敗するため CI に含めていない（#5 の Review 参照）。
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

# 脆弱性の修正と条件ボタンの［コピー］

1. Goal: Dependabot の minimatch の脆弱性（moderate）を解消し、条件ボタンの［複製］をクリップボードへの［コピー］に直す。
2. Plan:
   - [x] `package.json` の `overrides` に `"minimatch@^10.0.0": "^11.0.1"`（eslint・typescript-eslint・ts-morph 経由。3.x は対象外のため触らない）
   - [x] 条件ボタンの［複製］を［コピー］（条件の文字列をクリップボードへ）に変更。`duplicateChip` を削除し、文書を更新
   - [x] tsc / test / lint / build、`npm audit`、main へマージして push
3. Verification: `npm audit` が 0 件、`npm ls minimatch` に 10.x が残らない。
4. Review: 「条件のコピー」の解釈を取り違えた（複製と解釈）。ユーザーの訂正で修正。
