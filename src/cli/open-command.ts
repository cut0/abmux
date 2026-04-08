import { basename } from "node:path";
import type { Infra } from "../infra/index.ts";

type OpenCommandDeps = {
  infra: Pick<Infra, "tmuxCli">;
};

export const createOpenCommand = ({ infra }: OpenCommandDeps) =>
  async (args: string[]): Promise<void> => {
    const session = args[0] ?? basename(process.cwd());

    const exists = await infra.tmuxCli.hasSession(session);
    if (!exists) {
      console.error(`Session "${session}" not found.`);
      process.exit(1);
    }

    await infra.tmuxCli.attachSession(session);
  };
