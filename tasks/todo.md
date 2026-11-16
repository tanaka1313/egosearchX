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
