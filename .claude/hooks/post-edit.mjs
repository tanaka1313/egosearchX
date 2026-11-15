import { spawnSync } from "node:child_process";
import path from "node:path";
import { readInput } from "./read-input.mjs";

const input = await readInput();
const file = input.tool_input?.file_path;
if (!file) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const bin = (name) =>
  path.join(root, "node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name);
const run = (name, args) =>
  spawnSync(bin(name), args, { cwd: root, encoding: "utf8", shell: process.platform === "win32" });

run("prettier", ["--write", "--ignore-unknown", file]);

if (/\.(ts|tsx|js|mjs)$/.test(file)) {
  const r = run("eslint", ["--fix", file]);
  if (r.status !== 0) {
    process.stderr.write(`[lint] ${file}\n${r.stdout}${r.stderr}`);
    process.exit(2);
  }
}
