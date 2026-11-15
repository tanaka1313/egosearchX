// フックの stdin（JSON）を読み取る共通処理。
export async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function deny(reason) {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}
