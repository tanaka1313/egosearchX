import { defineConfig } from "vitest/config";

// 日付 → UNIX 秒の計算（Yahoo の lts／uts）は現地0時なので、テストは日本時間に固定する（CI は UTC）
process.env.TZ = "Asia/Tokyo";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", ".claude/hooks/**/*.test.mjs"],
  },
});
