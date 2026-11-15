import { spawnSync } from "node:child_process";
import { readInput } from "./read-input.mjs";

const input = await readInput();
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const r = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
const changed = (r.stdout ?? "")
  .split("\n")
  .some((l) => /^.. (src\/|package\.json|.*config|\.claude\/hooks\/)/.test(l));

if (changed) {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason:
        "未コミットの変更があります。未実行なら tsc → test → lint → build を実行し、実行済みなら結果を報告して終了してください。",
    }),
  );
}
