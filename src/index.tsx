import { Detail, ActionPanel, Action, showToast, Toast, LaunchProps } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Arguments {
  query?: string;
}

// Find the goose binary in common installation paths
async function findGooseBinary(): Promise<string> {
  const paths = ["/usr/local/bin/goose", "/opt/homebrew/bin/goose", "/usr/bin/goose"];

  for (const path of paths) {
    try {
      await execAsync(`test -x ${path}`);
      return path;
    } catch {
      // Binary not found at this path, try next
    }
  }

  // Fallback to PATH
  return "goose";
}

// Kill any running goose processes
async function killGooseProcesses() {
  try {
    const { stdout } = await execAsync("pgrep -f 'goose run'");
    const pids = stdout.trim().split("\n").filter(Boolean);

    for (const pid of pids) {
      try {
        await execAsync(`kill ${pid}`);
      } catch {
        // Process may have already exited
      }
    }

    return pids.length;
  } catch {
    // No processes found
    return 0;
  }
}

// Speak the final output using macOS say command
async function speakOutput(text: string) {
  try {
    const lines = text.trim().split("\n");
    const lastLine = lines[lines.length - 1];

    if (lastLine && lastLine.trim()) {
      // Execute say command in background
      exec(`say "${lastLine.replace(/"/g, '\\"')}"`);
    }
  } catch (error) {
    console.error("Failed to speak output:", error);
  }
}

export default function Command({ arguments: args }: LaunchProps<{ arguments: Arguments }>) {
  const [goosePath, setGoosePath] = useState<string>("");
  const [markdown, setMarkdown] = useState<string>("# Goose AI Agent\n\nInitializing...");
  const [isComplete, setIsComplete] = useState(false);
  const [fullOutput, setFullOutput] = useState("");

  const query = args.query || "";

  // Find goose binary on mount
  useEffect(() => {
    findGooseBinary()
      .then((path) => {
        setGoosePath(path);
        if (!query) {
          setMarkdown("# Goose AI Agent\n\nPlease provide a query to get started.");
        }
      })
      .catch(() => {
        setMarkdown(
          "# Error\n\nGoose binary not found. Please ensure Goose is installed.\n\nInstall via: `pip install goose-ai`",
        );
      });
  }, []);

  // Build the command when we have both goosePath and query
  const command = goosePath && query ? `${goosePath} run --text "${query.replace(/"/g, '\\"')}"` : undefined;

  const { isLoading, data, error } = useExec(command || "echo", [], {
    shell: true,
    execute: !!command,
    onData: (data) => {
      const newText = data.toString();
      setFullOutput((prev) => prev + newText);
      setMarkdown((prev) => {
        // If this is the first real output, replace the "Initializing..." message
        if (prev.includes("Initializing...")) {
          return `# Goose AI Agent\n\n**Query:** ${query}\n\n---\n\n${newText}`;
        }
        return prev + newText;
      });
    },
  });

  // Show toast when starting
  useEffect(() => {
    if (isLoading && query) {
      showToast({
        style: Toast.Style.Animated,
        title: "Goose is thinking...",
      });
    }
  }, [isLoading, query]);

  // Handle completion
  useEffect(() => {
    if (!isLoading && data && !isComplete && query) {
      setIsComplete(true);
      showToast({
        style: Toast.Style.Success,
        title: "Goose finished",
      });
      speakOutput(fullOutput);
    }
  }, [isLoading, data, isComplete, fullOutput, query]);

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error running Goose",
        message: error.message,
      });
      setMarkdown(`# Error\n\n${error.message}\n\nPlease check that Goose is installed and accessible.`);
    }
  }, [error]);

  const handleStopGoose = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Stopping Goose processes...",
    });

    const killedCount = await killGooseProcesses();

    if (killedCount > 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Stopped ${killedCount} Goose process(es)`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "No running Goose processes found";
    }
  };

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={fullOutput || markdown} />
          <Action title="Stop Goose" onAction={handleStopGoose} shortcut={{ modifiers: ["cmd"], key: "k" }} />
        </ActionPanel>
      }
    />
  );
}
