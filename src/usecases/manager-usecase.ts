import type { SessionGroup, UnifiedPane } from "../models/session.ts";
import type { UsecaseContext } from "./index.ts";
import { escapeShellArg } from "../utils/ShellUtils.ts";

export type ManagerListOutput = {
  sessionGroups: SessionGroup[];
};

export type CreateSessionInput = {
  sessionName: string;
  cwd: string;
  prompt: string;
};

export type ManagerUsecase = {
  createSession: (input: CreateSessionInput) => Promise<void>;
  list: () => Promise<ManagerListOutput>;
  enrichStatus: (up: UnifiedPane) => Promise<UnifiedPane>;
  navigateTo: (up: UnifiedPane) => Promise<void>;
  highlightWindow: (up: UnifiedPane) => Promise<void>;
  unhighlightWindow: (up: UnifiedPane) => Promise<void>;
  killPane: (paneId: string) => Promise<void>;
  killSession: (sessionName: string) => Promise<void>;
};

export const createManagerUsecase = (context: UsecaseContext): ManagerUsecase => {
  const { tmux, sessionDetection } = context.services;

  const windowTarget = (up: UnifiedPane): string =>
    `${up.pane.sessionName}:${String(up.pane.windowIndex)}`;

  return {
    createSession: async ({ sessionName, cwd, prompt }: CreateSessionInput): Promise<void> => {
      const exists = await context.infra.tmuxCli.hasSession(sessionName);
      if (!exists) {
        await context.infra.tmuxCli.newSession({ name: sessionName, cwd });
      } else {
        await context.infra.tmuxCli.newWindow({ target: sessionName, cwd });
      }
      const panes = await context.infra.tmuxCli.listPanes();
      const sessionPanes = panes
        .filter((p) => p.sessionName === sessionName)
        .toSorted((a, b) => b.windowIndex - a.windowIndex || b.paneIndex - a.paneIndex);
      const target = sessionPanes[0]?.paneId;
      if (!target) return;
      const escapedPrompt = escapeShellArg(prompt);
      await tmux.sendCommand({ target, command: `claude -w -- ${escapedPrompt}` });
    },

    list: async (): Promise<ManagerListOutput> => {
      const panes = await tmux.listPanes();
      const sessionGroups = sessionDetection.groupBySession({ panes });
      return { sessionGroups };
    },

    enrichStatus: async (up: UnifiedPane): Promise<UnifiedPane> => {
      if (up.kind !== "claude") return up;
      try {
        const paneText = await tmux.getText(up.pane.paneId);
        const status = sessionDetection.detectStatusFromText(paneText);
        return { ...up, claudeStatus: status };
      } catch {
        return up;
      }
    },

    navigateTo: async (up: UnifiedPane): Promise<void> => {
      await tmux.attachSession(up.pane.sessionName);
    },

    highlightWindow: async (up: UnifiedPane): Promise<void> => {
      const title = up.claudeTitle ?? up.pane.title;
      await tmux.renameWindow({
        target: windowTarget(up),
        name: `\u25B6 ${title}`,
      });
    },

    unhighlightWindow: async (up: UnifiedPane): Promise<void> => {
      await tmux.renameWindow({
        target: windowTarget(up),
        name: "",
      });
    },

    killPane: async (paneId: string): Promise<void> => {
      await tmux.killPane(paneId);
    },

    killSession: async (sessionName: string): Promise<void> => {
      await tmux.killSession(sessionName);
    },
  };
};
