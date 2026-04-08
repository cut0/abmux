# abmux

AI Board on tmux — A TUI for managing multiple Claude Code sessions from a single terminal screen.

Monitor, create, switch between, and delete Claude Code sessions running on tmux, all in one place.

## Requirements

- Node.js >= 24
- [tmux](https://github.com/tmux/tmux)

## Install

```sh
npm install -g abmux
# or
yarn global add abmux
# or
pnpm add -g abmux
# or
bun add -g abmux
```

## Getting Started

```sh
abmux
```

Run without arguments to launch the TUI.

CLI commands are also available for scripting:

```sh
abmux new <prompt> [--dir <path>]  # Create a session
abmux open [session]               # Attach to a session
abmux kill [session]               # Kill a session
abmux list                         # List sessions
```

## Screen Layout

The main screen is split into three panels:

```
+-----------------------+---------------------------------------+
| abmux - v0.0.x                                                |
+-----------------------+---------------------------------------+
|                       |                                       |
| Session List          | Pane List                             |
| (Left Panel)          | (Right Panel)                         |
|                       |                                       |
| > my-project (cwd)    |   * [thinking] Refactoring...  %5     |
|   other-project       |   * [running]  Fixing tests    %8     |
|                       |   o [idle]     Waiting         %12    |
|                       |   * vim                        %3     |
|                       |                                       |
+-----------------------+---------------------------------------+
|                                                               |
| Session Overview (Bottom Panel)                               |
| Summaries of what Claude is working on in each session        |
|                                                               |
+---------------------------------------------------------------+
| [keys] move / select / Tab / n / d / q       * 2 thinking     |
+---------------------------------------------------------------+
```

Press `Tab` to cycle focus: Left → Right → Bottom. The focused panel is highlighted with a green border.

## Panels

### Left Panel: Session List

Lists tmux sessions grouped by project directory. The session matching your current directory is marked with `(cwd)`.

| Key           | Action                              |
| ------------- | ----------------------------------- |
| `↑` / `↓`     | Move cursor                         |
| `Enter` / `→` | Select session, move to right panel |
| `n`           | Add session via directory search    |
| `d`           | Delete session                      |
| `q`           | Quit                                |

### Right Panel: Pane List

Shows all panes in the selected session. Claude Code panes display their status; other panes (editors, shells) are also listed.

| Key         | Action                          |
| ----------- | ------------------------------- |
| `↑` / `↓`   | Move cursor                     |
| `Enter`     | Attach to pane (switch to tmux) |
| `n`         | Create a new Claude session     |
| `v`         | Open session in `$EDITOR`       |
| `d`         | Kill pane                       |
| `Esc` / `←` | Back to left panel              |

### Bottom Panel: Session Overview

Displays AI-generated summaries of what Claude is doing in each session. Auto-refreshes every 60 seconds.

| Key         | Action             |
| ----------- | ------------------ |
| `↑` / `↓`   | Scroll             |
| `Tab`       | Next panel         |
| `Esc` / `←` | Back to left panel |

## Status Icons

The right panel and the status bar show Claude session states with these icons:

| Icon          | Status   | Meaning                   |
| ------------- | -------- | ------------------------- |
| `⠋` (braille) | thinking | Claude is reasoning       |
| `✳`           | running  | Executing a tool          |
| `❓`          | confirm  | Waiting for user approval |
| `❯`           | waiting  | Ready for input           |
| `○`           | idle     | Idle                      |

Non-Claude panes show `●` (busy) or `○` (available).

## Development

```sh
pnpm install
pnpm start        # Run in dev mode
pnpm test         # Run tests
pnpm typecheck    # Type check
pnpm lint:check   # Lint
pnpm format:check # Format check
pnpm build        # Bundle
```

## License

MIT
