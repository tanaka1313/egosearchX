import { beforeEach, describe, expect, it } from "vitest";
import { previousPath, rememberPath } from "./previous-path";

beforeEach(() => sessionStorage.clear());

describe("previousPath：キャンセルの戻り先（画面仕様書 9章）", () => {
  it("記録が無い（直接開いた）ときは既定のページを返す", () => {
    rememberPath("/favorites/edit");
    expect(previousPath("/favorites")).toBe("/favorites");
  });

  it("ページを移るたびに、直前のアプリ内ページを覚える", () => {
    rememberPath("/");
    rememberPath("/favorites");
    rememberPath("/favorites/edit");
    expect(previousPath("/favorites")).toBe("/favorites");
    // ホームから直接来たときはホームへ戻る
    sessionStorage.clear();
    rememberPath("/");
    rememberPath("/favorites/edit");
    expect(previousPath("/favorites")).toBe("/");
  });

  it("同じページの再描画（再読み込み）では、直前のページを上書きしない", () => {
    rememberPath("/buttons");
    rememberPath("/favorites/edit");
    rememberPath("/favorites/edit");
    expect(previousPath("/favorites")).toBe("/buttons");
  });

  it("直前が今のページと同じなら、既定のページを返す（自分自身へ戻らない）", () => {
    sessionStorage.setItem("egosearch:path:prev", "/favorites/edit");
    sessionStorage.setItem("egosearch:path:current", "/favorites/edit");
    expect(previousPath("/favorites")).toBe("/favorites");
  });
});
