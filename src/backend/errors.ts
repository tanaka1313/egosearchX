/** 下位（DAO・移行・zod）のエラーを、契約の `ApiError` に直す（docs/api-spec.md 2.2）。 */
import { ZodError } from "zod";
import { ApiError, LIMITS } from "@/api";
import { LimitError, StorageCorruptError } from "@/lib/storage/kv-dao";
import { META_KEY } from "@/lib/storage/migrate";

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof LimitError)
    return new ApiError(
      "LIMIT",
      { kind: "chips", limit: LIMITS.chips },
      { cause: e },
    );
  if (e instanceof StorageCorruptError)
    return new ApiError("CORRUPT", { key: e.key }, { cause: e });
  if (e instanceof ZodError)
    return new ApiError(
      "INVALID",
      { field: e.issues[0]?.path.join(".") ?? "" },
      { cause: e },
    );
  throw e;
}

/** 移行（meta の読み書き）の失敗。meta が壊れている・今より新しい版で保存されている、のどちらも `CORRUPT` */
export const migrationError = (e: unknown): ApiError =>
  new ApiError("CORRUPT", { key: META_KEY }, { cause: e });

/** async の関数の失敗を `ApiError` にして throw し直す */
export function guarded<A extends unknown[], R>(
  f: (...a: A) => Promise<R>,
): (...a: A) => Promise<R> {
  return async (...a) => {
    try {
      return await f(...a);
    } catch (e) {
      throw toApiError(e);
    }
  };
}
