/** 保存データが壊れている（JSON として読めない、またはスキーマに合わない） */
export class StorageCorruptError extends Error {
  constructor(
    readonly key: string,
    cause: unknown,
  ) {
    super(`保存データ（${key}）が壊れています`, { cause });
    this.name = "StorageCorruptError";
  }
}
