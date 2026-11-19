/**
 * サイト名・別名・本番 URL（定数1か所。要件定義書 9.3）。
 * title・description の文言は辞書の `meta`。ここは JSON-LD と、title の末尾（`｜<サイト名>`）が使う。
 */
export const SITE_NAME = "Hololive EgoSearch";

/** `alternateName`。順序が優先順（要件定義書 9.3） */
export const SITE_ALTERNATE_NAMES: readonly string[] = [
  "ホロライブ エゴサ",
  "HoloEgoSearch",
];

/**
 * 本番サイトの URL。**未定**（決まり次第、開発者が記入する。推測で埋めない）。
 * 空のあいだは JSON-LD に `url` を出さない。
 */
export const SITE_URL = "";

export type WebsiteJsonLdInput = {
  name: string;
  alternateNames: readonly string[];
  /** 空なら `url` を出さない */
  url: string;
};

/**
 * ホームに置く WebSite の構造化データ（JSON 文字列）。
 * `<script>` の中に埋め込むので、`<` を `<` にして `</script>` で閉じられないようにする。
 */
export function websiteJsonLd(input: WebsiteJsonLdInput): string {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    alternateName: [...input.alternateNames],
  };
  if (input.url) data.url = input.url;
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
