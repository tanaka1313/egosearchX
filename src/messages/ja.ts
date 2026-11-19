import { LIMITS, type IssueCode, type IssueParams } from "@/api";
import { ENGINE_LABEL } from "./engine";

const Y = ENGINE_LABEL.yahoo;
const str = (v: IssueParams[string] | undefined) => String(v ?? "");

/**
 * 日本語の辞書。`Messages` 型はこれから導く（en に欠けや余計なキーがあると型エラー→ビルド失敗）。
 * 警告・エラーはコードごとの関数にして、値（params）を埋め込む。数字は params か定数から出す。
 */
const issues: Record<IssueCode, (p: IssueParams) => string> = {
  "period.overridesDateChip": (p) =>
    `期間を指定中のため、日付ボタン「${str(p.label)}」は使われません（期間を優先）`,
  "yahoo.listUnsupported": () =>
    `list: は${Y}では使えません（${Y}では除外されます）`,
  "yahoo.filterUnsupported": () =>
    `filter: は${Y}では使えません（${Y}では除外されます）`,
  "yahoo.accountExcludeUnsupported": (p) =>
    `${str(p.op)} は${Y}では使えません。${Y}のミュート機能を使ってください`,
  "yahoo.mentionAsReply": () =>
    `@ のメンションは、${Y}では宛先として扱われます`,
  "yahoo.langUnsupported": () =>
    `lang: は${Y}では使えません（${Y}では除外されます）`,
  "yahoo.minCountUnsupported": (p) =>
    `${str(p.op)}: は${Y}では使えません（${Y}では除外されます）`,
  "yahoo.rawUnverified": (p) =>
    `「${str(p.token)}」が${Y}で使えるかは未確認です（そのまま URL に入れます）`,
  "yahoo.groupUnverified": () =>
    `${Y}では括弧の組み合わせを書き表せないため、X の形のまま出します（結果が変わる場合があります）`,
  "query.tooLong": (p) =>
    `クエリが${str(p.limit)}文字を超えています（${str(p.length)}文字。上限は未確認）`,
  "query.empty": () => "検索語か条件を入力してください",
  "period.inverted": () => "期間の開始日が終了日より後になっています",
  "url.unreadable": () => "URL として読み取れません",
  "url.unsupportedHost": () => `X または ${Y}の URL ではありません`,
  "url.noQuery": () => "検索語（q / p）が含まれていません",
  "list.invalid": () =>
    "リストの URL（https://x.com/i/lists/…）または数字の ID を入力してください",
  "chip.labelTooLong": () => `ラベルは${LIMITS.chipLabel}文字までです`,
  "chip.empty": () => "条件を1つ以上入力してください",
  "chip.badNumber": (p) =>
    `${Number(p.index) + 1}行目：数値は1以上の整数で入力してください`,
  "chip.badDate": (p) =>
    `${Number(p.index) + 1}行目：日付は YYYY-MM-DD の形で入力してください`,
};

export const ja = {
  issues,
  footer: {
    unofficial: "ファンが作った非公式のツールです",
  },
  version: {
    open: "バージョン情報",
    title: "バージョン情報",
    description: "この画面のビルド情報です。不具合の報告時に伝えてください。",
    builtAt: "ビルド日時",
    commit: "コミット",
    unknown: "不明",
    close: "閉じる",
  },
  corrupt: {
    message: "保存データを読み込めず、復元できません。",
    reset: "データを初期化する",
  },
  confirm: {
    cancel: "キャンセル",
  },
  resetData: {
    title: "データを初期化しますか？",
    body: "保存データ（条件ボタン・お気に入り・いつものエゴサ・履歴・削除済み・設定）をすべて破棄します。元に戻せません。",
    action: "初期化する",
  },
  lang: {
    label: "言語",
    ja: "日本語",
    en: "English",
  },
};

/** 辞書の型。en はこれで注釈する */
export type Messages = typeof ja;
