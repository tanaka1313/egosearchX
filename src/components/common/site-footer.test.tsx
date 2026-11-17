import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("公式と誤認されないよう、非公式（ファンメイド）であることを表示する", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/非公式/)).toBeInTheDocument();
    expect(screen.getByText(/ファン/)).toBeInTheDocument();
  });
});
