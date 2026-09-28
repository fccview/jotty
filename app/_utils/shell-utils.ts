import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const SHELL = "sh";
const SCRIPT_NAME = "jotty";

export interface ShellOptions {
  maxBuffer?: number;
}

/**
 * Runs a fixed shell script with user data passed as positional arguments
 * ($1, $2, ...). Arguments are never parsed by the shell, so paths and values
 * containing $(...), backticks or quotes stay inert.
 */
export const boxedShell = async (
  script: string,
  args: string[],
  options: ShellOptions = {},
): Promise<string> => {
  const { stdout } = await execFileAsync(
    SHELL,
    ["-c", script, SCRIPT_NAME, ...args],
    { encoding: "utf8", ...options },
  );
  return stdout;
};
