# モック（紙芝居）— 破棄予定

画面の見た目と遷移を確認するためだけの使い捨てコード。**本実装では使わない。**

- 作成：#60 ／ 破棄：#61（本番リリース #41 より前に消す）
- 固定のダミーデータと `useState` だけで動く。パーサー、URL 生成、永続化は使っていない
- 実在の名前・ハンドル・リスト ID は入れていない（すべて架空）
- `src/app/mock/` の外から import しない。ここから `src/lib` などの本実装を import しない
- 各ファイルの先頭に `MOCK: 破棄予定` のマーカーを付けている

## 破棄の手順
1. `src/app/mock/` ディレクトリを丸ごと削除する
2. `MOCK: 破棄予定` と `app/mock` を全文検索して 0 件を確認する
3. 型チェック・テスト・lint・build を通す

## デザイン案（mock1〜5）
`/mock` が一覧。各モックから「← モック一覧」で戻れる。

| ルート | 案 |
|---|---|
| `/mock/mock1` | 現行（上部ナビで4画面。`studio` `launch` `settings` を含む） |
| `/mock/mock2` | 左上の開閉ボタンのドロワーに項目を集約 |
| `/mock/mock3` | X 検索特化のトップ＋お気に入り（条件を触って保存、再利用、編集） |
| `/mock/mock4` | Bento Grid＋コマンドパレット（Ctrl/⌘+K） |
| `/mock/mock5` | 配信者目線のアイデア集（MVP 対象外のものはバッジ付き） |

mock4 の出典（2026年のトレンド）：
- https://clay.global/blog/web-design-guide/web-design-trends
- https://www.designrush.com/agency/website-design-development/trends/web-design-trends
