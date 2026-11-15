import { describe, expect, it } from "vitest";
import { checkCommand, checkFilePath } from "./rules.mjs";

describe("checkCommand: ブロックする", () => {
  const blocked = [
    "rm -rf node_modules",
    "rm -fr dist",
    "rm -Rf dist",
    "rm -rfv dist",
    "rm -r -f dist",
    "rm --recursive --force dist",
    "cd x && rm -rf y",
    "echo a; rm -rf y",
    "Remove-Item -Recurse -Force .\\out",
    "Remove-Item .\\out -Force -Recurse",
    "git push --force origin main",
    "git push -f origin main",
    "git push --force-with-lease",
    "git push origin +main",
    "git reset --hard HEAD~1",
    "git clean -fd",
    "echo SECRET=1 > .env",
    "echo SECRET=1 >> .env.local",
    'git commit -m "docs: rm -rf の説明"',
  ];
  it.each(blocked)("%s", (cmd) => {
    const r = checkCommand(cmd);
    expect(r.blocked).toBe(true);
    expect(r.reason).toBeTruthy();
  });
});

describe("checkCommand: 許可する", () => {
  const allowed = [
    "rm file.txt",
    "rm -r dir",
    "rm -f file.txt",
    "git push origin main",
    "git push -u origin feature/x",
    "git reset --soft HEAD~1",
    "git clean -n",
    "cat .env.example",
    "echo a > out.txt",
    "Remove-Item .\\tmp.txt",
    "npm run build",
  ];
  it.each(allowed)("%s", (cmd) => {
    expect(checkCommand(cmd).blocked).toBe(false);
  });
});

describe("checkFilePath", () => {
  const blocked = [
    ".env",
    "/repo/.env",
    "C:\\Users\\x\\repo\\.env",
    "C:/Users/x/repo/.env.local",
    "C:\\Users\\x\\repo\\.env.production",
    "/repo/certs/server.pem",
    "C:\\repo\\private.key",
    "/home/x/.ssh/id_rsa",
    "C:\\Users\\x\\.ssh\\id_ed25519.pub",
  ];
  it.each(blocked)("ブロック: %s", (p) => {
    const r = checkFilePath(p);
    expect(r.blocked).toBe(true);
    expect(r.reason).toBeTruthy();
  });

  const allowed = [
    ".env.example",
    "C:\\repo\\.env.example",
    "/repo/src/app/page.tsx",
    "C:\\repo\\src\\environment.ts",
    "/repo/docs/keyboard.md",
  ];
  it.each(allowed)("許可: %s", (p) => {
    expect(checkFilePath(p).blocked).toBe(false);
  });

  it("パスが空なら許可する", () => {
    expect(checkFilePath(undefined).blocked).toBe(false);
  });
});
