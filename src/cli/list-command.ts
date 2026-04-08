import type { Usecases } from "../usecases/index.ts";

type ListCommandDeps = {
  usecases: Pick<Usecases, "manager">;
};

export const createListCommand =
  ({ usecases }: ListCommandDeps) =>
  async (): Promise<void> => {
    const result = await usecases.manager.list();

    if (result.sessionGroups.length === 0) {
      console.log("No sessions found.");
      return;
    }

    const lines = result.sessionGroups.map((group) => {
      const paneCount = group.tabs.reduce((sum, t) => sum + t.panes.length, 0);
      return `${group.sessionName} (${String(paneCount)} panes)`;
    });
    console.log(lines.join("\n"));
  };
