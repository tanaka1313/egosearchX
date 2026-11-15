# todo

## 1. Goal
エゴサ支援Webアプリを、承認済みの要件定義書・画面仕様書どおりに実装し、Vercel に公開する。

## 2. Plan
### 完了
- [x] 要件定義書（docs/requirements.md）作成・承認
- [x] 画面仕様書（docs/screen-spec.md）作成・承認
- [x] Phase 0 机上調査（docs/research-phase0.md）、修正案を承認・反映
- [x] 技術設計（docs/implementation-plan.md）作成

### 実装
- [ ] M0 雛形（Next.js、shadcn/ui、Vitest、ESLint、git init）
- [ ] M1 クエリの中核（テスト先行）
- [ ] M2 URL の生成・解析、ランチャー codec
- [ ] M3 マスタとテンプレート
- [ ] M4 永続化と設定画面
- [ ] M5 スタジオ画面と URL 取り込み
- [ ] M6 クイック実行、メンバー選択、発行、ランチャー
- [ ] M7 スマホ対応、キーボード操作、Vercel デプロイ

### 実験的項目の実機確認（担当：開発者。結果を operators.ts の status に反映する）
- [ ] E1 `list:<ID> to:<ハンドル>` が期待どおり動くか（ログイン済みのX）。NGなら from: の OR 方式に切り替え
- [ ] E2 `since_time:` / `until_time:` が Web 検索で使えるか
- [ ] E3 Web 検索のクエリ長の上限（長い OR 展開でエラーになる長さ）。結果で警告水準の定数を更新
- [ ] E4 Yahoo の `(A B)` OR の動作と、期間指定時の URL パラメータ（lts/uts）が現在も有効か
- [ ] E5 Yahoo で引用符付きの語が完全一致として動くか

### 開発者が用意するデータ
- [ ] D1 ホロライブ・にじさんじのメンバー情報（ハンドル、ハッシュタグ、表記ゆれ）
- [ ] D2 箱ごとの X リスト作成とリストID の記入

## 3. Verification
各マイルストーンで tsc → test → lint → build。M5 以降は画面で操作確認。

## 4. Review
（マイルストーンごとに追記）
