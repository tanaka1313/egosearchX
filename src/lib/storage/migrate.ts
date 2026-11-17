/**
 * 保存データのバージョン管理と移行。バージョンは `egosearch:meta` に持つ。
 * スキーマを変えるときは、SCHEMA_VERSION を上げ、MIGRATIONS に「to: 新しい番号」の処理を1件足す。
 */
import type { KeyValueAdapter } from "./kv-adapter";
import { SCHEMA_VERSION } from "./schema";

export const META_KEY = "egosearch:meta";

export type Migration = {
  /** この処理を終えたあとのバージョン */
  to: number;
  run: (kv: KeyValueAdapter) => Promise<void>;
};

/** 本番の移行処理。v1 が最初の形なので、まだ無い */
export const MIGRATIONS: Migration[] = [];

async function readVersion(kv: KeyValueAdapter): Promise<number | null> {
  const raw = await kv.get(META_KEY);
  if (raw === null) return null;
  const v = (JSON.parse(raw) as { version?: unknown }).version;
  if (typeof v !== "number") throw new Error(`${META_KEY} が壊れています`);
  return v;
}

/**
 * 保存データを target まで移行する。データが無いとき（初回）は target として記録するだけ。
 * 新しいバージョンのアプリで保存されたデータは、壊さないよう開かない。
 */
export async function migrate(
  kv: KeyValueAdapter,
  migrations: Migration[] = MIGRATIONS,
  target: number = SCHEMA_VERSION,
): Promise<void> {
  const current = await readVersion(kv);
  if (current === null) {
    await kv.set(META_KEY, JSON.stringify({ version: target }));
    return;
  }
  if (current > target)
    throw new Error(
      `保存データが新しいバージョン（${current}）で作られています。アプリを更新してください`,
    );
  for (const m of [...migrations].sort((a, b) => a.to - b.to)) {
    if (m.to <= current || m.to > target) continue;
    await m.run(kv);
    await kv.set(META_KEY, JSON.stringify({ version: m.to }));
  }
}
