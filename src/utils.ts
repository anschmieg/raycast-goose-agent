import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Properly escape shell arguments to prevent command injection.
 * Uses single-quote shell escaping which is the safest method.
 */
export function escapeShellArg(arg: string): string {
  // Replace single quotes with '\'' and wrap in single quotes
  // This is the safest way to pass arguments to shell commands
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Find the goose binary in common installation paths.
 * Checks standard locations for Homebrew and system installations.
 */
export async function findGooseBinary(): Promise<string> {
  const paths = ["/usr/local/bin/goose", "/opt/homebrew/bin/goose", "/usr/bin/goose"];

  for (const path of paths) {
    try {
      // Note: path is a trusted constant from the array above, not user input
      await execAsync(`test -x ${path}`);
      return path;
    } catch {
      // Binary not found at this path, try next
    }
  }

  // Fallback to PATH
  return "goose";
}
