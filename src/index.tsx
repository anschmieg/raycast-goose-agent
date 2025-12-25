import {
  Detail,
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  LaunchProps,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { findGooseBinary, validateGooseBinary } from "./utils";

const execFileAsync = promisify(execFile);

interface Arguments {
  query?: string;
}

// Kill any running goose processes
async function killGooseProcesses() {
  try {
    // Use more specific pattern to avoid killing unrelated processes
    const { stdout } = await execFileAsync("pgrep", ["-f", "goose run"]);
    const pids = stdout.trim().split("\n").filter(Boolean);

    for (const pid of pids) {
      try {
        // Validate PID is a number before killing
        const numPid = parseInt(pid.trim(), 10);
        if (!isNaN(numPid) && numPid > 0) {
          await execFileAsync("kill", [numPid.toString()]);
        }
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
      // Execute say command in background using execFile for safety
      execFile("say", [lastLine]);
    }
  } catch (error) {
    console.error("Failed to speak output:", error);
  }
}

interface GooseResultProps {
  query: string;
  goosePath: string;
}

function GooseResult({ query, goosePath }: GooseResultProps) {
  const [markdown, setMarkdown] = useState<string>("# Goose AI Agent\n\nInitializing...");
  const [isLoading, setIsLoading] = useState(true);
  const [fullOutput, setFullOutput] = useState("");
  const [errorOutput, setErrorOutput] = useState("");

  useEffect(() => {
    const runGoose = async () => {
      setIsLoading(true);
      setMarkdown(`# Goose AI Agent\n\n**Query:** ${query}\n\n**Goose Path:** ${goosePath}\n\n---\n\n`);

      try {
        // Validate the binary before running
        const isValid = await validateGooseBinary(goosePath);
        if (!isValid) {
          throw new Error(`Invalid Goose binary at ${goosePath}`);
        }

        // Use spawn for real-time output streaming
        // Arguments array ensures no shell interpretation issues
        const args = ["run", "--text", query];

        console.log(`Executing: ${goosePath} ${args.join(" ")}`);

        const gooseProcess = spawn(goosePath, args, {
          env: { ...process.env },
        });

        let stdoutData = "";
        let stderrData = "";

        gooseProcess.stdout.on("data", (data) => {
          const text = data.toString();
          stdoutData += text;
          setFullOutput((prev) => prev + text);
          setMarkdown((prev) => {
            if (prev.includes("Initializing...")) {
              return `# Goose AI Agent\n\n**Query:** ${query}\n\n**Goose Path:** ${goosePath}\n\n---\n\n${text}`;
            }
            return prev + text;
          });
        });

        gooseProcess.stderr.on("data", (data) => {
          const text = data.toString();
          stderrData += text;
          setErrorOutput((prev) => prev + text);
          // Also show stderr in the output for debugging
          setMarkdown((prev) => prev + `\n\n**Error/Warning:**\n\`\`\`\n${text}\n\`\`\`\n\n`);
        });

        gooseProcess.on("close", (code) => {
          setIsLoading(false);

          if (code === 0) {
            showToast({
              style: Toast.Style.Success,
              title: "Goose finished",
            });
            speakOutput(stdoutData);
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: `Goose exited with code ${code}`,
              message: stderrData ? "Check output for errors" : undefined,
            });
            setMarkdown(
              (prev) =>
                prev +
                `\n\n---\n\n**Process exited with code ${code}**\n\n${stderrData ? `**stderr:**\n\`\`\`\n${stderrData}\n\`\`\`\n` : ""}`,
            );
          }
        });

        gooseProcess.on("error", (err) => {
          setIsLoading(false);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to start Goose",
            message: err.message,
          });
          setMarkdown(
            `# Error\n\n**Failed to start Goose**\n\n${err.message}\n\n**Path:** ${goosePath}\n\n**Args:** ${args.join(" ")}`,
          );
        });

        // Show initial toast
        await showToast({
          style: Toast.Style.Animated,
          title: "Goose is thinking...",
        });
      } catch (err) {
        setIsLoading(false);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        showToast({
          style: Toast.Style.Failure,
          title: "Error running Goose",
          message: errorMessage,
        });
        setMarkdown(
          `# Error\n\n${errorMessage}\n\n**Goose Path:** ${goosePath}\n\nPlease check your Goose installation.`,
        );
      }
    };

    runGoose();
  }, [query, goosePath]);

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
          {errorOutput && <Action.CopyToClipboard title="Copy Errors" content={errorOutput} />}
          <Action
            title="Stop Goose"
            onAction={handleStopGoose}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
          />
        </ActionPanel>
      }
    />
  );
}

function AskGooseForm({ goosePath }: { goosePath: string }) {
  const [query, setQuery] = useState("");
  const { push } = useNavigation();

  const handleSubmit = () => {
    if (!query.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a question",
      });
      return;
    }

    push(<GooseResult query={query} goosePath={goosePath} />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Goose" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title="Your Question"
        placeholder="What would you like to ask Goose?"
        value={query}
        onChange={setQuery}
      />
      <Form.Description text={`Using Goose binary at: ${goosePath}`} />
    </Form>
  );
}

export default function Command({ arguments: args }: LaunchProps<{ arguments: Arguments }>) {
  const [goosePath, setGoosePath] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const query = args.query || "";

  // Find goose binary on mount
  useEffect(() => {
    findGooseBinary()
      .then((path) => {
        console.log(`Found Goose binary: ${path}`);
        setGoosePath(path);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to find Goose binary:", err);
        setError(err instanceof Error ? err.message : "Failed to find Goose binary");
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <Detail markdown="# Loading...\n\nSearching for Goose binary..." isLoading={true} />;
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}\n\n## Installation\n\nInstall Goose via pip:\n\`\`\`\npip install goose-ai\n\`\`\`\n\nOr configure a custom path in Raycast preferences.`}
      />
    );
  }

  // If query is provided (e.g., from deeplink), show result directly
  if (query) {
    return <GooseResult query={query} goosePath={goosePath} />;
  }

  // Otherwise, show the form
  return <AskGooseForm goosePath={goosePath} />;
}
