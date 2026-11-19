import { defineConfig } from "vitest/config";

// 日付 → UNIX 秒の計算（Yahoo の lts／uts）は現地0時なので、テストは日本時間に固定する（CI は UTC）
process.env.TZ = "Asia/Tokyo";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "jsdom",
    // jsdom で画面を描画するテストは重く、全体を並列で実行すると5秒を超えることがある（単独なら通る）。
    // ファイルごとに延ばし続けないよう、ここで1か所に決める
    testTimeout: 30_000,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", ".claude/hooks/**/*.test.mjs"],
  },
});
