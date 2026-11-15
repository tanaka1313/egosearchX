import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("トップページ", () => {
  it("見出し「EgoSearch Studio」を表示する", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "EgoSearch Studio" }),
    ).toBeInTheDocument();
  });
});
