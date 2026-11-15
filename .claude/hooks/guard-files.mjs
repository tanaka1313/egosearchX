import { checkFilePath } from "./rules.mjs";
import { deny, readInput } from "./read-input.mjs";

const input = await readInput();
const ti = input.tool_input ?? {};
const result = checkFilePath(ti.file_path ?? ti.notebook_path);
if (result.blocked) deny(`[ガードレール] ${result.reason}`);
