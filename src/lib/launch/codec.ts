/**
 * ランチャーの codec（docs/requirements.md F8、docs/api-spec.md 4.4 `launcher`・5章）。
 * いつものエゴサ（名前＋項目）⇄ `/launch#` の後ろに置く文字列（ハッシュ）。
 *
 * - 形式：`v1.<base64url(deflate-raw(JSON))>`。`CompressionStream` が無いときは `v1u.<base64url(JSON)>`。
 *   読むときは接頭辞で見分ける。`#`・オリジン・パスは含めない（付けるのはフロントエンド）。
 * - 相対期間は記号のまま入れ、復号しても展開しない（開く時点で `url.plan` が展開する）。
 * - 長さの警告は持たない。効く制限は X のクエリの長さで、各クエリが `query.tooLong` で判定する。
 */
import { ApiError, LauncherPayloadSchema, type LauncherPayload } from "@/api";

/** 形式の版。変えるときは、古い版の読み方を残すか LAUNCHER_VERSION にする */
const VERSION = 1;
const FORMAT = "deflate-raw";

const prefix = (compressed: boolean) => `v${VERSION}${compressed ? "" : "u"}.`;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new Error("base64url ではない");
  const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const out = new Response(
    new Blob([bytes as BlobPart]).stream().pipeThrough(stream),
  );
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeLauncher(
  payload: LauncherPayload,
): Promise<string> {
  const valid = LauncherPayloadSchema.parse(payload);
  const json = new TextEncoder().encode(JSON.stringify(valid));
  if (typeof CompressionStream === "undefined") {
    return prefix(false) + toBase64Url(json);
  }
  return (
    prefix(true) + toBase64Url(await pipe(json, new CompressionStream(FORMAT)))
  );
}

export async function decodeLauncher(hash: string): Promise<LauncherPayload> {
  const m = /^v(\d+)(u?)\.(.+)$/.exec(hash);
  if (!m) throw new ApiError("LAUNCHER_BROKEN");
  if (Number(m[1]) !== VERSION) {
    throw new ApiError("LAUNCHER_VERSION", { version: m[1] });
  }
  try {
    let bytes = fromBase64Url(m[3]);
    if (m[2] === "") {
      if (typeof DecompressionStream === "undefined") {
        throw new Error("DecompressionStream が無い");
      }
      bytes = await pipe(bytes, new DecompressionStream(FORMAT));
    }
    const json: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return LauncherPayloadSchema.parse(json);
  } catch (cause) {
    throw new ApiError("LAUNCHER_BROKEN", undefined, { cause });
  }
}
