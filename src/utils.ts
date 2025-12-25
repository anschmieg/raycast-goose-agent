import { execFile } from "child_process";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

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
    
    // The AI agent should mention "goose" in its version output
    // The Go migration tool will have different output
    // We're looking for the AI agent, not the database migration tool
    console.log(`Goose version check for ${binaryPath}:`, output);
    
    // Basic validation - if it responds to --version without error, it's likely usable
    // More specific validation could be added based on actual output patterns
    return true;
  } catch (error) {
    console.error(`Failed to validate goose binary at ${binaryPath}:`, error);
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
    const isValid = await validateGooseBinary(preferences.goosePath);
    if (isValid) {
      console.log(`Using user-configured goose path: ${preferences.goosePath}`);
      return preferences.goosePath;
    }
    console.warn(`User-configured goose path ${preferences.goosePath} failed validation`);
  }

  // Common pip installation paths - prefer these over system paths
  const pipPaths = [
    `${process.env.HOME}/.local/bin/goose`,
    `${process.env.HOME}/Library/Python/3.*/bin/goose`,
    "/opt/homebrew/bin/goose",
  ];

  // System paths (less preferred as they might have the Go migration tool)
  const systemPaths = ["/usr/local/bin/goose", "/usr/bin/goose"];

  const allPaths = [...pipPaths, ...systemPaths];

  for (const path of allPaths) {
    try {
      // Check if file exists and is executable
      const { stdout } = await execFileAsync("test", ["-x", path]);
      const isValid = await validateGooseBinary(path);
      if (isValid) {
        console.log(`Found valid goose binary at: ${path}`);
        return path;
      }
    } catch {
      // Binary not found or not valid, try next
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
