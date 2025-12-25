import { List, ActionPanel, Action, showToast, Toast, Icon, Color, Form } from "@raycast/api";
import { useState, useEffect } from "react";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { findGooseBinary } from "./utils";

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

function ResumeSessionForm({ sessionId, goosePath, onResume }: ResumeSessionProps) {
  const [input, setInput] = useState("");

  const handleSubmit = async () => {
    if (!input.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a message",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Resuming session...",
    });

    try {
      // Use spawn with args array to avoid shell interpretation issues
      const args = ["run", "--session-id", sessionId, "--resume", "--text", input];

      console.log(`Executing: ${goosePath} ${args.join(" ")}`);

      const gooseProcess = spawn(goosePath, args, {
        env: { ...process.env },
      });

      let stdoutData = "";
      let stderrData = "";

      gooseProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      gooseProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      gooseProcess.on("close", (code) => {
        if (code === 0) {
          toast.style = Toast.Style.Success;
          toast.title = "Session resumed";
          toast.message = "Check output for results";
          onResume();
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = `Failed with exit code ${code}`;
          toast.message = stderrData || "Check logs for details";
        }
      });

      gooseProcess.on("error", (err) => {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to start Goose";
        toast.message = err.message;
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to resume session";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Resume Session" onSubmit={handleSubmit} />
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

export default function Command() {
  const [goosePath, setGoosePath] = useState<string>("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Find goose binary on mount
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

        const { stdout, stderr } = await execFileAsync(goosePath, args);

        if (stderr) {
          console.warn("Goose session list stderr:", stderr);
        }

        // Parse the JSON output
        const parsed = JSON.parse(stdout.trim() || "[]");
        const sessionList = Array.isArray(parsed) ? parsed : [parsed];

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
      return "No messages";
    }

    // Find the last user message
    for (let i = session.messages.length - 1; i >= 0; i--) {
      const msg = session.messages[i];
      if (msg.role === "user") {
        return msg.content.substring(0, 100) + (msg.content.length > 100 ? "..." : "");
      }
    }

    return "No user messages";
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
      const { stdout, stderr } = await execFileAsync(goosePath, args);

      if (stderr) {
        console.warn("Goose session list stderr:", stderr);
      }

      const parsed = JSON.parse(stdout.trim() || "[]");
      const sessionList = Array.isArray(parsed) ? parsed : [parsed];

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

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={refreshSessions} />
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
                <Action.CopyToClipboard title="Copy Session ID" content={session.id} />
                <Action title="Refresh" onAction={refreshSessions} shortcut={{ modifiers: ["cmd"], key: "r" }} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
