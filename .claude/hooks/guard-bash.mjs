import { checkCommand } from "./rules.mjs";
import { deny, readInput } from "./read-input.mjs";

const input = await readInput();
const result = checkCommand(input.tool_input?.command);
if (result.blocked) deny(`[ガードレール] ${result.reason}`);
