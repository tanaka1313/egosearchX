import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/messages";
import { I18nContext, type I18nValue } from "@/store/i18n-context";
import { LanguageSwitch } from "./language-switch";

afterEach(cleanup);

const mount = (lang: "ja" | "en", setLang = vi.fn()) => {
  const value: I18nValue = { lang, t: dictionaries[lang], setLang };
  render(
    <I18nContext.Provider value={value}>
      <LanguageSwitch />
    </I18nContext.Provider>,
  );
  return setLang;
};

describe("LanguageSwitch", () => {
  it("今の言語のボタンだけ aria-pressed が true", () => {
    mount("en");
    expect(screen.getByRole("button", { name: "日本語" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
  it("押した言語で setLang を呼ぶ", () => {
    const setLang = mount("ja");
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(setLang).toHaveBeenCalledWith("en");
  });
});
