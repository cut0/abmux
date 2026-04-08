import type { ServiceContext } from "./index.ts";
import type { TmuxPane } from "../models/tmux.ts";

export type CreateNewWindowInput = {
  target: string;
  cwd?: string;
};

export type SplitWindowServiceInput = {
  target: string;
  direction: "h" | "v";
  cwd?: string;
};

export type SendCommandInput = {
  target: string;
  command: string;
};

export type SendKeysServiceInput = {
  target: string;
  keys: string;
};

export type RenameWindowServiceInput = {
  target: string;
  name: string;
};

export type TmuxService = {
  listPanes: () => Promise<TmuxPane[]>;
  createNewWindow: (input: CreateNewWindowInput) => Promise<void>;
  splitWindow: (input: SplitWindowServiceInput) => Promise<void>;
  sendCommand: (input: SendCommandInput) => Promise<void>;
  sendKeys: (input: SendKeysServiceInput) => Promise<void>;
  attachSession: (sessionName: string) => Promise<void>;
  killPane: (target: string) => Promise<void>;
  killSession: (sessionName: string) => Promise<void>;
  renameWindow: (input: RenameWindowServiceInput) => Promise<void>;
  getText: (target: string) => Promise<string>;
};

export const createTmuxService = (context: ServiceContext): TmuxService => {
  const { tmuxCli } = context.infra;

  return {
    listPanes: async (): Promise<TmuxPane[]> => {
      return await tmuxCli.listPanes();
    },

    createNewWindow: async (input: CreateNewWindowInput): Promise<void> => {
      await tmuxCli.newWindow({ target: input.target, cwd: input.cwd });
    },

    splitWindow: async (input: SplitWindowServiceInput): Promise<void> => {
      await tmuxCli.splitWindow({
        target: input.target,
        direction: input.direction,
        cwd: input.cwd,
      });
    },

    sendCommand: async (input: SendCommandInput): Promise<void> => {
      await tmuxCli.sendKeys({
        target: input.target,
        keys: input.command,
      });
    },

    sendKeys: async (input: SendKeysServiceInput): Promise<void> => {
      await tmuxCli.sendKeys({
        target: input.target,
        keys: input.keys,
      });
    },

    attachSession: async (sessionName: string): Promise<void> => {
      await tmuxCli.attachSession(sessionName);
    },

    killPane: async (target: string): Promise<void> => {
      await tmuxCli.killPane(target);
    },

    killSession: async (sessionName: string): Promise<void> => {
      await tmuxCli.killSession(sessionName);
    },

    renameWindow: async (input: RenameWindowServiceInput): Promise<void> => {
      await tmuxCli.renameWindow({ target: input.target, name: input.name });
    },

    getText: async (target: string): Promise<string> => {
      return await tmuxCli.capturePane(target);
    },
  };
};
