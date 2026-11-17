import { execSync } from "node:child_process";
import type { NextConfig } from "next";

// コミットの短縮ハッシュ。Vercel では環境変数、ローカルでは git から取る。取れなければ空。
function commitHash(): string {
  const fromEnv = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  output: "export",
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_COMMIT: commitHash(),
  },
};

export default nextConfig;
