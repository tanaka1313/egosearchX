# 実装計画（技術設計）

関連文書：`docs/requirements.md`（F1〜F12）、`docs/screen-spec.md`（S1〜S10、D1〜D4）、`docs/research-phase0.md`。画面イメージは `/mock`（破棄予定のモック）。

## 1. 技術スタック
| 用途 | 採用 | 理由 |
|---|---|---|
| フレームワーク | Next.js（App Router。現在 16.4.6）+ React 19（現在 19.3.1）+ TypeScript（strict） | 要件定義書の指定。版は `package.json` が正 |
| 配信 | `output: 'export'`（静的書き出し）で Vercel に配置 | サーバー処理が不要 |
| UI | Tailwind CSS 4 + shadcn/ui（Sheet、Dialog、Tooltip、Collapsible 等） | 指定。左メニューとシートは shadcn の Sheet を基にする |
| 状態管理 | zustand（persist ミドルウェアは使わない） | 軽量。保存は DAO（`lib/storage`）を通す。保存先を差し替えられるようにするため（要件定義書 12章） |
| 保存 | DAO（`lib/storage`。async のリポジトリ＋KeyValue アダプタ。MVP は localStorage） | 作成済み。バージョンと移行処理、論理削除、上限を持つ |
| スキーマ検証 | zod 4 | マスタ JSON（興味の対象・プリセット・サジェスト規則）・保存データ・ランチャーURLの検証 |
| 並べ替え | `@dnd-kit/react`（`useSortable`、`@dnd-kit/helpers` の `move`） | 条件ボタン・お気に入り・条件の並べ替え。タッチとキーボードに対応（mock で導入済み） |
| URL圧縮 | ブラウザ標準の `CompressionStream('deflate-raw')` + base64url | 依存を増やさない |
| テスト | Vitest（ロジック）+ Testing Library（主要コンポーネント） | |
| パッケージ管理 | npm | CLAUDE.md のコマンドに合わせる |

## 2. ディレクトリ構成
```
src/
  app/
    providers.tsx         組み立て（createBackend を呼ぶ唯一の場所。docs/api-spec.md 1.2）
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
    chips/                ChipEditor(D1), SortableChip
    favorites/            FavoriteRow, GroupButton, GroupEditor
    dialogs/              PublishGroup(D2), Confirm(D3)
  lib/
    query/
      ast.ts              検索条件モデル（木構造）の型
      operators.ts        演算子定義を1か所に集約（エンジン別の対応、experimental フラグ）
      tokenizer.ts        文字列 → トークン（括弧・OR・否定を区別する字句解析 `lex`。model.ts の `tokenize` とは別）
      parse-x.ts          Xクエリ → AST（未知の演算子は raw ノード。括弧なしの OR は先に結ぶ。E9）
      serialize-x.ts      AST → Xクエリ
      serialize-yahoo.ts  AST → Yahooクエリ + 警告の配列 + 期間（`lts`／`uts`、UNIX 秒）。括弧は OR なので AND は平らにする
      merge.ts            条件ボタン（共通）と個別設定の合成、項目ごとの無効化
      dates.ts            日付の計算（`localMidnightSec`：現地0時の UNIX 秒、`localDate`：開く時点の現地の日付＝相対期間の基準日。#85 の `clock.today()` が使う。作成済み）。相対期間の展開の本体は `model.ts` の `expandRelative`（until は終了日をそのまま出す。日本時間）
      （警告の型とコードは src/api/issues.ts に置く。ここには置かない。文言は辞書。docs/api-spec.md 2.3）
    url/
      build.ts            保存形 → RunPlan（X／Yahoo の URL と警告。`planRun(items, today)`。作成済み）
      parse.ts            URL → 保存形（x.com / twitter.com / Yahoo。`parseUrl(input)`。作成済み）
      list-id.ts          リストの URL／数字から ID を取り出す（`parseListId`。作成済み）
    query/model.ts        検索文字列の規則（分割・正規化・相対期間の記号・文字列⇄条件の行・お気に入りの展開・編集の連動）。モックから移した（#71）
    chips/
      suggest.ts          サジェスト検索条件（規則→履歴のトークンの順。重複除外、上限20）
      starters.ts         検索ワード集のうち、履歴0件のときホームに出す分（`starter` の印、条件ボタンにあるものを除く、上限60）。モックの `starterWords`
    （上限値の定数は `src/api/limits.ts`。作成済み。条件ボタン＝興味の対象ごとに30、削除済み20、履歴100、折りたたみ前の条件ボタン8個、履歴なしのときホームに出す検索ワード集60件、URL警告500文字）
    launch/codec.ts       いつものエゴサ ⇄ `/launch#v1.<base64url>`（相対期間は記号のまま入れる。圧縮なしは `v1u.`。作成済み。長さの警告は持たず、各クエリの `query.tooLong` で判定）
    storage/              DAO（作成済み。要件定義書 12章）
      schema.ts           保存データの zod スキーマと SCHEMA_VERSION
      types.ts            Dao とリポジトリのインターフェース（すべて async）
      kv-adapter.ts       KeyValueAdapter（LocalStorageAdapter／MemoryAdapter）
      kv-dao.ts           KeyValue の上の DAO（検証・上限・論理削除・削除済みの上限）
      migrate.ts          バージョンと移行処理
  api/                    契約（フロントとバックの境界。docs/api-spec.md）：型・zod スキーマ・LIMITS・EgoSearchApi・Issue のコード
  backend/                createBackend({ kv, clock })：契約を実装し、lib/* と data/ を束ねる
  store/                  zustand のストアと useApi()（契約だけを使う）
  data/
    interests.json        興味の対象（ID・表示名・既定リスト）。ID をキーにした Map で扱う
    presets.json          条件ボタンのプリセット。共通＋各対象の1本の並び（`interest` が `common` か対象 ID）。既定リストは目印の行の位置に入る（中身は Issue #70）
    suggest-rules.json    サジェストの規則（中身は Issue #70）
    word-set.json         検索ワード集（興味の対象ごと。チャンネル単位のグループ、グループ名は ja／en。約200件。中身は Issue #70、画面は Issue #89）
    schema.ts             マスタ JSON の zod スキーマと、ファイルをまたぐ検証（`MasterSchema`）
    index.ts              読み込み時に検証して返す（`interests`・`presetsFor`・`suggestRules`・`wordSet`）。`prebuild` で `src/data` のテストが走る
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
// 全ノードが id・enabled・negate（除外）を持つ。実際の型は src/lib/query/ast.ts（上は要点）

// 期間（画面の状態）：昨日から／3日前から／1週間前から／日付（以降・以前・範囲）。
// 保存する文字列では、相対指定は記号（since:yesterday／since:3days_ago／since:1week_ago）、日付は since:／until:（until は指定日を含む）
// 型は契約の `Period`（src/api/types.ts）を使う。ここでは別に定義しない。
```
- **保存データ（条件ボタン・お気に入り・いつものエゴサ・履歴・設定）の型は `src/api/entities.ts`（zod）が正。** 項目とつながりは要件定義書 11章。本体はすべて検索文字列（`query`）で、互いを ID で参照しない。
- AST は、検索文字列を解析・組み立て・変換（X／Yahoo）するときの**内部の表現**で、保存しない。条件ボタンの中身も保存は文字列で、編集・値の入力のときだけ AST（モックでは `Cond`）に分ける。
- ホームの状態（検索語、完全一致、「表示」かつ ON の条件ボタン、詳細条件、期間）は `merge.ts` で「共通（無効化した項目を除く）AND 個別」に合成して**検索文字列**にする。お気に入り・いつものエゴサには、合成した文字列（相対期間は記号のまま）を保存し、**条件ボタンを参照しない**（ボタンを直しても保存済みは変わらない）。
- 文字列の規則（分割・正規化・相対期間の展開・お気に入りの展開・編集の連動）は `lib/query/model.ts` の純粋関数にする（要件定義書 11.3・11.4。#71 でモックから移した）。
- `serialize-*` は純粋関数で、`{ text, warnings }` を返す。警告は画面のどこに出すかを知らない。表示はUI側（「条件」の枠の一番下の警告欄・プレビュー・カードのアイコン）で行い、モーダルは使わない。
- 削除済みは `deletedAt` による論理削除。`order` を残すので、復元すると元の位置に戻る。種類ごとに上限を超えたら古い順に完全削除する（`lib/storage/kv-dao.ts`）。

## 4. 実験的な項目の扱い
- `operators.ts` の各定義に `status: 'stable' | 'experimental'` を持たせる。
  - experimental：現時点では無し。`list:` と `to:` の併用、`since_time:`／`until_time:`、Yahooの `lts`／`uts`、Xのアカウント除外（`-from:`／`-to:`／`-@`）は実機で確認して stable にした（`docs/research-phase0.md` 6章）。`-list:` は X で検索がエラーになるため定義しない。今後の仕様変更に備えて仕組みは残す。
  - 公式の記載が無く実機だけを根拠にした定義には、根拠と代替手段をコメントで残す（`docs/requirements.md` 7章のリスク）。
- experimental の要素を含む検索は、プレビューとカードに「実験的」バッジを付ける（非モーダル）。
- 実機確認の結果は、`operators.ts` の status とURL長の警告水準の定数を変えるだけで反映できるようにする。
- URL長の警告水準は「Xのクエリ 500文字」とし、`src/api/limits.ts` の定数として1か所に置く。実際の上限は特定していないため、あとから値を変えられるようにする。

## 5. マイルストーン
GitHub のマイルストーン（M0〜M7）と対応する（名前：M3 マスタとプリセット／M4 永続化と i18n 基盤／M5 ホームと条件ボタン／M6 保存・一括実行・ランチャー）。Issue の割り当ては `tasks/todo.md` の先頭を参照。

| # | 内容 | 完了条件 |
|---|---|---|
| M0 | 雛形：`create-next-app`、shadcn/ui、Vitest、ESLint、`git init` | tsc / test / lint / build が通る |
| M1 | 契約の型（`src/api`：型・`IssueCode`・`LIMITS`・zod スキーマ。Issue #88。`docs/api-spec.md`）と、クエリの中核（ast, tokenizer, parse-x, serialize-x/yahoo, merge, dates）をテスト先行で作る | 往復テスト、Yahoo変換表、until が終了日をそのまま出すこと（Yahoo の uts は翌日0時）、条件ボタンと個別設定の合成（無効化）のテストが通る |
| M2 | URLの生成と解析、リストID の取り出し、ランチャーの codec | X/YahooのURLの往復、壊れたハッシュの検出、`x.com/i/lists/<ID>?s=20` から ID を取り出すテスト |
| M3 | マスタ JSON（`interests.json`・`presets.json`・`suggest-rules.json`・`word-set.json`）と zod スキーマ、興味の対象ごとのプリセットの登録 | 不正JSONでビルドが失敗する。初回に、興味の対象ごとのプリセットが条件ボタンとして入り、ヘッダーの切替で並びが切り替わる（既定はホロライブ）。プリセットの中身は Issue #70 |
| M4 | **i18n の基盤（辞書 ja／en、型は ja から、言語切替。画面より先に作る）**、バックエンドの束ね（`createBackend`、`data` のユースケース、import の制限）、ストア（zustand）と契約（`@/api`）の接続（DAO は作成済み）。条件ボタン（興味の対象ごと）・お気に入り・いつものエゴサ・履歴・削除済み・設定 | 再読み込み後もデータが残る。DAO のテスト（移行、壊れたデータ、削除済み＝種類ごとに20件、ボタン＝対象ごとに30件、履歴100件）は作成済み。お気に入りを削除してもいつものエゴサが変わらないこと、お気に入りを編集すると一致する項目が更新されることのテスト |
| M5 | S1 ホームの検索の組み立て（押すだけの条件ボタン、折りたたみ、詳細条件（テキストで追加を含む）、プレビュー、警告、［⋯］）、S2 条件ボタン（D1 シート、並べ替え、条件のコピー、表示）、S7 URL解析、ヘッダーの興味の対象の切替、検索ワード集（D4 と、履歴0件のときのホームの続き。Issue #89）、**SEO（要件定義書 9章）：言語辞書の ja／en の title・description、ホームだけに置く WebSite の JSON-LD（`name`／`alternateName`／`url`）** | 画面仕様書 4章・S2・S7・D4 の操作が一通りできる。`out/index.html` に title・description・JSON-LD が入っている |
| M6 | いつものエゴサ（ヘッダー下の帯に先頭2件。全ページ）、お気に入り、履歴（フッターに最後の1件）、サジェスト検索条件、削除済み、D2 発行、S9 ランチャー、コマンドパレット | ブックマークURLから全タブを開ける。ブロック時にリンク一覧が出る。削除→復元→上限超過が動く |
| M7 | スマホ・PC表示（左メニュー70%、1カラム）、全画面の文言の網羅と英語の確定、キーボード操作、モックの破棄、Vercelデプロイ | 360px幅と1280px幅で、日本語・英語の両方で操作できる。本番URLで動く |

- **i18n**：文言は言語ごとの辞書（置き場所は `src/messages/ja.ts`・`en.ts` を想定）から出し、画面のコードに直書きしない。ライブラリ（例：next-intl）を使うかは未決定。静的書き出しのため、言語はクライアント側で切り替える（初期値はブラウザの言語、切替はメニューの下部、保存先は localStorage。設定画面は置かない。要件定義書 F12）。**辞書の型は `ja` から導き、`en` に欠けがあればビルドで検出する。**

- **実装時の注意：検索の組み立ては「内部の状態と部品」を共通にする。UI の置き場所（シート・ページ）は共通にしない。** 検索語・完全一致・条件ボタン（サジェストを含む）・期間・詳細条件の組み立ては、ホームといつものエゴサの追加・編集ページ（S4-E の②）で、同じ部品（`ConditionFrame`・`ChipRow`・`DetailPanel`・`QueryPreview`・`PeriodPicker`）を使う。部品は状態をコンテキスト（`SearchScope`）から読み、ホームはストアの状態、S4-E はページの中だけの状態を渡す（ホームの ON/OFF・期間に影響しない）。画面ごとに違う操作（ホームの開くボタン群、S4-E の［お気に入りに保存して追加］）は `footer` などで差し込む。期間はホームと詳細条件が**同じ状態を共有する**。モックの実装は `src/app/mock/_parts/search-scope.tsx` と `condition-frame.tsx`。保存はお気に入りの保存処理に一本化し、保存する検索文字列は組み立てた結果から期間のトークンだけを除いて作る（`queryWithoutPeriod`）。
- **実装時の注意：お気に入りといつものエゴサは ID で参照しあわない。** いつものエゴサは `items`（検索文字列＋検索先）を持ち、お気に入りを参照しないので、削除に連動も確認も要らない。連動するのはお気に入りの編集だけで、編集前の文字列と正規化して一致する項目を更新する（要件定義書 11.4）。削除は削除済みへ移すだけ（［元に戻す］で戻す）。削除済みは種類ごとに20件で、超えたらその種類の古いものから完全削除する（`pushTrash`）。**一気に完全削除する経路を作らない。** 以前の案（`favIds` の参照、`batch`、`groupsUsing`、［まとめて復元］、2段確認）は廃案。
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
- `CompressionStream` は非同期で比較的新しいAPI。対応していないブラウザでは非圧縮のbase64urlに切り替える（接頭辞で見分ける：圧縮あり `v1.`、なし `v1u.`。`docs/api-spec.md` 5章）。
- お気に入り・いつものエゴサは検索文字列を本体として持つため、条件ボタンを直しても保存済みの検索には反映されない（`docs/requirements.md` 7章）。反面、参照切れ・連動削除は起きない。お気に入りといつものエゴサの対応は文字列の一致で決まるので、書き方の違う同じ意味の文字列はつながらない（同 7章）。
