import {
  PANE_KIND,
  SESSION_STATUS,
  type SessionGroup,
  type PaneKind,
  type SessionStatus,
  type TabGroup,
  type UnifiedPane,
} from "../models/session.ts";
import type { TmuxPane } from "../models/tmux.ts";

export type DetectInput = {
  panes: TmuxPane[];
};

export type SessionDetectionService = {
  groupBySession: (input: DetectInput) => SessionGroup[];
  detectStatusFromText: (paneText: string) => SessionStatus;
};

const BUSY_TITLES = new Set([
  "nvim",
  "vim",
  "vi",
  "node",
  "python",
  "python3",
  "ruby",
  "cargo",
  "go",
]);

const isClaudePrefix = (char: string): boolean => {
  if (char === "\u2733") return true;
  const code = char.charCodeAt(0);
  return code >= 0x2800 && code <= 0x28ff;
};

const classifyPane = (pane: TmuxPane): PaneKind => {
  const firstChar = pane.title.charAt(0);
  if (isClaudePrefix(firstChar)) return PANE_KIND.claude;
  if (BUSY_TITLES.has(pane.title)) return PANE_KIND.busy;
  return PANE_KIND.available;
};

const detectStatusFromTitle = (title: string): SessionStatus => {
  const firstChar = title.charAt(0);
  if (firstChar === "\u2733") return SESSION_STATUS.toolRunning;
  const code = firstChar.charCodeAt(0);
  if (code >= 0x2800 && code <= 0x28ff) return SESSION_STATUS.thinking;
  return SESSION_STATUS.idle;
};

export const detectStatusFromText = (paneText: string): SessionStatus => {
  const lines = paneText.split("\n");
  const lastLines = lines.slice(-20);
  const joined = lastLines.join("\n");

  if (/Do you want to proceed\?|Esc to cancel/.test(joined)) {
    return SESSION_STATUS.waitingConfirm;
  }

  if (/Running…/.test(joined)) {
    return SESSION_STATUS.toolRunning;
  }

  if (/ろーでぃんぐ…|Thinking|⏳/.test(joined)) {
    return SESSION_STATUS.thinking;
  }

  const trimmedLines = lastLines.map((l) => l.trim()).filter((l) => l.length > 0);
  const lastNonEmpty = trimmedLines[trimmedLines.length - 1] ?? "";

  if (/^❯\s*$/.test(lastNonEmpty) || /-- INSERT --/.test(joined)) {
    return SESSION_STATUS.waitingInput;
  }

  return SESSION_STATUS.idle;
};

const formatCwd = (cwd: string): string => {
  const home = process.env["HOME"] ?? "";
  if (home && cwd.startsWith(home)) {
    return `~${cwd.slice(home.length)}`;
  }
  return cwd;
};

const toUnifiedPane = (pane: TmuxPane): UnifiedPane => {
  const kind = classifyPane(pane);
  if (kind === PANE_KIND.claude) {
    return {
      pane,
      kind,
      claudeStatus: detectStatusFromTitle(pane.title),
      claudeTitle: pane.title.slice(2),
    };
  }
  return { pane, kind };
};

export const createSessionDetectionService = (): SessionDetectionService => ({
  groupBySession: ({ panes }: DetectInput): SessionGroup[] => {
    const windowKey = (pane: TmuxPane): string =>
      `${pane.sessionName}:${String(pane.windowIndex)}`;

    const windowMap = new Map<
      string,
      {
        sessionName: string;
        windowIndex: number;
        cwd: string;
        windowName: string;
        activePaneTitle: string;
        panes: UnifiedPane[];
      }
    >();

    for (const pane of panes) {
      const key = windowKey(pane);
      const unified = toUnifiedPane(pane);
      const existing = windowMap.get(key);
      if (existing) {
        existing.panes = [...existing.panes, unified];
        if (pane.isActive) {
          existing.activePaneTitle = pane.title;
        }
      } else {
        windowMap.set(key, {
          sessionName: pane.sessionName,
          windowIndex: pane.windowIndex,
          cwd: formatCwd(pane.cwd),
          windowName: pane.windowName,
          activePaneTitle: pane.isActive ? pane.title : "",
          panes: [unified],
        });
      }
    }

    const windowGroups: (TabGroup & { sessionName: string })[] = [...windowMap.entries()]
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([, group]) => ({
        windowIndex: group.windowIndex,
        windowName:
          group.windowName || group.activePaneTitle || `Window ${String(group.windowIndex)}`,
        sessionName: group.sessionName,
        panes: group.panes.toSorted((a, b) => {
          const kindOrder = { claude: 0, available: 1, busy: 2 } as const;
          const kindDiff = kindOrder[a.kind] - kindOrder[b.kind];
          if (kindDiff !== 0) return kindDiff;
          if (a.kind === "claude" && b.kind === "claude") {
            const statusOrder: Record<string, number> = {
              "waiting-confirm": 0,
              "waiting-input": 1,
              thinking: 2,
              "tool-running": 3,
              idle: 4,
            };
            const sa = statusOrder[a.claudeStatus ?? "idle"] ?? 4;
            const sb = statusOrder[b.claudeStatus ?? "idle"] ?? 4;
            if (sa !== sb) return sa - sb;
          }
          return a.pane.paneIndex - b.pane.paneIndex;
        }),
      }));

    const sessionMap = new Map<string, TabGroup[]>();
    for (const win of windowGroups) {
      const existing = sessionMap.get(win.sessionName);
      if (existing) {
        existing.push({
          windowIndex: win.windowIndex,
          windowName: win.windowName,
          panes: win.panes,
        });
      } else {
        sessionMap.set(win.sessionName, [
          { windowIndex: win.windowIndex, windowName: win.windowName, panes: win.panes },
        ]);
      }
    }

    return [...sessionMap.entries()].map(([sessionName, tabs]) => ({ sessionName, tabs }));
  },

  detectStatusFromText,
});
