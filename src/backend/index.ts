/**
 * バックエンドの束ね（docs/api-spec.md 1.2）。契約 `EgoSearchApi` を実装し、lib/* と data/ をつなぐ。
 * 画面が import してよいのは `@/api` だけで、ここを import するのは組み立ての1か所（`app/providers.tsx`）だけ。
 */
import { LIMITS, type AppClock, type Clock, type EgoSearchApi } from "@/api";
import { interests, wordSet } from "@/data";
import { decodeLauncher, encodeLauncher } from "@/lib/launch/codec";
import { localDate } from "@/lib/query/dates";
import {
  LocalStorageAdapter,
  MemoryAdapter,
  type KeyValueAdapter,
} from "@/lib/storage/kv-adapter";
import { planRun } from "@/lib/url/build";
import { parseListId } from "@/lib/url/list-id";
import { parseUrl } from "@/lib/url/parse";
import { createDataApi } from "./data";
import { createQueryApi } from "./query";

/** 端末の現在時刻。日付は現地の日付（`toISOString` は UTC なので使わない） */
export const systemClock: Clock = {
  today: () => localDate(new Date()),
  now: () => new Date().toISOString(),
};

export type BackendOptions = {
  kv: KeyValueAdapter;
  clock: Clock;
  /** ID の作り方（新規は UUID）。テストで差し替える */
  newId?: () => string;
};

export function createBackend({
  kv,
  clock,
  newId = () => crypto.randomUUID(),
}: BackendOptions): EgoSearchApi {
  return {
    master: { interests: () => interests(), wordSet: (id) => wordSet(id) },
    query: createQueryApi(clock),
    url: {
      plan: (items) => planRun(items, clock.today()),
      parse: parseUrl,
      listId: parseListId,
    },
    launcher: { encode: encodeLauncher, decode: decodeLauncher },
    data: createDataApi({ kv, clock, newId }),
    clock: {
      ...clock,
      isToday: (at) => at !== null && localDate(new Date(at)) === clock.today(),
    } satisfies AppClock,
    limits: LIMITS,
  };
}

/**
 * ブラウザ用（localStorage ＋ 端末の時計）。静的書き出しの事前描画（`window` が無い）では、
 * 何も保存しない入れ物にする（描画のときに localStorage を触らないため）。
 */
export function createBrowserBackend(): EgoSearchApi {
  const kv =
    typeof window === "undefined"
      ? new MemoryAdapter()
      : new LocalStorageAdapter(window.localStorage);
  return createBackend({ kv, clock: systemClock });
}
