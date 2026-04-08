import { execFile, execFileSync, spawnSync } from "node:child_process";
import type { TmuxPane } from "../models/tmux.ts";

export type NewSessionInput = {
  name: string;
  cwd?: string;
};

export type NewWindowInput = {
  target: string;
  cwd?: string;
  command?: string[];
};

export type SplitWindowInput = {
  target: string;
  direction: "h" | "v";
  cwd?: string;
};

export type SendKeysInput = {
  target: string;
  keys: string;
};

export type RenameWindowInput = {
  target: string;
  name: string;
};

export type TmuxCli = {
  listPanes: () => Promise<TmuxPane[]>;
  newSession: (input: NewSessionInput) => Promise<string>;
  newWindow: (input: NewWindowInput) => Promise<void>;
  splitWindow: (input: SplitWindowInput) => Promise<void>;
  sendKeys: (input: SendKeysInput) => Promise<void>;
  capturePane: (target: string) => Promise<string>;
  selectPane: (target: string) => Promise<void>;
  selectWindow: (target: string) => Promise<void>;
  renameWindow: (input: RenameWindowInput) => Promise<void>;
  attachSession: (sessionName: string) => Promise<void>;
  killPane: (target: string) => Promise<void>;
  killSession: (sessionName: string) => Promise<void>;
  hasSession: (name: string) => Promise<boolean>;
};

const resolveTmuxPath = (): string => {
  try {
    return execFileSync("which", ["tmux"], { encoding: "utf-8" }).trim();
  } catch {
    return "tmux";
  }
};

const tmuxPath = resolveTmuxPath();

const DELIMITER = "\t";

const PANE_FORMAT = [
  "#{session_name}",
  "#{window_index}",
  "#{pane_index}",
  "#{pane_id}",
  "#{pane_current_path}",
  "#{pane_title}",
  "#{window_name}",
  "#{pane_active}",
  "#{pane_width}",
  "#{pane_height}",
].join(DELIMITER);

const execTmux = (args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    execFile(tmuxPath, args, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`tmux ${args[0]} failed: ${stderr || error.message}`));
        return;
      }
      resolve(stdout.trim());
    });
  });

const parsePaneLine = (line: string): TmuxPane | undefined => {
  const parts = line.split(DELIMITER);
  if (parts.length < 10) return undefined;
  return {
    sessionName: parts[0] ?? "",
    windowIndex: parseInt(parts[1] ?? "0", 10),
    paneIndex: parseInt(parts[2] ?? "0", 10),
    paneId: parts[3] ?? "",
    cwd: parts[4] ?? "",
    title: parts[5] ?? "",
    windowName: parts[6] ?? "",
    isActive: parts[7] === "1",
    paneWidth: parseInt(parts[8] ?? "0", 10),
    paneHeight: parseInt(parts[9] ?? "0", 10),
  };
};

export const createTmuxCli = (): TmuxCli => ({
  listPanes: async (): Promise<TmuxPane[]> => {
    try {
      const output = await execTmux(["list-panes", "-a", "-F", PANE_FORMAT]);
      if (!output) return [];
      return output
        .split("\n")
        .map(parsePaneLine)
        .filter((p): p is TmuxPane => p !== undefined);
    } catch {
      return [];
    }
  },

  newSession: async (input: NewSessionInput): Promise<string> => {
    const args = ["new-session", "-d", "-s", input.name, "-P", "-F", "#{session_name}"];
    if (input.cwd) {
      args.push("-c", input.cwd);
    }
    return await execTmux(args);
  },

  newWindow: async (input: NewWindowInput): Promise<void> => {
    const args = ["new-window", "-t", input.target];
    if (input.cwd) {
      args.push("-c", input.cwd);
    }
    if (input.command) {
      args.push(...input.command);
    }
    await execTmux(args);
  },

  splitWindow: async (input: SplitWindowInput): Promise<void> => {
    const flag = input.direction === "h" ? "-h" : "-v";
    const args = ["split-window", flag, "-t", input.target];
    if (input.cwd) {
      args.push("-c", input.cwd);
    }
    await execTmux(args);
  },

  sendKeys: async (input: SendKeysInput): Promise<void> => {
    await execTmux(["send-keys", "-t", input.target, input.keys, "Enter"]);
  },

  capturePane: async (target: string): Promise<string> => {
    return await execTmux(["capture-pane", "-t", target, "-p"]);
  },

  selectPane: async (target: string): Promise<void> => {
    await execTmux(["select-pane", "-t", target]);
  },

  selectWindow: async (target: string): Promise<void> => {
    await execTmux(["select-window", "-t", target]);
  },

  renameWindow: async (input: RenameWindowInput): Promise<void> => {
    await execTmux(["rename-window", "-t", input.target, input.name]);
  },

  attachSession: async (sessionName: string): Promise<void> => {
    spawnSync(tmuxPath, ["attach-session", "-t", sessionName], {
      stdio: "inherit",
    });
  },

  killPane: async (target: string): Promise<void> => {
    await execTmux(["kill-pane", "-t", target]);
  },

  killSession: async (sessionName: string): Promise<void> => {
    await execTmux(["kill-session", "-t", sessionName]);
  },

  hasSession: async (name: string): Promise<boolean> => {
    try {
      await execTmux(["has-session", "-t", name]);
      return true;
    } catch {
      return false;
    }
  },
});
