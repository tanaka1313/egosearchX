# 実装計画（技術設計）

関連文書：`docs/requirements.md`（F1〜F12）、`docs/screen-spec.md`（S1〜S9、M1〜M3）、`docs/research-phase0.md`。画面イメージは `/mock`（破棄予定のモック）。
注意：マイルストーン M0〜M7 は GitHub のマイルストーン名で、画面仕様書のダイアログ M1〜M3 とは別物。

## 1. 技術スタック
| 用途 | 採用 | 理由 |
|---|---|---|
| フレームワーク | Next.js 15（App Router）+ React 19 + TypeScript（strict） | 要件定義書の指定 |
| 配信 | `output: 'export'`（静的書き出し）で Vercel に配置 | サーバー処理が不要 |
| UI | Tailwind CSS 4 + shadcn/ui（Sheet、Dialog、Tooltip、Collapsible 等） | 指定。左メニューとシートは shadcn の Sheet を基にする |
| 状態管理 | zustand（persist ミドルウェアで localStorage） | 軽量。バージョンと移行処理を持てる |
| スキーマ検証 | zod | 既定リストJSON・保存データ・ランチャーURLの検証 |
| 並べ替え | `@dnd-kit/react`（`useSortable`、`@dnd-kit/helpers` の `move`） | 条件ボタン・お気に入り・条件の並べ替え。タッチとキーボードに対応（mock で導入済み） |
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
    groups/page.tsx       S4 いつものエゴサ
    groups/edit/page.tsx  S4-E いつものエゴサの追加・編集（?id= で編集）
    history/page.tsx      S5 履歴
    trash/page.tsx        S6 削除済み
    import/page.tsx       S7 URL解析
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
      suggest.ts          サジェスト検索条件（履歴のトークンから候補を作る。重複除外、上限20）
    trash/                削除済みの追加・復元・上限超過時の完全削除
    limits.ts             上限値の定数（条件ボタン30、削除済み20、履歴100、折りたたみ前の条件ボタン8個、URL警告500文字）
    launch/codec.ts       いつものエゴサ ⇄ `/launch#v1.<base64url>`
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
type Chip = { id: string; label: string; conds: Node[]; on: boolean; visible: boolean; isNew?: boolean; isDefault?: boolean };
// 値付きの条件（min_faves などの数値、since:/until: の日付）は、ホームのボタンの入力欄で値を書き換える（値はボタンに保存）。
// 対応する演算子は operators.ts に「値の型（number／date）・接尾語」として定義する。期間（PeriodSpec）が有効なら、日付の条件は合成から外す（requirements F6）

// 期間：昨日から／3日前から／1週間前から／日付（以降・以前・範囲）。相対指定は文字列に入れず、実行時に解決する
type PeriodSpec = { kind: 'none' | 'd1' | 'd3' | 'd7' | 'date'; from?: string; to?: string };

// 保存した検索（お気に入り・いつものエゴサの1件）。条件ボタンを参照せず、検索文字列を実体として持つ
type SavedSearch = { label: string; query: string; period: PeriodSpec; engine: 'x' | 'yahoo' | 'both' };
type Favorite = { id: string; name: string; query: string; period: PeriodSpec; engine: 'x' | 'yahoo' | 'both'; lastRunAt?: string };
type Group = { id: string; name: string; items: SavedSearch[] };   // お気に入りからコピーして入れる
type HistoryItem = { id: string; at: string; query: string; source: string; note?: string };
type TrashItem = { tid: string; at: string; kind: 'chip' | 'favorite' | 'group'; data: Chip | Favorite | Group; index: number };
```
- ホームの状態（検索語、完全一致、「表示」かつ ON の条件ボタン、詳細条件、期間）は `merge.ts` で「共通（無効化した項目を除く）AND 個別」に合成して**検索文字列**にする。お気に入り・いつものエゴサは、保存時に合成した文字列（期間を除く）と期間を保持し、**条件ボタンを参照しない**（ボタンを直しても保存済みは変わらない）。
- `serialize-*` は純粋関数で、`{ text, warnings }` を返す。警告は画面のどこに出すかを知らない。表示はUI側（「条件」の枠の一番下の警告欄・［Yahoo で開く］の印・プレビュー・カードのアイコン）で行い、モーダルは使わない。
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
| M1 | クエリの中核（ast, tokenizer, parse-x, serialize-x/yahoo, merge, dates）をテスト先行で作る | 往復テスト、Yahoo変換表、until の翌日変換、条件ボタンと個別設定の合成（無効化）のテストが通る |
| M2 | URLの生成と解析、リストID の取り出し、ランチャーの codec | X/YahooのURLの往復、壊れたハッシュの検出、`x.com/i/lists/<ID>?s=20` から ID を取り出すテスト |
| M3 | 既定リスト（zodスキーマ、`default-lists.json`）、条件ボタンの既定登録 | 不正JSONでビルドが失敗する。ホロライブ・にじさんじの既定ボタンが初回に入り、ホームに出るのは興味の対象（既定はホロライブ。ヘッダーで切替）のものだけ |
| M4 | 永続化ストア（バージョン付き。条件ボタン・お気に入り・いつものエゴサ・履歴・削除済み・表示言語） | 再読み込み後もデータが残る。移行処理のテスト。削除済み（種類ごとに20件）・ボタン30件・履歴100件の上限のテスト、お気に入りといつものエゴサが独立していること（お気に入りを削除してもいつものエゴサが変わらない）のテスト |
| M5 | S1 ホームの検索の組み立て（押すだけの条件ボタン、折りたたみ、詳細条件、高度な編集、プレビュー、警告、［⋯］）、S2 条件ボタン（M1 シート、並べ替え、条件のコピー、表示）、S7 URL解析、ヘッダーの興味の対象の切替、**SEO（要件定義書 9章）：言語辞書の ja／en の title・description、ホームだけに置く WebSite の JSON-LD（`name`／`alternateName`／`url`）** | 画面仕様書 3章・S2・S7 の操作が一通りできる。`out/index.html` に title・description・JSON-LD が入っている |
| M6 | いつものエゴサ（ヘッダー下の帯に先頭2件。全ページ）、お気に入り、履歴（フッターに最後の1件）、サジェスト検索条件、削除済み、M2 発行、S9 ランチャー、コマンドパレット | ブックマークURLから全タブを開ける。ブロック時にリンク一覧が出る。削除→復元→上限超過が動く |
| M7 | スマホ・PC表示（左メニュー70%、1カラム）、**日本語・英語の両対応（i18n）**、キーボード操作、Vercelデプロイ | 360px幅と1280px幅で、日本語・英語の両方で操作できる。本番URLで動く |

- **i18n**：文言は言語ごとの辞書（置き場所は `src/messages/ja.ts`・`en.ts` を想定）から出し、画面のコードに直書きしない。ライブラリ（例：next-intl）を使うかは未決定。静的書き出しのため、言語はクライアント側で切り替える（初期値はブラウザの言語、切替はメニューの下部、保存先は localStorage。設定画面は置かない。要件定義書 F12）。**辞書の型は `ja` から導き、`en` に欠けがあればビルドで検出する。**

- **実装時の注意：検索の組み立ては「内部の状態と部品」を共通にする。UI の置き場所（シート・ページ）は共通にしない。** 検索語・完全一致・条件ボタン（サジェストを含む）・期間・詳細条件の組み立ては、ホームといつものエゴサの追加・編集ページ（S4-E の②）で、同じ部品（`ConditionFrame`・`ChipRow`・`DetailPanel`・`QueryPreview`・`PeriodPicker`）を使う。部品は状態をコンテキスト（`SearchScope`）から読み、ホームはストアの状態、S4-E はページの中だけの状態を渡す（ホームの ON/OFF・期間に影響しない）。画面ごとに違う操作（ホームの開くボタン群、S4-E の［お気に入りに保存して追加］）は `footer` などで差し込む。期間はホームと詳細条件が**同じ状態を共有する**。モックの実装は `src/app/mock/_parts/search-scope.tsx` と `condition-frame.tsx`。保存はお気に入りの保存処理に一本化し、保存する検索文字列は組み立てた結果から期間のトークンだけを除いて作る（`queryWithoutPeriod`）。
- **実装時の注意：お気に入りといつものエゴサは独立している。** いつものエゴサは `items`（検索のコピー）を持ち、お気に入りを参照しないので、削除に連動も確認も要らない。削除は削除済みへ移すだけ（［元に戻す］で戻す）。削除済みは種類ごとに20件で、超えたらその種類の古いものから完全削除する（`pushTrash`）。**一気に完全削除する経路を作らない。** 以前の案（`favIds` の参照、`batch`、`groupsUsing`、［まとめて復元］、2段確認）は廃案。
- **実装時の注意：機能タイトルは差し替え前提。** ヘッダーの機能タイトル（「X（Twitter）」）は定数にまとめる。YouTube／TikTok の同様のツールは今後の予定で、まだ作らない（Issue も作らない）。
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
- お気に入り・いつものエゴサは検索文字列を実体として持つため、条件ボタンを直しても保存済みの検索には反映されない（`docs/requirements.md` 7章）。反面、参照切れ・連動削除は起きない。
