# Goose Bridge

A Raycast extension that provides a GUI bridge for the [Goose CLI Agent](https://github.com/square/goose).

## Features

### Ask Goose Command
- **Form-based input**: Type your question directly in the Raycast interface (or use deeplinks)
- **Real-time streaming**: See Goose's thoughts and tool calls as they happen
- **Voice feedback**: Hear the final output using macOS `say` command
- **Kill switch**: Stop runaway Goose processes with Cmd+Shift+X
- **Deeplink support**: Integrate with other tools using Raycast deeplinks
- **Comprehensive diagnostics**: See the exact command being run and all output (stdout/stderr)

### Session Management
- **List sessions**: View all your previous Goose interactions
- **Resume sessions**: Continue previous conversations with new input
- **Session metadata**: See session IDs, dates, and last prompts

### Configuration
- **Auto-detection**: Automatically finds the pip-installed Goose binary
- **Custom path**: Configure a custom Goose binary path in preferences
- **Binary validation**: Ensures you're using the AI agent, not the Go migration tool

## Prerequisites

Goose must be installed on your system. Install it via:

```bash
pip install goose-ai
```

The extension will automatically detect Goose in these locations (in order of preference):
- `$HOME/.local/bin/goose` (common pip user install)
- `$HOME/Library/Python/3.11/bin/goose` (macOS pip user install, Python 3.11)
- `$HOME/Library/Python/3.10/bin/goose` (macOS pip user install, Python 3.10)
- `$HOME/Library/Python/3.9/bin/goose` (macOS pip user install, Python 3.9)
- `/opt/homebrew/bin/goose` (Homebrew on Apple Silicon)
- `/usr/local/bin/goose` (Homebrew on Intel or system install)
- `/usr/bin/goose` (system install)
- `goose` in your `PATH`

**Note:** The extension validates each binary to ensure it responds to `--version` properly.

## Usage

### Ask Goose
1. Open Raycast (Cmd+Space or your configured hotkey)
2. Type "Ask Goose"
3. Enter your query in the form
4. Watch as Goose processes your request in real-time
5. Hear the final output spoken aloud

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
4. Select a session and choose "Resume Session" to continue the conversation

### Stop Goose
If Goose gets stuck in a loop or you want to interrupt it:
1. While in the "Ask Goose" result view, press Cmd+Shift+X
2. Or select "Stop Goose" from the action panel

### Custom Binary Path
If Goose is installed in a non-standard location:
1. Open Raycast Settings (⌘,)
2. Go to Extensions → Goose Bridge
3. Set the "Custom Goose Path" preference
4. The extension will use this path first

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