import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { dictionaries } from "@/messages";
import { I18nContext } from "@/store/i18n-context";
import { SiteFooter } from "./site-footer";

afterEach(cleanup);

describe("SiteFooter", () => {
  it("公式と誤認されないよう、非公式（ファンメイド）であることを表示する", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/非公式/)).toBeInTheDocument();
    expect(screen.getByText(/ファン/)).toBeInTheDocument();
  });

  it("英語の画面でも、非公式（ファンメイド）であることと、英語のバージョン情報ボタンを出す", () => {
    render(
      <I18nContext.Provider
        value={{ lang: "en", t: dictionaries.en, setLang: () => {} }}
      >
        <SiteFooter />
      </I18nContext.Provider>,
    );
    expect(screen.getByText(/unofficial/i)).toBeInTheDocument();
    expect(screen.getByText(/fan-made/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Version info" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/非公式/)).toBeNull();
  });
});
