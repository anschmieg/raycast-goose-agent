import { execFile } from "child_process";
import { promisify } from "util";
import { access, constants } from "fs";
import { getPreferenceValues, LocalStorage } from "@raycast/api";

const execFileAsync = promisify(execFile);
const accessAsync = promisify(access);

const GOOSE_PATH_CACHE_KEY = "cached_goose_path";

interface Preferences {
  goosePath?: string;
  enableVoiceOutput?: boolean;
}

/**
 * Validate that the binary is the correct Goose AI agent by probing with a specific command.
 * The AI agent should support 'session list', while the Go migration tool will error with "flag provided but not defined".
 */
export async function validateGooseBinary(binaryPath: string): Promise<boolean> {
  try {
    // Try to run 'goose session list' - only the AI agent supports this
    const { stdout, stderr } = await execFileAsync(binaryPath, ["session", "list"], { timeout: 5000 });
    const output = (stdout + stderr).toLowerCase();

    console.log(`Goose validation for ${binaryPath}:`, output.substring(0, 200));

    // If it responds without the "flag provided but not defined" error, it's likely the AI agent
    // The migration tool will error with "flag provided but not defined: -format"
    if (output.includes("flag provided but not defined") || output.includes("usage: goose")) {
      console.log(`Binary at ${binaryPath} is the Go migration tool (rejected)`);
      return false;
    }

    // If it succeeded or returned session data (even empty), it's the AI agent
    console.log(`Binary at ${binaryPath} appears to be Goose AI agent`);
    return true;
  } catch (error) {
    // Check if the error message indicates it's the wrong tool
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("flag provided but not defined") || errorMsg.includes("usage: goose")) {
      console.log(`Binary at ${binaryPath} is the Go migration tool (rejected via error)`);
      return false;
    }

    // Other errors might be transient or expected (e.g., no sessions yet)
    console.log(`Binary at ${binaryPath} validation uncertain:`, errorMsg);
    // If the command exists but fails for other reasons, it might still be valid
    // We'll be conservative and accept it if it's not clearly the wrong tool
    return !errorMsg.includes("ENOENT");
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
 * Get the cached Goose binary path
 */
export async function getCachedGoosePath(): Promise<string | null> {
  try {
    const cached = await LocalStorage.getItem<string>(GOOSE_PATH_CACHE_KEY);
    if (cached) {
      // Verify the cached path still exists and is executable
      const isExec = await isExecutable(cached);
      if (isExec) {
        console.log(`Using cached goose path: ${cached}`);
        return cached;
      } else {
        console.log(`Cached path ${cached} no longer executable, clearing cache`);
        await LocalStorage.removeItem(GOOSE_PATH_CACHE_KEY);
      }
    }
  } catch (error) {
    console.error("Failed to get cached goose path:", error);
  }
  return null;
}

/**
 * Cache the validated Goose binary path
 */
export async function cacheGoosePath(path: string): Promise<void> {
  try {
    await LocalStorage.setItem(GOOSE_PATH_CACHE_KEY, path);
    console.log(`Cached goose path: ${path}`);
  } catch (error) {
    console.error("Failed to cache goose path:", error);
  }
}

/**
 * Clear the cached Goose binary path
 */
export async function clearGoosePathCache(): Promise<void> {
  try {
    await LocalStorage.removeItem(GOOSE_PATH_CACHE_KEY);
    console.log("Cleared goose path cache");
  } catch (error) {
    console.error("Failed to clear goose path cache:", error);
  }
}

/**
 * Find the goose binary, preferring pip-installed locations and user preferences.
 * Validates each binary to ensure it's the AI agent, not the Go migration tool.
 * Caches the result for faster subsequent lookups.
 */
export async function findGooseBinary(useCache = true): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();

  // Check cache first if enabled
  if (useCache) {
    const cached = await getCachedGoosePath();
    if (cached) {
      return cached;
    }
  }

  // If user has configured a custom path, use that first
  if (preferences.goosePath) {
    const isExec = await isExecutable(preferences.goosePath);
    if (isExec) {
      const isValid = await validateGooseBinary(preferences.goosePath);
      if (isValid) {
        console.log(`Using user-configured goose path: ${preferences.goosePath}`);
        await cacheGoosePath(preferences.goosePath);
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
    `${homeDir}/Library/Python/3.12/bin/goose`,
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
        await cacheGoosePath(path);
        return path;
      }
    }
  }

  // Last resort: try "goose" from PATH
  try {
    const isValid = await validateGooseBinary("goose");
    if (isValid) {
      console.log("Using 'goose' from PATH");
      await cacheGoosePath("goose");
      return "goose";
    }
  } catch {
    // Not in PATH or not valid
  }

  throw new Error(
    "Could not find valid Goose AI agent binary. Please install via 'pip install goose-ai' or configure the path in preferences.",
  );
}

/**
 * Get user preferences
 */
export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}
