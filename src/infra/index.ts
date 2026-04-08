import { createTmuxCli, type TmuxCli } from "./tmux-cli.ts";
import { createEditor, type Editor } from "./editor.ts";

export type Infra = {
  tmuxCli: TmuxCli;
  editor: Editor;
};

export const createInfra = (): Infra => ({
  tmuxCli: createTmuxCli(),
  editor: createEditor(),
});
