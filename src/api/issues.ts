/**
 * 警告・エラーのコード（docs/api-spec.md 2.2〜2.4）。文言は返さず、コードと値で返す（辞書が文言を出す）。
 */

/** 警告・止める理由・失敗のコード全件（辞書に文言があるかの網羅テストに使う） */
export const ISSUE_CODES = [
  // 警告
  "period.overridesDateChip",
  "yahoo.listUnsupported",
  "yahoo.filterUnsupported",
  "yahoo.accountExcludeUnsupported",
  "yahoo.rawUnverified",
  "yahoo.groupUnverified",
  "yahoo.mentionAsReply",
  "yahoo.langUnsupported",
  "yahoo.minCountUnsupported",
  "query.tooLong",
  "launcher.tooLong",
  // 止める理由
  "query.empty",
  "period.inverted",
  // 失敗
  "url.unreadable",
  "url.unsupportedHost",
  "url.noQuery",
  "list.invalid",
  "chip.labelRequired",
  "chip.labelTooLong",
  "chip.empty",
  "chip.badNumber",
  "chip.badDate",
] as const;
export type IssueCode = (typeof ISSUE_CODES)[number];

export type IssueParams = Record<string, string | number>;
export type Issue = { code: IssueCode; params?: IssueParams };
export type Result<T> = { ok: true; value: T } | { ok: false; error: Issue };

export type ApiErrorCode =
  | "LIMIT" // 上限（params: kind, limit）
  | "CORRUPT" // 保存データが壊れている（params: key）。上書きしない
  | "NOT_FOUND" // 指定の ID が無い
  | "INVALID" // 検証に失敗（params: field）
  | "LAUNCHER_BROKEN" // ランチャーのデータが読めない
  | "LAUNCHER_VERSION"; // 知らないバージョン

/** async の関数が失敗したときに throw する。下位のエラー（LimitError など）は cause に包む */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly params?: IssueParams,
    options?: { cause?: unknown },
  ) {
    super(code, options);
    this.name = "ApiError";
  }
}
