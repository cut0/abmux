import { basename } from "node:path";
import { parseArgs } from "node:util";
import type { Usecases } from "../usecases/index.ts";

type NewCommandDeps = {
  usecases: Pick<Usecases, "manager">;
};

export const createNewCommand =
  ({ usecases }: NewCommandDeps) =>
  async (args: string[]): Promise<void> => {
    const { values, positionals } = parseArgs({
      args,
      options: {
        dir: { type: "string" },
        worktree: { type: "boolean", default: false },
      },
      allowPositionals: true,
    });

    const prompt = positionals[0];
    if (!prompt) {
      console.error("Usage: abmux new <prompt> [--dir <path>] [--worktree]");
      process.exit(1);
    }

    const dir = values.dir ?? process.cwd();
    const sessionName = basename(dir);
    const worktree = values.worktree ?? false;

    await usecases.manager.createSession({ sessionName, cwd: dir, prompt, worktree });
    console.log(`Session "${sessionName}" created.`);
  };
