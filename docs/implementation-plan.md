# 実装計画（技術設計）

関連文書：`docs/requirements.md`、`docs/screen-spec.md`、`docs/research-phase0.md`。

## 1. 技術スタック
| 用途 | 採用 | 理由 |
|---|---|---|
| フレームワーク | Next.js 15（App Router）+ React 19 + TypeScript（strict） | 要件定義書の指定 |
| 配信 | `output: 'export'`（静的書き出し）で Vercel に配置 | サーバー処理が不要 |
| UI | Tailwind CSS 4 + shadcn/ui（Resizable、Tabs、Dialog、Tooltip 等） | 指定。ペイン分割は shadcn の Resizable を使う |
| 状態管理 | zustand（persist ミドルウェアで localStorage） | 軽量。バージョンと移行処理を持てる |
| スキーマ検証 | zod | マスタJSON・保存データ・ランチャーURLの検証 |
| 並べ替え | @dnd-kit | ツリーとカードのドラッグ |
| URL圧縮 | ブラウザ標準の `CompressionStream('deflate-raw')` + base64url | 依存を増やさない |
| テスト | Vitest（ロジック）+ Testing Library（主要コンポーネント） | |
| パッケージ管理 | npm | CLAUDE.md のコマンドに合わせる |

## 2. ディレクトリ構成
```
src/
  app/
    page.tsx              S1 クイック実行
    studio/page.tsx       S2 スタジオ
    launch/page.tsx       S3 ランチャー
    settings/page.tsx     S4 設定
  components/
    common/               PresetCard, EngineBadge, QueryPreview, UrlPreview, WarningList
    studio/               Explorer, QueryEditor, QueryTree, Preview, BottomPanel
    dialogs/              MemberPicker(M1), UrlImport(M2), PublishSet(M3)
  lib/
    query/
      ast.ts              検索条件モデル（木構造）の型
      operators.ts        演算子定義を1か所に集約（エンジン別の対応、experimental フラグ）
      tokenizer.ts        文字列 → トークン
      parse-x.ts          Xクエリ → AST（未知の演算子は raw ノード）
      serialize-x.ts      AST → Xクエリ
      serialize-yahoo.ts  AST → Yahooクエリ + 警告の配列
      merge.ts            共通設定の継承と項目ごとの無効化
      dates.ts            相対日付の解決、until の翌日変換（UTC）
      warnings.ts         警告の型と文言
    url/
      build.ts            AST → X/Yahoo の URL
      parse.ts            URL → AST（x.com / twitter.com / Yahoo）
    templates/            名前エゴサ・公式タグ・箱リプライ・Yahoo版の生成
    launch/codec.ts       検索セット ⇄ `/launch#v1.<base64url>`
    storage/              ストアの定義、バージョン、移行処理
  data/
    agencies/hololive.json, nijisanji.json
    schema.ts             zod スキーマ
    index.ts              事務所の登録（ファイルを足して1行追加するだけ）
```

## 3. 中核のデータ構造（ast.ts）
```ts
type Node =
  | { kind: 'term'; id: string; mode: 'exact' | 'plain'; value: string; enabled: boolean }
  | { kind: 'variants'; id: string; values: string[]; enabled: boolean }   // 表記ゆれ展開
  | { kind: 'account'; id: string; op: 'from' | 'to' | 'mention' | 'list'; value: string; enabled: boolean }
  | { kind: 'filter'; id: string; name: string; value?: string; enabled: boolean }
  | { kind: 'group'; id: string; join: 'AND' | 'OR'; children: Node[]; enabled: boolean }
  | { kind: 'raw'; id: string; text: string; enabled: boolean };          // 未知の演算子
// 除外は各ノードの negate: boolean で表す
type SearchSpec = { root: GroupNode; period: PeriodSpec; inheritCommon: { disabledIds: string[] } };
```
- 共通設定は別の `GroupNode` として保存し、`merge.ts` で「共通（無効化したIDを除く）AND 個別」に合成する。
- `serialize-*` は純粋関数で、`{ text, warnings }` を返す。警告は画面のどこに出すかを知らない。表示はUI側（下パネル・プレビュー・アイコン）で行い、モーダルは使わない。

## 4. 実験的な項目の扱い
- `operators.ts` の各定義に `status: 'stable' | 'experimental'` を持たせる。
  - experimental：`list:` と `to:` の同時使用、`since_time:`／`until_time:`、Yahooの期間パラメータ（`lts`／`uts`、既定では出力しない）
- experimental の要素を含む検索は、プレビューとカードに「実験的」バッジを付ける（非モーダル）。
- 実機確認の結果は、`operators.ts` の status とURL長の警告水準の定数を変えるだけで反映できるようにする。
- URL長の警告水準は暫定で「Xのクエリ 500文字」（APIの512文字を参考にした暫定値）とし、定数として1か所に置く。

## 5. マイルストーン
| # | 内容 | 完了条件 |
|---|---|---|
| M0 | 雛形：`create-next-app`、shadcn/ui、Vitest、ESLint、`git init` | tsc / test / lint / build が通る |
| M1 | クエリの中核（ast, tokenizer, parse-x, serialize-x/yahoo, merge, dates）をテスト先行で作る | 往復テスト、Yahoo変換表、until の翌日変換のテストが通る |
| M2 | URLの生成と解析、ランチャーの codec | X/YahooのURLの往復、壊れたハッシュの検出テスト |
| M3 | マスタ（zodスキーマ、サンプルJSON）、テンプレート生成 | 不正JSONでビルドが失敗する。リストIDの無い箱では箱リプライを生成しない |
| M4 | 永続化ストア（バージョン付き）と S4 設定 | 再読み込み後もデータが残る。移行処理のテスト |
| M5 | S2 スタジオ（ペイン、ツリーエディタ、テキスト同期、プレビュー、下パネル）、M2 URL取り込み | 画面仕様書 4章の操作が一通りできる |
| M6 | S1 クイック実行、M1 メンバー選択、M3 発行、S3 ランチャー | ブックマークURLから全タブを開ける。ブロック時にリンク一覧が出る |
| M7 | スマホ表示、キーボード操作、Vercelデプロイ | 360px幅で操作できる。本番URLで動く |

- マスタのサンプルJSONには、開発者が確認できるよう少数のメンバーだけを入れる。ハンドルとリストIDは推測で埋めず、空欄にして開発者が記入する。

## 6. 検証（各マイルストーン共通）
1. `npx tsc --noEmit`
2. `npm test`
3. `npm run lint`
4. `npm run build`
5. M5以降は `npm run dev` で画面を開き、画面仕様書の該当章の操作を確認する（Chromeでの確認を含む）

## 7. リスク
- `list:`+`to:` が使えなかった場合、「箱リプライ」テンプレートは `(from:a OR from:b ...) to:<ハンドル>` に切り替える。ただしメンバーが多いとクエリ長の上限に当たりやすいため、分割して複数タブにする案を用意しておく。
- `CompressionStream` は非同期で比較的新しいAPI。対応していないブラウザでは非圧縮のbase64urlに切り替える。
