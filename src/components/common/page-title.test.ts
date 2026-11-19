import { describe, expect, it } from "vitest";
import { dictionaries } from "@/messages";
import { documentTitle, pageName } from "./page-title";

const { ja, en } = dictionaries;

describe("documentTitle", () => {
  it("ホームは辞書のサイト全体の title", () => {
    expect(documentTitle(ja, "/")).toBe(ja.meta.title);
    expect(documentTitle(en, "/")).toBe(en.meta.title);
  });

  it("管理ページのタブ名は「〜の管理」", () => {
    expect(documentTitle(ja, "/buttons")).toBe(
      "条件ボタンの管理｜Hololive EgoSearch",
    );
    expect(pageName(ja, "/groups")).toBe("いつものエゴサの管理");
  });

  it("管理ページでない画面は、メニューの名前のまま", () => {
    expect(documentTitle(ja, "/about")).toBe(
      "このサイトについて｜Hololive EgoSearch",
    );
    expect(documentTitle(ja, "/import")).toBe("URL解析｜Hololive EgoSearch");
  });

  it("英語の画面では英語の名前になる", () => {
    expect(documentTitle(en, "/about")).toBe(
      `${en.menu.items.about}｜Hololive EgoSearch`,
    );
    expect(documentTitle(en, "/buttons")).toContain(en.menu.items.buttons);
  });

  it("末尾のスラッシュがあっても同じページとして扱う", () => {
    expect(documentTitle(ja, "/about/")).toBe(documentTitle(ja, "/about"));
  });

  it("メニューに無い道は、サイト全体の title", () => {
    expect(documentTitle(ja, "/unknown")).toBe(ja.meta.title);
  });
});
