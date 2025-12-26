# Goose Bridge

A Raycast extension that provides a GUI bridge for the [Goose CLI Agent](https://github.com/square/goose).

## Features

### Ask Goose Command
- **Form-based input**: Type your question directly in the Raycast interface (or use deeplinks)
- **Real-time streaming**: See Goose's thoughts and tool calls as they happen
- **Toggleable voice feedback**: Optionally hear the final output using macOS `say` command
- **Intelligent error messages**: Friendly explanations for common issues (DB conflicts, missing models, etc.)
- **Kill switch**: Stop runaway Goose processes with Cmd+Shift+X
- **Deeplink support**: Integrate with other tools using Raycast deeplinks
- **Comprehensive diagnostics**: See the exact command being run and all output (stdout/stderr)
- **Fast startup**: Binary path is cached after first detection

### Session Management
- **List sessions**: View all your previous Goose interactions
- **Resume sessions**: Continue previous conversations with new input via a dedicated form
- **Session metadata**: See session IDs, dates, and last prompts
- **Robust parsing**: Handles various session JSON formats
- **Live output**: See real-time output when resuming sessions

### Configuration
- **Smart auto-detection**: Automatically finds the pip-installed Goose binary (not the Go migration tool)
- **Binary caching**: Validated binary path is cached for instant subsequent startups
- **Custom path**: Configure a custom Goose binary path in preferences
- **Binary validation**: Probes with 'session list' command to ensure it's the AI agent
- **Reset cache**: Clear cached binary path with Cmd+Shift+R when needed
- **Voice toggle**: Enable/disable voice output in preferences (default: enabled)

## Prerequisites

Goose must be installed on your system. Install it via:

```bash
pip install goose-ai
```

The extension will automatically detect Goose in these locations (in order of preference):
- `$HOME/.local/bin/goose` (common pip user install)
- `$HOME/Library/Python/3.12/bin/goose` (macOS pip user install, Python 3.12)
- `$HOME/Library/Python/3.11/bin/goose` (macOS pip user install, Python 3.11)
- `$HOME/Library/Python/3.10/bin/goose` (macOS pip user install, Python 3.10)
- `$HOME/Library/Python/3.9/bin/goose` (macOS pip user install, Python 3.9)
- `/opt/homebrew/bin/goose` (Homebrew on Apple Silicon)
- `/usr/local/bin/goose` (Homebrew on Intel or system install)
- `/usr/bin/goose` (system install)
- `goose` in your `PATH`

**Note:** The extension validates each binary by probing with the `session list` command to distinguish the Goose AI agent from the Go database migration tool with the same name. The validated path is cached for fast subsequent startups.

## Usage

### Ask Goose
1. Open Raycast (Cmd+Space or your configured hotkey)
2. Type "Ask Goose"
3. Enter your query in the form and press Enter or click "Ask Goose"
4. Watch as Goose processes your request in real-time
5. Optionally hear the final output spoken aloud (if voice output is enabled)

**Or use a deeplink:**
- Provide the query as an argument via deeplink (see below)
- The result will appear immediately without showing the form

### Deeplink Integration

You can trigger Goose from other apps using the deeplink format:

```
raycast://extensions/local/goose-bridge/index?arguments={"query":"Your question here"}
```

This is particularly useful for integration with voice assistants like Spokenly.

### List Sessions
1. Open Raycast
2. Type "List Sessions"
3. Browse your previous Goose sessions
4. Select a session and choose "Resume Session"
5. Enter your message in the form and press Enter or click "Resume Session"
6. Watch the session resume with real-time output

### Common Actions

**Stop Goose**
If Goose gets stuck in a loop or you want to interrupt it:
- While viewing output, press Cmd+Shift+X
- Or select "Stop Goose" from the action panel

**Reset Binary Cache**
If the wrong binary was detected or you've updated Goose:
- Press Cmd+Shift+R in any view
- Or select "Reset Binary Cache" from the action panel
- Then reload the command to re-detect the binary

**Toggle Voice Output**
To enable or disable voice feedback:
1. Open Raycast Settings (⌘,)
2. Go to Extensions → Goose Bridge
3. Toggle "Enable Voice Output" preference

### Custom Binary Path
If Goose is installed in a non-standard location:
1. Open Raycast Settings (⌘,)
2. Go to Extensions → Goose Bridge
3. Set the "Custom Goose Path" preference
4. The extension will use and validate this path first

## Troubleshooting

### "Wrong binary detected" error
If you see "flag provided but not defined" errors, the extension found the Go database migration tool instead of the Goose AI agent:

1. Install the correct Goose: `pip install goose-ai`
2. Press Cmd+Shift+R to reset the binary cache
3. Reload the command

### "Table schema_version already exists" error
This is a database migration conflict. To fix:

1. Delete the Goose database: `rm ~/.config/goose/goose.db`
2. Run your query again

### "No endpoints found" or 404 errors
The configured AI model is unavailable:

1. Check your Goose configuration file
2. Update to a different model that's currently available
3. See the Goose AI documentation for supported models

### Session resume panics (exit code 101)
If resuming a session causes a panic with "NotConnected" or similar errors:

This has been fixed in the latest version by using stdin pipe for non-interactive input. If you still see this:

1. Ensure you're using the latest version of this extension
2. Check the RUST_BACKTRACE diagnostics in the error output
3. Try starting a fresh session instead of resuming
4. Check Goose logs for more details

### Sessions show "No messages"
**Note**: The `goose session list` command doesn't include message content in its JSON output - it only returns metadata like session name, timestamps, and working directory.

The extension now displays the session name (e.g., "User greeting session") instead of "No messages" to provide more meaningful context. If you see "User session" or "Session" as the subtitle, this means:
- The session list was fetched successfully
- The session doesn't have a custom name set
- Message content is not available via the list command

To view actual session content, use the "Resume Session" action which will show the full conversation history when you send a new message.

## Installation & Setup

### For End Users

This extension is not yet published to the Raycast Store. To use it, you'll need to import it as a local extension:

1. Clone this repository:
   ```bash
   git clone https://github.com/anschmieg/raycast-goose-agent.git
   cd raycast-goose-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Open Raycast and run the "Import Extension" command (or use the Raycast Store → `⌘,` → Extensions → `+` → Import Extension)

4. Select the `raycast-goose-agent` directory

5. Raycast will build and install the extension automatically

### For Developers

```bash
# Install dependencies
npm install

# Run in development mode (opens in Raycast)
npm run dev

# Build the extension
npm run build

# Lint and fix code
npm run fix-lint
```

**Note:** After pulling updates from git, you may need to reload the extension in Raycast:
- Open Raycast Settings (⌘,)
- Go to Extensions
- Find "Goose Bridge" and click the reload icon
- Or use the "Reload Extension" command in Raycast

## License

MIT