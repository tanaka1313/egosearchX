import type { Engine } from "@/api";
import { ENGINE_LABEL, ENGINE_SHORT } from "@/messages";

/**
 * 検索先バッジの表示名（画面仕様書 3.11）。`short` はバッジの文字（識別子だけ）、`full` は `title` と読み上げに使う正式名。
 * お気に入りの行（S3）といつものエゴサの項目（S4-E）で同じ関数を使う。
 */
export const engineBadge = (engine: Engine): { short: string; full: string } =>
  engine === "both"
    ? {
        short: `${ENGINE_SHORT.x}＋${ENGINE_SHORT.yahoo}`,
        full: `${ENGINE_LABEL.x}＋${ENGINE_LABEL.yahoo}`,
      }
    : { short: ENGINE_SHORT[engine], full: ENGINE_LABEL[engine] };
