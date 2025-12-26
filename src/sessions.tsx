import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  Form,
  Detail,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { findGooseBinary, clearGoosePathCache, SESSION_COMMAND_TIMEOUT } from "./utils";

const execFileAsync = promisify(execFile);

interface Session {
  id: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  messages?: Array<{ role: string; content: string }>;
}

interface ResumeSessionProps {
  sessionId: string;
  goosePath: string;
  onResume: () => void;
}

interface ResumeResultProps {
  sessionId: string;
  input: string;
  goosePath: string;
}

const GOOSE_PANIC_ERROR_MESSAGE = `**Goose Panic (exit code 101)**

This usually means Goose encountered an unexpected error. The panic details are shown above.

**Troubleshooting:**
- Ensure you're using a recent version of Goose
- Try resetting the session or starting a new one
- Check the Goose logs for more details`;

function ResumeResult({ sessionId, input, goosePath }: ResumeResultProps) {
  const [markdown, setMarkdown] = useState<string>("# Resuming Session\n\nInitializing...");
  const [isLoading, setIsLoading] = useState(true);
  const [fullOutput, setFullOutput] = useState("");
  const [errorOutput, setErrorOutput] = useState("");

  useEffect(() => {
    const resumeSession = async () => {
      setIsLoading(true);
      setMarkdown(
        `# Resuming Session\n\n**Session ID:** ${sessionId}\n\n**Input:** ${input}\n\n**Goose Path:** ${goosePath}\n\n---\n\n`,
      );

      try {
        // The issue: Goose tries to read from stdin in interactive mode, causing "NotConnected" panic
        // Solution: Use stdin pipe to provide input non-interactively
        const args = ["run", "--session-id", sessionId, "--resume"];

        console.log(`Executing: ${goosePath} ${args.join(" ")} (with stdin: "${input}")`);

        // Set RUST_BACKTRACE for better diagnostics if it panics
        const gooseProcess = spawn(goosePath, args, {
          env: { ...process.env, RUST_BACKTRACE: "1" },
          stdio: ["pipe", "pipe", "pipe"], // Explicitly set stdin as pipe
        });

        let stdoutData = "";
        let stderrData = "";
        let processStarted = false;

        // Write input to stdin and close it to signal end of input
        try {
          gooseProcess.stdin.write(input + "\n");
          gooseProcess.stdin.end();
          processStarted = true;
        } catch (err) {
          console.error("Failed to write to stdin:", err);
          throw new Error(`Failed to send input to Goose: ${err instanceof Error ? err.message : "Unknown error"}`);
        }

        gooseProcess.stdout.on("data", (data) => {
          const text = data.toString();
          stdoutData += text;
          setFullOutput((prev) => prev + text);
          setMarkdown((prev) => {
            if (prev.includes("Initializing...")) {
              return `# Resuming Session\n\n**Session ID:** ${sessionId}\n\n**Input:** ${input}\n\n**Goose Path:** ${goosePath}\n\n---\n\n${text}`;
            }
            return prev + text;
          });
        });

        gooseProcess.stderr.on("data", (data) => {
          const text = data.toString();
          stderrData += text;
          setErrorOutput((prev) => prev + text);

          // Log panic detection (exit code 101 is the definitive indicator)
          if (text.includes("panicked at") || text.includes("RUST_BACKTRACE")) {
            console.error("Goose panic detected in stderr:", text.substring(0, 200));
          }

          setMarkdown((prev) => prev + `\n\n**Error/Warning:**\n\`\`\`\n${text}\n\`\`\`\n\n`);
        });

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          if (processStarted && !gooseProcess.killed) {
            console.warn("Goose process timeout, killing...");
            gooseProcess.kill();
          }
        }, 30000); // 30 second timeout

        gooseProcess.on("close", (code) => {
          clearTimeout(timeout);
          setIsLoading(false);

          if (code === 0) {
            showToast({
              style: Toast.Style.Success,
              title: "Session resumed successfully",
            });
          } else if (code === 101) {
            // Goose panic - exit code 101 is the definitive indicator
            showToast({
              style: Toast.Style.Failure,
              title: "Goose panicked (exit code 101)",
              message: "Check output for panic details",
            });
            setMarkdown(
              (prev) =>
                prev +
                `\n\n---\n\n${GOOSE_PANIC_ERROR_MESSAGE}\n\n${stderrData ? `**Full stderr:**\n\`\`\`\n${stderrData}\n\`\`\`\n` : ""}`,
            );
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: `Process exited with code ${code}`,
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
          clearTimeout(timeout);
          setIsLoading(false);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to start Goose",
            message: err.message,
          });
          setMarkdown(
            `# Error\n\n**Failed to resume session**\n\n${err.message}\n\n**Path:** ${goosePath}\n\n**Args:** ${args.join(" ")}`,
          );
        });

        // Show initial toast
        await showToast({
          style: Toast.Style.Animated,
          title: "Resuming session...",
        });
      } catch (err) {
        setIsLoading(false);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        showToast({
          style: Toast.Style.Failure,
          title: "Error resuming session",
          message: errorMessage,
        });
        setMarkdown(`# Error\n\n${errorMessage}\n\n**Goose Path:** ${goosePath}\n\nPlease check your Goose installation.`);
      }
    };

    resumeSession();
  }, [sessionId, input, goosePath]);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Output" content={fullOutput || markdown} />
          {errorOutput && <Action.CopyToClipboard title="Copy Errors" content={errorOutput} />}
        </ActionPanel>
      }
    />
  );
}

function ResumeSessionForm({ sessionId, goosePath, onResume }: ResumeSessionProps) {
  const [input, setInput] = useState("");
  const { push } = useNavigation();

  const handleSubmit = () => {
    if (!input.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a message",
      });
      return;
    }

    push(<ResumeResult sessionId={sessionId} input={input} goosePath={goosePath} />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Resume Session" onSubmit={handleSubmit} icon={Icon.Play} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="input"
        title="Your Message"
        placeholder="What would you like to ask?"
        value={input}
        onChange={setInput}
      />
      <Form.Description text={`Resuming session: ${sessionId}`} />
      <Form.Description text={`Using Goose at: ${goosePath}`} />
    </Form>
  );
}

/**
 * Fetch detailed session information including messages
 * The `session list` command may not include full message data,
 * so we try to get more details per session
 */
async function fetchSessionWithDetails(goosePath: string, sessionId: string): Promise<Session | null> {
  try {
    // Try to get session details - this may vary by Goose version
    // Some versions support: goose session show <id>
    // For now, we'll rely on the list output but log what we get
    const args = ["session", "list", "--format", "json"];
    const { stdout } = await execFileAsync(goosePath, args, { timeout: SESSION_COMMAND_TIMEOUT });

    const parsed = JSON.parse(stdout.trim() || "[]");
    const sessionList = Array.isArray(parsed) ? parsed : [parsed];

    // Find the session by ID
    const session = sessionList.find((s: Session) => s.id === sessionId);
    if (session) {
      console.log(`Session ${sessionId} details:`, JSON.stringify(session, null, 2));
      return session;
    }

    return null;
  } catch (error) {
    console.error(`Failed to fetch details for session ${sessionId}:`, error);
    return null;
  }
}

export default function Command() {
  const [goosePath, setGoosePath] = useState<string>("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Find goose binary on mount (uses cache)
  useEffect(() => {
    findGooseBinary()
      .then((path) => {
        console.log(`Found Goose binary: ${path}`);
        setGoosePath(path);
      })
      .catch((err) => {
        console.error("Failed to find Goose binary:", err);
        setError(err instanceof Error ? err.message : "Goose binary not found");
        setIsLoading(false);
      });
  }, []);

  // Fetch sessions when we have the goose path
  useEffect(() => {
    if (!goosePath) return;

    const fetchSessions = async () => {
      setIsLoading(true);

      try {
        // Use execFile with args array
        const args = ["session", "list", "--format", "json"];

        console.log(`Executing: ${goosePath} ${args.join(" ")}`);

        const { stdout, stderr } = await execFileAsync(goosePath, args, { timeout: SESSION_COMMAND_TIMEOUT });

        if (stderr) {
          console.warn("Goose session list stderr:", stderr);

          // Check if this is the wrong binary
          if (stderr.includes("flag provided but not defined")) {
            throw new Error(
              "Wrong Goose binary detected (Go migration tool). Please install Goose AI via 'pip install goose-ai' and use 'Reset Binary Cache'.",
            );
          }
        }

        // Parse the JSON output - handle various formats
        let sessionList: Session[] = [];
        const trimmed = stdout.trim();

        if (trimmed) {
          try {
            const parsed = JSON.parse(trimmed);

            if (Array.isArray(parsed)) {
              sessionList = parsed;
            } else if (parsed && typeof parsed === "object") {
              // Single session object or wrapped format
              if (parsed.sessions && Array.isArray(parsed.sessions)) {
                sessionList = parsed.sessions;
              } else {
                sessionList = [parsed];
              }
            }

            // Log what we got to help debug the "No messages" issue
            console.log(`Fetched ${sessionList.length} sessions`);
            sessionList.forEach((session, idx) => {
              const messageCount = session.messages?.length || 0;
              console.log(
                `Session ${idx}: id=${session.id}, messages=${messageCount}, keys=${Object.keys(session).join(",")}`,
              );
              if (messageCount === 0 && session.messages) {
                console.warn(`Session ${session.id} has empty messages array`);
              }
              if (!session.messages) {
                console.warn(`Session ${session.id} has no messages property at all`);
              }
            });
          } catch (parseError) {
            console.error("Failed to parse session JSON:", parseError);
            console.error("Raw output:", trimmed);
            throw new Error(
              `Failed to parse sessions JSON: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`,
            );
          }
        }

        console.log(`Found ${sessionList.length} sessions`);
        setSessions(sessionList);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
        const errorMsg = err instanceof Error ? err.message : "Failed to fetch sessions";
        setError(errorMsg);
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [goosePath]);

  const getLastPrompt = (session: Session): string => {
    if (!session.messages || session.messages.length === 0) {
      // Log this case for debugging
      console.log(`Session ${session.id}: No messages found (messages=${session.messages})`);
      return "No messages";
    }

    // Find the last user message
    for (let i = session.messages.length - 1; i >= 0; i--) {
      const msg = session.messages[i];
      if (msg && msg.role === "user" && msg.content) {
        return msg.content.substring(0, 100) + (msg.content.length > 100 ? "..." : "");
      }
    }

    return `${session.messages.length} messages (no user messages)`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "Unknown";

    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const refreshSessions = async () => {
    if (!goosePath) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing sessions...",
    });

    try {
      const args = ["session", "list", "--format", "json"];
      const { stdout, stderr } = await execFileAsync(goosePath, args, { timeout: SESSION_COMMAND_TIMEOUT });

      if (stderr) {
        console.warn("Goose session list stderr:", stderr);

        if (stderr.includes("flag provided but not defined")) {
          throw new Error("Wrong Goose binary detected. Use 'Reset Binary Cache'.");
        }
      }

      let sessionList: Session[] = [];
      const trimmed = stdout.trim();

      if (trimmed) {
        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
          sessionList = parsed;
        } else if (parsed && typeof parsed === "object") {
          if (parsed.sessions && Array.isArray(parsed.sessions)) {
            sessionList = parsed.sessions;
          } else {
            sessionList = [parsed];
          }
        }
      }

      setSessions(sessionList);
      setError(null);

      toast.style = Toast.Style.Success;
      toast.title = "Sessions refreshed";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to refresh sessions";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    }
  };

  const handleResetCache = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Resetting binary cache...",
    });

    await clearGoosePathCache();

    toast.style = Toast.Style.Success;
    toast.title = "Binary cache cleared";
    toast.message = "Reload the command to detect the binary again";
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={refreshSessions} icon={Icon.Repeat} />
              <Action
                title="Reset Binary Cache"
                icon={Icon.Trash}
                onAction={handleResetCache}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {sessions.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.List}
          title="No Sessions Found"
          description="Start a new session with 'Ask Goose' command"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={refreshSessions} icon={Icon.Repeat} />
            </ActionPanel>
          }
        />
      ) : (
        sessions.map((session) => (
          <List.Item
            key={session.id}
            title={session.name || session.id}
            subtitle={getLastPrompt(session)}
            accessories={[
              {
                text: formatDate(session.updated_at || session.created_at),
                icon: Icon.Clock,
              },
              {
                tag: {
                  value: session.id.substring(0, 8),
                  color: Color.Blue,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Resume Session"
                  icon={Icon.Play}
                  target={
                    <ResumeSessionForm sessionId={session.id} goosePath={goosePath} onResume={refreshSessions} />
                  }
                />
                <Action.CopyToClipboard title="Copy Session ID" content={session.id} icon={Icon.Clipboard} />
                <Action
                  title="Refresh"
                  onAction={refreshSessions}
                  icon={Icon.Repeat}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Reset Binary Cache"
                  icon={Icon.Trash}
                  onAction={handleResetCache}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
