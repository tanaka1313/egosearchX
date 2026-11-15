// フックの判定ロジック。副作用を持たない純粋関数だけを置く。

const ok = { blocked: false, reason: "" };
const block = (reason) => ({ blocked: true, reason });

/** 区切り（; & | 改行）までを1つのコマンド断片として取り出す */
function segmentsAfter(command, pattern) {
  const re = new RegExp(`${pattern}\\s+([^;&|\\n]*)`, "gi");
  return [...command.matchAll(re)].map((m) => m[1].split(/\s+/).filter(Boolean));
}

const isShort = (t) => /^-[^-]/.test(t);
const hasShort = (tokens, chars) =>
  tokens.some((t) => isShort(t) && new RegExp(`[${chars}]`).test(t));

function envBasename(name) {
  return name === ".env" || (name.startsWith(".env.") && name !== ".env.example");
}

export function checkCommand(command) {
  if (typeof command !== "string" || command === "") return ok;

  for (const t of segmentsAfter(command, "\\brm")) {
    const recursive = hasShort(t, "rR") || t.includes("--recursive");
    const force = hasShort(t, "f") || t.includes("--force");
    if (recursive && force) {
      return block("`rm` の再帰＋強制削除は禁止です。対象を絞って個別に削除してください。");
    }
  }

  for (const t of segmentsAfter(command, "\\bRemove-Item")) {
    const lower = t.map((x) => x.toLowerCase());
    if (lower.includes("-recurse") && lower.includes("-force")) {
      return block("`Remove-Item -Recurse -Force` は禁止です。");
    }
  }

  for (const t of segmentsAfter(command, "\\bgit\\s+push")) {
    const force =
      t.some((x) => x === "--force" || x.startsWith("--force-with-lease")) ||
      hasShort(t, "f") ||
      t.some((x) => x.startsWith("+"));
    if (force) return block("force push は禁止です。");
  }

  if (/\bgit\s+reset\b[^;&|\n]*--hard/i.test(command)) {
    return block("`git reset --hard` は禁止です。");
  }

  for (const t of segmentsAfter(command, "\\bgit\\s+clean")) {
    if (hasShort(t, "f") || t.includes("--force")) {
      return block("`git clean -f` は禁止です。");
    }
  }

  for (const m of command.matchAll(/>>?\s*["']?([^\s"'|;&]+)/g)) {
    const name = m[1].split(/[\\/]/).pop();
    if (envBasename(name) || isSecretName(name)) {
      return block(`秘密情報ファイル（${name}）へのリダイレクト書き込みは禁止です。`);
    }
  }

  return ok;
}

function isSecretName(name) {
  return (
    name.endsWith(".pem") ||
    name.endsWith(".key") ||
    name.startsWith("id_rsa") ||
    name.startsWith("id_ed25519")
  );
}

export function checkFilePath(filePath) {
  if (typeof filePath !== "string" || filePath === "") return ok;
  const name = filePath.split(/[\\/]/).pop();
  if (envBasename(name) || isSecretName(name)) {
    return block(`秘密情報ファイル（${name}）への書き込みは禁止です。`);
  }
  return ok;
}
