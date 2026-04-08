# abmux

AI Board on tmux — A terminal UI for managing Claude Code sessions on tmux.

## Features

- Manage tmux sessions grouped by project
- Detect Claude session status: waiting for input, thinking, running tools, idle
- Launch new Claude Code sessions with prompts via your `$EDITOR`
- Fuzzy search directories to add new sessions
- CLI commands for scripting: `new`, `open`, `kill`, `list`

## Requirements

- Node.js >= 24
- pnpm >= 10
- [tmux](https://github.com/tmux/tmux)

## Install

```sh
npm install -g abmux
# or
yarn global add abmux
# or
pnpm add -g abmux
```

## Usage

```sh
abmux                              # Start TUI
abmux new <prompt> [--dir <path>]  # Create session and launch Claude
abmux open [session]               # Attach to session
abmux kill [session]               # Kill session
abmux list                         # List sessions
abmux --help                       # Show help
```

## Development

```sh
pnpm install
pnpm start        # Run in development mode (tsx)
pnpm test         # Run tests with Vitest
pnpm typecheck    # Type check without emitting
pnpm lint:check   # Lint with oxlint
pnpm format:check # Check formatting with oxfmt
pnpm build        # Bundle with esbuild
```

## License

MIT
