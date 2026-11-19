/**
 * 保存データのバージョン管理と移行。バージョンは `egosearch:meta` に持つ。
 * スキーマを変えるときは、SCHEMA_VERSION を上げ、MIGRATIONS に「to: 新しい番号」の処理を1件足す。
 * キーに版が入る（`egosearch:v<版>:<表>`）ので、変えた表だけでなく**すべての表**を新しい版のキーへ運ぶこと
 * （運ばない表は、新しい版では空として読まれる）。
 */
import { StorageCorruptError } from "./corrupt-error";
import type { KeyValueAdapter } from "./kv-adapter";
import { SCHEMA_VERSION } from "./schema";

export const META_KEY = "egosearch:meta";

export type Migration = {
  /** この処理を終えたあとのバージョン */
  to: number;
  run: (kv: KeyValueAdapter) => Promise<void>;
};

/** 版1の表の名前。キーは版ごとに `egosearch:v<版>:<表>`（移行は版の定数に依存させず直書きする） */
const TABLES = ["chips", "favorites", "groups", "history", "prefs"] as const;

/**
 * 版1 → 版2：いつものエゴサに `lastRunAt: null` を足す。
 * 版が上がるとキー名が変わるので、5つの表をすべて版2のキーへ運ぶ。groups 以外は文字列のまま（壊れていても
 * 同じバイトで運び、読むときに CORRUPT にする）。groups は今のスキーマに依存しない素の JSON として変換する。
 * 版1のキーは消さない（途中で止まっても再実行で同じ結果になる。消すのは data.reset＝#87）。
 */
async function toV2(kv: KeyValueAdapter): Promise<void> {
  const keyV1 = (t: string) => `egosearch:v1:${t}`;
  const keyV2 = (t: string) => `egosearch:v2:${t}`;
  const raw = new Map<string, string>();
  for (const t of TABLES) {
    const v = await kv.get(keyV1(t));
    if (v !== null) raw.set(t, v);
  }
  // 書く前に groups を検証する（壊れていたら何も書かない）
  const groups = raw.get("groups");
  if (groups !== undefined) {
    let rows: unknown;
    try {
      rows = JSON.parse(groups);
    } catch (e) {
      throw new StorageCorruptError(keyV1("groups"), e);
    }
    if (!Array.isArray(rows) || rows.some((r) => !isPlainObject(r)))
      throw new StorageCorruptError(
        keyV1("groups"),
        new Error("groups が配列ではありません"),
      );
    raw.set(
      "groups",
      JSON.stringify(
        rows.map((r) => ({
          ...(r as Record<string, unknown>),
          lastRunAt: null,
        })),
      ),
    );
  }
  for (const [t, v] of raw) await kv.set(keyV2(t), v);
}

const isPlainObject = (v: unknown): boolean =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** 本番の移行処理（版1が最初の形） */
export const MIGRATIONS: Migration[] = [{ to: 2, run: toV2 }];

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
