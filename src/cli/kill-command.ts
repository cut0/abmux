import { basename } from "node:path";
import type { Usecases } from "../usecases/index.ts";

type KillCommandDeps = {
  usecases: Pick<Usecases, "manager">;
};

export const createKillCommand = ({ usecases }: KillCommandDeps) =>
  async (args: string[]): Promise<void> => {
    const session = args[0] ?? basename(process.cwd());

    await usecases.manager.killSession(session);
    console.log(`Session "${session}" killed.`);
  };
