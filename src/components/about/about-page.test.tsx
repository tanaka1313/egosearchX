import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createBackend } from "@/backend";
import { mount } from "@/components/search/harness";
import { dictionaries } from "@/messages";
import { MemoryAdapter } from "@/lib/storage/kv-adapter";
import { AboutPage } from "./about-page";

const clock = {
  today: () => "2026-11-19",
  now: () => "2026-11-19T03:00:00.000Z",
};

afterEach(cleanup);

async function setup(lang: "ja" | "en") {
  const kv = new MemoryAdapter();
  const api = createBackend({ kv, clock });
  await api.data.init();
  await api.data.prefs.set({ lang });
  return mount(api, <AboutPage />, { scope: false });
}

describe.each(["ja", "en"] as const)("AboutPage（%s）", (lang) => {
  const a = dictionaries[lang].aboutPage;

  it("見出しと4つの節が出る", async () => {
    await setup(lang);
    expect(
      screen.getByRole("heading", { level: 1, name: a.title }),
    ).toBeTruthy();
    for (const name of [
      a.reasonTitle,
      a.stepsTitle,
      a.featuresTitle,
      a.dataTitle,
    ])
      expect(screen.getByRole("heading", { level: 2, name })).toBeTruthy();
  });

  it("使い方が3ステップ、できることがカード5枚", async () => {
    await setup(lang);
    const steps = screen.getByRole("region", { name: a.stepsTitle });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(3);
    const features = screen.getByRole("region", { name: a.featuresTitle });
    expect(within(features).getAllByRole("listitem")).toHaveLength(5);
  });

  it("検索結果を表示しないことと、非公式であることが書かれている", async () => {
    await setup(lang);
    expect(screen.getByText(a.noResults)).toBeTruthy();
    const data = screen.getByRole("region", { name: a.dataTitle });
    expect(within(data).getByText(a.unofficial)).toBeTruthy();
  });
});
