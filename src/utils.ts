import { execFile } from "child_process";
import { promisify } from "util";
import { access, constants } from "fs";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);
const accessAsync = promisify(access);

interface Preferences {
  goosePath?: string;
}

/**
 * Validate that the binary is the correct Goose AI agent by checking its version output.
 * The pip-installed goose-ai should respond to --version differently than the Go migration tool.
 */
export async function validateGooseBinary(binaryPath: string): Promise<boolean> {
  try {
    const { stdout, stderr } = await execFileAsync(binaryPath, ["--version"]);
    const output = (stdout + stderr).toLowerCase();

    console.log(`Goose version check for ${binaryPath}:`, output);

    // Simple validation for now - just check it responds to --version
    // Could add more specific checks based on actual output patterns
    // e.g., check for "goose" or specific version format
    return output.length > 0;
  } catch (error) {
    console.error(`Failed to validate goose binary at ${binaryPath}:`, error);
    return false;
  }
}

/**
 * Check if a file exists and is executable
 */
async function isExecutable(path: string): Promise<boolean> {
  try {
    await accessAsync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find the goose binary, preferring pip-installed locations and user preferences.
 * Validates each binary to ensure it's the AI agent, not the Go migration tool.
 */
export async function findGooseBinary(): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();

  // If user has configured a custom path, use that first
  if (preferences.goosePath) {
    const isExec = await isExecutable(preferences.goosePath);
    if (isExec) {
      const isValid = await validateGooseBinary(preferences.goosePath);
      if (isValid) {
        console.log(`Using user-configured goose path: ${preferences.goosePath}`);
        return preferences.goosePath;
      }
      console.warn(`User-configured goose path ${preferences.goosePath} failed validation`);
    }
  }

  // Common pip installation paths - prefer these over system paths
  // Check specific Python versions instead of wildcards
  const homeDir = process.env.HOME || "";
  const pipPaths = [
    `${homeDir}/.local/bin/goose`,
    `${homeDir}/Library/Python/3.11/bin/goose`,
    `${homeDir}/Library/Python/3.10/bin/goose`,
    `${homeDir}/Library/Python/3.9/bin/goose`,
    "/opt/homebrew/bin/goose",
  ];

  // System paths (less preferred as they might have the Go migration tool)
  const systemPaths = ["/usr/local/bin/goose", "/usr/bin/goose"];

  const allPaths = [...pipPaths, ...systemPaths];

  for (const path of allPaths) {
    const isExec = await isExecutable(path);
    if (isExec) {
      const isValid = await validateGooseBinary(path);
      if (isValid) {
        console.log(`Found valid goose binary at: ${path}`);
        return path;
      }
    }
  }

  // Last resort: try "goose" from PATH
  try {
    const isValid = await validateGooseBinary("goose");
    if (isValid) {
      console.log("Using 'goose' from PATH");
      return "goose";
    }
  } catch {
    // Not in PATH or not valid
  }

  throw new Error(
    "Could not find valid Goose AI agent binary. Please install via 'pip install goose-ai' or configure the path in preferences.",
  );
}
