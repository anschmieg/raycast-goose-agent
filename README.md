# Goose Bridge

A Raycast extension that provides a GUI bridge for the [Goose CLI Agent](https://github.com/square/goose).

## Features

### Ask Goose Command
- **Real-time streaming**: See Goose's thoughts and tool calls as they happen
- **Voice feedback**: Hear the final output using macOS `say` command
- **Kill switch**: Stop runaway Goose processes with Cmd+K
- **Deeplink support**: Integrate with other tools using Raycast deeplinks

### Session Management
- **List sessions**: View all your previous Goose interactions
- **Resume sessions**: Continue previous conversations with new input
- **Session metadata**: See session IDs, dates, and last prompts

## Prerequisites

Goose must be installed on your system. Install it via:

```bash
pip install goose-ai
```

The extension will automatically detect Goose in these locations:
- `/usr/local/bin/goose`
- `/opt/homebrew/bin/goose`
- `/usr/bin/goose`
- Or anywhere in your `PATH`

## Usage

### Ask Goose
1. Open Raycast (Cmd+Space or your configured hotkey)
2. Type "Ask Goose"
3. Enter your query
4. Watch as Goose processes your request in real-time
5. Hear the final output spoken aloud

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
1. While in the "Ask Goose" view, press Cmd+K
2. Or select "Stop Goose" from the action panel

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