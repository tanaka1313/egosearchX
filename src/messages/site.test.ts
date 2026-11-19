import { describe, expect, it } from "vitest";
import {
  SITE_ALTERNATE_NAMES,
  SITE_NAME,
  websiteJsonLd,
  type WebsiteJsonLdInput,
} from "./site";

const base: WebsiteJsonLdInput = {
  name: SITE_NAME,
  alternateNames: SITE_ALTERNATE_NAMES,
  url: "",
};

describe("websiteJsonLd", () => {
  it("WebSite の name と alternateName を、決めた順序で出す", () => {
    const json = JSON.parse(websiteJsonLd(base));
    expect(json["@context"]).toBe("https://schema.org");
    expect(json["@type"]).toBe("WebSite");
    expect(json.name).toBe("Hololive EgoSearch");
    expect(json.alternateName).toEqual(["ホロライブ エゴサ", "HoloEgoSearch"]);
  });

  it("url が空なら url を出さない（本番 URL が決まるまで）", () => {
    expect(JSON.parse(websiteJsonLd(base))).not.toHaveProperty("url");
  });

  it("url があれば出す", () => {
    const json = JSON.parse(
      websiteJsonLd({ ...base, url: "https://example.test/" }),
    );
    expect(json.url).toBe("https://example.test/");
  });

  it("< を \u003c にして、</script> で script を閉じられないようにする", () => {
    const out = websiteJsonLd({ ...base, name: "</script><b>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><b>");
  });
});
