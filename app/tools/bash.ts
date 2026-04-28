import { execSync } from "child_process";

/**
 * Execute a shell command and return its stdout or error output.
 * @param command - The command string to execute.
 * @returns The command output.
 */
export function Bash(command: string): string {
  try {
    return execSync(command, { encoding: "utf-8" }) || "(no output)";
  } catch (err: any) {
    return err.stderr || err.message;
  }
}
