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

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the extension
npm run build

# Lint and fix code
npm run fix-lint
```

## License

MIT