import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export type Editor = {
  open: () => string | undefined;
};

export const createEditor = (): Editor => ({
  open: (): string | undefined => {
    const dir = mkdtempSync(join(tmpdir(), "abmux-"));
    const filePath = join(dir, "PROMPT.md");
    writeFileSync(filePath, "", "utf-8");

    const editor = process.env["EDITOR"] ?? "vim";
    const result = spawnSync(editor, [filePath], {
      stdio: "inherit",
    });

    if (result.status !== 0) return undefined;

    try {
      const content = readFileSync(filePath, "utf-8").trim();
      unlinkSync(filePath);
      return content || undefined;
    } catch {
      return undefined;
    }
  },
});
