import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("トップページ", () => {
  it("見出し「Hololive EgoSearch」を表示する", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Hololive EgoSearch" }),
    ).toBeInTheDocument();
  });
});
