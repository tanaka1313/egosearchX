import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createBackend } from "@/backend";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { ApiProvider } from "./api-context";
import { StoreProvider, useAppStore } from "./store-context";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

const Probe = () => {
  const status = useAppStore((s) => s.status);
  const count = useAppStore((s) => s.chips.get("hololive")?.length ?? 0);
  return (
    <p>
      {status}:{count}
    </p>
  );
};

const mount = (kv: MemoryAdapter) =>
  render(
    <ApiProvider api={createBackend({ kv, clock })}>
      <StoreProvider>
        <Probe />
        <span>子</span>
      </StoreProvider>
    </ApiProvider>,
  );

afterEach(cleanup);

describe("StoreProvider", () => {
  it("マウント後に読み込み、ready とプリセットの数を出す", async () => {
    mount(new MemoryAdapter());
    expect(screen.getByText(/^loading:0$/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/^ready:[1-9]/)).toBeInTheDocument(),
    );
  });
  it("保存データが壊れていても落ちず、子を描画し、corrupt を示す", async () => {
    const kv = new MemoryAdapter();
    await kv.set("egosearch:meta", JSON.stringify({ version: 1 }));
    await kv.set("egosearch:v2:favorites", "{壊れた");
    mount(kv);
    await waitFor(() =>
      expect(screen.getByText("corrupt:0")).toBeInTheDocument(),
    );
    expect(screen.getByText("子")).toBeInTheDocument();
    expect(await kv.get("egosearch:v2:favorites")).toBe("{壊れた");
  });
});
