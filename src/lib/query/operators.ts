/**
 * 演算子の定義を1か所に集める（エンジン別の対応と status）。
 * 仕様変更や実機検証の結果は、ここを変えるだけで反映する（docs/implementation-plan.md 4章）。
 *
 * - キーは契約の `PARAM_OP_TYPES`・`FILTER_KEYS`（@/api）から導く（`satisfies Record<…>` で網羅を保証）。
 * - 警告コードは `src/api/issues.ts` の `IssueCode`。文言は辞書が出す。
 * - 相対期間の記号は `model.ts` の `REL_PERIODS`、URL 長の警告水準は `LIMITS.urlWarn`（limits.ts）。ここでは持たない。
 *
 * 公式の記載が無く、実機（2026-11-15〜18、開発者）だけを根拠にした定義には、根拠と代替手段をコメントに残す
 * （docs/research-phase0.md 6章、docs/requirements.md 7章）。
 */
import {
  FILTER_KEYS,
  PARAM_OP_TYPES,
  type FilterKey,
  type IssueCode,
  type ParamOp,
} from "@/api";
import type { AccountOp, ParseOnlyOp } from "./ast";

export type Status = "stable" | "experimental";

/** Yahoo!リアルタイム検索へ変換するときの扱い */
export type YahooRule =
  /** 接頭辞を置き換えて出す（from: → ID:、to: → @） */
  | { kind: "rename"; prefix: string }
  /** 同じ書式のまま出す。意味が変わりうるので警告する */
  | { kind: "keep"; code: IssueCode }
  /** 除いて警告する（黙って削除しない） */
  | { kind: "drop"; code: IssueCode }
  /** クエリには入れず、URL パラメータにする（lts／uts） */
  | { kind: "param"; param: "lts" | "uts" }
  /** 変換なしでそのまま出す（公式に記載のある構文） */
  | { kind: "same" };

export type OpDef = {
  /** X の書式（接頭辞。例：`from:`） */
  x: string;
  status: Status;
  /** false は解析・保持だけで、クエリの生成には使わない */
  generate: boolean;
  yahoo: YahooRule;
};

/** 値付きの演算子（min_*／since／until） */
export const PARAM_OPS = {
  // min_*：Yahoo では3つとも 0 件になった（語として扱われる。実機 E8、2026-11-18）。除いて警告する。
  min_faves: {
    x: "min_faves:",
    valueType: "number",
    status: "stable",
    generate: true,
    yahoo: { kind: "drop", code: "yahoo.minCountUnsupported" },
  },
  min_retweets: {
    x: "min_retweets:",
    valueType: "number",
    status: "stable",
    generate: true,
    yahoo: { kind: "drop", code: "yahoo.minCountUnsupported" },
  },
  min_replies: {
    x: "min_replies:",
    valueType: "number",
    status: "stable",
    generate: true,
    yahoo: { kind: "drop", code: "yahoo.minCountUnsupported" },
  },
  // since:／until:（E7、2026-11-16）：実機で、日本時間で評価され until: は指定日を含むと確認した。公式の記載は無い。
  //   画面の終了日はそのまま `until:` に出す（翌日へ変換しない）。代替手段：無し（変わったら出力の規則を直す）。
  // Yahoo の lts／uts（E4-B、2026-11-15）：クエリではなく URL パラメータ（UNIX 秒）。公式の記載は無く、実機のみ。
  //   lts＝開始日の0時、uts＝終了日の翌日0時（ブラウザの現地時刻）。代替手段が無いため実機を優先した。
  //   無効になったら「Yahoo!リアルタイム検索では期間指定が使えません」の警告に戻す。
  since: {
    x: "since:",
    valueType: "date",
    status: "stable",
    generate: true,
    yahoo: { kind: "param", param: "lts" },
  },
  until: {
    x: "until:",
    valueType: "date",
    status: "stable",
    generate: true,
    yahoo: { kind: "param", param: "uts" },
  },
} as const satisfies Record<
  ParamOp,
  OpDef & { valueType: (typeof PARAM_OP_TYPES)[ParamOp] }
>;

/** `filter:<key>`。Yahoo では使えない（警告して除く） */
export const FILTER_OPS = Object.fromEntries(
  FILTER_KEYS.map((key) => [
    key,
    {
      x: `filter:${key}`,
      status: "stable",
      generate: true,
      yahoo: { kind: "drop", code: "yahoo.filterUnsupported" },
    } satisfies OpDef,
  ]),
) as Record<FilterKey, OpDef>;

/** `lang:`。Yahoo では効かなかった（実機 E8、2026-11-18）。除いて警告する */
export const LANG_OP = {
  x: "lang:",
  status: "stable",
  generate: true,
  yahoo: { kind: "drop", code: "yahoo.langUnsupported" },
} as const satisfies OpDef;

export type AccountDef = OpDef & {
  /** 否定（`-from:` など）できるか */
  negatable: boolean;
  /** 否定したときの Yahoo の扱い */
  yahooNegated: YahooRule;
};

const YAHOO_ACCOUNT_EXCLUDE: YahooRule = {
  kind: "drop",
  code: "yahoo.accountExcludeUnsupported",
};

/**
 * アカウント条件。
 * - `-from:`／`-to:`／`-@`（E6、2026-11-18）：X の実機で除外されると確認した。公式の記載は無く、予告なく効かなくなる可能性がある。
 *   Yahoo では除外が効かないため警告し、ミュート機能を案内する。
 * - `-list:` は X で検索がエラーになる（E6）ので定義しない（negatable: false）。貼り付けた文字列に含まれていれば raw で保持する。
 *   代替手段（`-from:` をメンバー分並べる、`-filter:follows`）は、メンバーを管理しない方針と文字数のため採用しない。
 * - `list:` と `to:` の併用（E1、2026-11-15）：実機で動作を確認した。公式の記載は無い。
 *   動かなくなったら `(from:A OR from:B) to:<ハンドル>` に切り替える（クエリ長に注意）。
 * - Yahoo の `ID:`／`@` は公式のサポートページ（H000011629）に記載がある。
 * - mention（`@x`）：Yahoo では宛先（`to:`）として扱われるので、`@` のまま出して警告する（ユーザー決定 2026-11-18）。
 */
export const ACCOUNT_OPS = {
  from: {
    x: "from:",
    status: "stable",
    generate: true,
    negatable: true,
    yahoo: { kind: "rename", prefix: "ID:" },
    yahooNegated: YAHOO_ACCOUNT_EXCLUDE,
  },
  to: {
    x: "to:",
    status: "stable",
    generate: true,
    negatable: true,
    yahoo: { kind: "rename", prefix: "@" },
    yahooNegated: YAHOO_ACCOUNT_EXCLUDE,
  },
  mention: {
    x: "@",
    status: "stable",
    generate: true,
    negatable: true,
    yahoo: { kind: "keep", code: "yahoo.mentionAsReply" },
    yahooNegated: YAHOO_ACCOUNT_EXCLUDE,
  },
  list: {
    x: "list:",
    status: "stable",
    generate: true,
    negatable: false,
    yahoo: { kind: "drop", code: "yahoo.listUnsupported" },
    yahooNegated: YAHOO_ACCOUNT_EXCLUDE,
  },
} as const satisfies Record<AccountOp, AccountDef>;

/**
 * 解析・保持だけで、生成には使わない演算子（E2、2026-11-15）。
 * `since_time:`／`until_time:`（UNIX 秒）は実機で動いたが、人が読めないため期間は日付の `since:`／`until:` で出力する。
 * 公式の記載は無い。貼り付けた URL に含まれていれば保持し、Yahoo では秒をそのまま `lts`／`uts` に入れる（警告なし）。
 */
export const PARSE_ONLY_OPS = {
  since_time: {
    x: "since_time:",
    status: "stable",
    generate: false,
    yahoo: { kind: "param", param: "lts" },
  },
  until_time: {
    x: "until_time:",
    status: "stable",
    generate: false,
    yahoo: { kind: "param", param: "uts" },
  },
} as const satisfies Record<ParseOnlyOp, OpDef>;

/** Yahoo の期間の URL パラメータ名（開始・終了） */
export const YAHOO_PERIOD_PARAMS = { from: "lts", to: "uts" } as const;

/** Yahoo の OR は `(A B)`（公式の記載あり）。`A OR B` も動くが出力には使わない（E4-A5） */
export const YAHOO_OR = { open: "(", close: ")", separator: " " } as const;

/** 全定義を一覧にする（テスト・警告の網羅確認用） */
export function allOperatorDefs(): (OpDef & { id: string })[] {
  const toList = (o: Record<string, OpDef>) =>
    Object.entries(o).map(([id, d]) => ({ ...d, id }));
  return [
    ...toList(PARAM_OPS),
    ...toList(FILTER_OPS),
    ...toList(ACCOUNT_OPS),
    ...toList(PARSE_ONLY_OPS),
    { ...LANG_OP, id: "lang" },
  ];
}

/** 定義が参照する Yahoo 用の警告コード（重複なし） */
export function yahooIssueCodes(): IssueCode[] {
  const codes = new Set<IssueCode>();
  const add = (r: YahooRule) => {
    if (r.kind === "keep" || r.kind === "drop") codes.add(r.code);
  };
  for (const d of allOperatorDefs()) add(d.yahoo);
  for (const d of Object.values(ACCOUNT_OPS)) add(d.yahooNegated);
  return [...codes];
}
