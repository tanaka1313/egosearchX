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
