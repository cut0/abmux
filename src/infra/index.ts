import { createTmuxCli, type TmuxCli } from "./tmux-cli.ts";
import { createEditor, type Editor } from "./editor.ts";
import { createClaudeCli, type ClaudeCli } from "./claude-cli.ts";

export type Infra = {
  tmuxCli: TmuxCli;
  editor: Editor;
  claudeCli: ClaudeCli;
};

export const createInfra = (): Infra => ({
  tmuxCli: createTmuxCli(),
  editor: createEditor(),
  claudeCli: createClaudeCli(),
});
