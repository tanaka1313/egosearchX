# 実装計画（技術設計）

関連文書：`docs/requirements.md`（F1〜F12）、`docs/screen-spec.md`（S1〜S9、M1〜M3）、`docs/research-phase0.md`。画面イメージは `/mock/mock6`（破棄予定のモック）。
注意：マイルストーン M0〜M7 は GitHub のマイルストーン名で、画面仕様書のダイアログ M1〜M3 とは別物。

## 1. 技術スタック
| 用途 | 採用 | 理由 |
|---|---|---|
| フレームワーク | Next.js 15（App Router）+ React 19 + TypeScript（strict） | 要件定義書の指定 |
| 配信 | `output: 'export'`（静的書き出し）で Vercel に配置 | サーバー処理が不要 |
| UI | Tailwind CSS 4 + shadcn/ui（Sheet、Dialog、Tooltip、Collapsible 等） | 指定。左メニューとシートは shadcn の Sheet を基にする |
| 状態管理 | zustand（persist ミドルウェアで localStorage） | 軽量。バージョンと移行処理を持てる |
| スキーマ検証 | zod | 既定リストJSON・保存データ・ランチャーURLの検証 |
| 並べ替え | `@dnd-kit/react`（`useSortable`、`@dnd-kit/helpers` の `move`） | 条件ボタン・お気に入り・条件の並べ替え。タッチとキーボードに対応（mock6 で導入済み） |
| URL圧縮 | ブラウザ標準の `CompressionStream('deflate-raw')` + base64url | 依存を増やさない |
| テスト | Vitest（ロジック）+ Testing Library（主要コンポーネント） | |
| パッケージ管理 | npm | CLAUDE.md のコマンドに合わせる |

## 2. ディレクトリ構成
```
src/
  app/
    page.tsx              S1 ホーム
    buttons/page.tsx      S2 条件ボタン
    favorites/page.tsx    S3 お気に入り
    groups/page.tsx       S4 エゴサグループ
    history/page.tsx      S5 履歴
    trash/page.tsx        S6 削除済み
    import/page.tsx       S7 URL取り込み
    settings/page.tsx     S8 設定
    launch/page.tsx       S9 ランチャー
    layout.tsx            ヘッダー、左メニュー、トースト、コマンドパレット
  components/
    common/               QueryPreview, EngineBadge, WarningList, ConfirmDialog, Toast, CommandPalette
    home/                 SearchBuilder, ChipRow（折りたたみ）, PeriodPicker, DetailPanel, SaveSheet
    chips/                ChipEditor(M1), SortableChip
    favorites/            FavoriteRow, GroupButton, GroupEditor
    dialogs/              PublishGroup(M2), Confirm(M3)
  lib/
    query/
      ast.ts              検索条件モデル（木構造）の型
      operators.ts        演算子定義を1か所に集約（エンジン別の対応、experimental フラグ）
      tokenizer.ts        文字列 → トークン
      parse-x.ts          Xクエリ → AST（未知の演算子は raw ノード）
      serialize-x.ts      AST → Xクエリ
      serialize-yahoo.ts  AST → Yahooクエリ + 警告の配列
      merge.ts            条件ボタン（共通）と個別設定の合成、項目ごとの無効化
      dates.ts            相対日付の解決、until の翌日変換（UTC）
      warnings.ts         警告の型と文言
    url/
      build.ts            AST → X/Yahoo の URL
      parse.ts            URL → AST（x.com / twitter.com / Yahoo）
      list-id.ts          リストの URL／数字から ID を取り出す
    chips/
      auto-add.ts         履歴から条件ボタンへの自動追加（重複判定、上限）
    trash/                削除済みの追加・復元・上限超過時の完全削除
    limits.ts             上限値の定数（条件ボタン30、削除済み20、履歴100、表示行数2、URL警告500文字）
    launch/codec.ts       エゴサグループ ⇄ `/launch#v1.<base64url>`
    storage/              ストアの定義、バージョン、移行処理
  data/
    default-lists.json    既定リスト（名前とリストID）
    schema.ts             zod スキーマ
```

## 3. 中核のデータ構造
```ts
// ast.ts
type Node =
  | { kind: 'term'; id: string; mode: 'exact' | 'plain'; value: string; enabled: boolean }
  | { kind: 'variants'; id: string; values: string[]; enabled: boolean }   // 表記ゆれ展開（手動入力）
  | { kind: 'account'; id: string; op: 'from' | 'to' | 'mention' | 'list'; value: string; enabled: boolean }
  | { kind: 'filter'; id: string; name: string; value?: string; enabled: boolean }
  | { kind: 'group'; id: string; join: 'AND' | 'OR'; children: Node[]; enabled: boolean }
  | { kind: 'raw'; id: string; text: string; enabled: boolean };          // 未知の演算子
// 除外は各ノードの negate: boolean で表す

// 条件ボタン（requirements F6）
type Chip = { id: string; label: string; conds: Node[]; on: boolean; isNew?: boolean; isDefault?: boolean };

// 検索（ホームの状態＝お気に入りの中身）
type SearchSpec = {
  word: string; exact: boolean;
  chipIds: string[];                    // 参照。ONの条件ボタン
  detail: GroupNode;                    // 詳細設定（個別）
  disabledCondIds: string[];            // 共通の項目ごとの無効化
  period: PeriodSpec; engine: 'x' | 'yahoo' | 'both';
};
type Favorite = { id: string; name: string; spec: SearchSpec; lastRunAt?: string };
type Group = { id: string; name: string; favoriteIds: string[] };
type HistoryItem = { id: string; at: string; spec: SearchSpec; query: string; source: string; note?: string };
type TrashItem = { tid: string; at: string; kind: 'chip' | 'favorite' | 'group'; data: Chip | Favorite | Group; index: number };
```
- 共通（ONの条件ボタン）は `merge.ts` で「共通（無効化したIDを除く）AND 個別」に合成する。お気に入りは条件ボタンを**ID参照**で持つ。参照先が削除済みなら合成から外し、警告を返す（黙って内容を変えない）。
- `serialize-*` は純粋関数で、`{ text, warnings }` を返す。警告は画面のどこに出すかを知らない。表示はUI側（クエリ表示の警告アイコン・プレビュー・カードのアイコン）で行い、モーダルは使わない。
- 削除済みは `index` を持ち、復元時に元の位置へ戻す。合計が上限を超えたら古い順に捨てる（`lib/trash`）。

## 4. 実験的な項目の扱い
- `operators.ts` の各定義に `status: 'stable' | 'experimental'` を持たせる。
  - experimental：現時点では無し。`list:` と `to:` の併用、`since_time:`／`until_time:`、Yahooの `lts`／`uts` は実機で確認して stable にした（`docs/research-phase0.md` 6章）。今後の仕様変更に備えて仕組みは残す。
  - 公式の記載が無く実機だけを根拠にした定義には、根拠と代替手段をコメントで残す（`docs/requirements.md` 7章のリスク）。
- experimental の要素を含む検索は、プレビューとカードに「実験的」バッジを付ける（非モーダル）。
- 実機確認の結果は、`operators.ts` の status とURL長の警告水準の定数を変えるだけで反映できるようにする。
- URL長の警告水準は「Xのクエリ 500文字」とし、`lib/limits.ts` の定数として1か所に置く。実際の上限は特定していないため、あとから値を変えられるようにする。

## 5. マイルストーン
GitHub のマイルストーン名（M0〜M7）はそのまま使う。内容は新仕様に合わせて読み替える。

| # | 内容 | 完了条件 |
|---|---|---|
| M0 | 雛形：`create-next-app`、shadcn/ui、Vitest、ESLint、`git init` | tsc / test / lint / build が通る |
| M1 | クエリの中核（ast, tokenizer, parse-x, serialize-x/yahoo, merge, dates）をテスト先行で作る | 往復テスト、Yahoo変換表、until の翌日変換、条件ボタンと個別設定の合成（無効化、削除済み参照）のテストが通る |
| M2 | URLの生成と解析、リストID の取り出し、ランチャーの codec | X/YahooのURLの往復、壊れたハッシュの検出、`x.com/i/lists/<ID>?s=20` から ID を取り出すテスト |
| M3 | 既定リスト（zodスキーマ、`default-lists.json`）、条件ボタンの既定登録 | 不正JSONでビルドが失敗する。ホロライブ・にじさんじの既定ボタンが初回に入る |
| M4 | 永続化ストア（バージョン付き。条件ボタン・お気に入り・グループ・履歴・削除済み・設定）と S8 設定 | 再読み込み後もデータが残る。移行処理のテスト。削除済み20件・ボタン30件・履歴100件の上限のテスト |
| M5 | S1 ホームの検索の組み立て（条件ボタン、折りたたみ、並べ替え、詳細設定、高度な編集、プレビュー、警告）、M1 条件ボタンの編集、S7 URL取り込み | 画面仕様書 3章・S2・S7 の操作が一通りできる |
| M6 | エゴサグループ、お気に入り、履歴（自動追加）、削除済み、M2 発行、S9 ランチャー、コマンドパレット | ブックマークURLから全タブを開ける。ブロック時にリンク一覧が出る。削除→復元→上限超過が動く |
| M7 | スマホ・PC表示（左メニュー70%、タイル配置）、キーボード操作、Vercelデプロイ | 360px幅と1280px幅で操作できる。本番URLで動く |

- 既定リストのJSONには、確認済みのリストID（ホロライブ・にじさんじ）だけを入れる。ほかのリストIDやハンドルは推測で埋めず、開発者が確認して追加する。

## 6. 検証（各マイルストーン共通）
1. `npx tsc --noEmit`
2. `npm test`
3. `npm run lint`
4. `npm run build`
5. M5以降は `npm run dev` で画面を開き、画面仕様書の該当章の操作を確認する（Chromeでの確認を含む。360px と 1280px）

## 7. リスク
- `list:`+`to:` が使えなかった場合、リストを使うボタンの併用は `(from:a OR from:b ...) to:<ハンドル>` に切り替える。ただしリストのメンバーが多いとクエリ長の上限に当たりやすく、メンバーを個別に持たない方針とも合わないため、その場合は「リスト単体の検索のみ」に縮退する案を用意しておく。
- `CompressionStream` は非同期で比較的新しいAPI。対応していないブラウザでは非圧縮のbase64urlに切り替える。
- 条件ボタンの参照方式では、ボタンを直す・削除すると、それを使うお気に入りの内容が変わる。削除済みの参照は警告し、復元の導線を出す（`docs/requirements.md` 7章）。
