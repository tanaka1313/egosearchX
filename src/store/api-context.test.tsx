import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EgoSearchApi } from "@/api";
import { ApiProvider, useApi } from "./api-context";

const Probe = () => <p>{useApi().clock.today()}</p>;

describe("useApi", () => {
  it("ApiProvider に渡した契約の実装を返す", () => {
    const api = { clock: { today: () => "2026-11-19" } } as EgoSearchApi;
    render(
      <ApiProvider api={api}>
        <Probe />
      </ApiProvider>,
    );
    expect(screen.getByText("2026-11-19")).toBeInTheDocument();
  });
  it("ApiProvider の外で使うと例外にする", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("ApiProvider");
  });
});
