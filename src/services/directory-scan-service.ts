import { readdir, access } from "node:fs/promises";
import { join } from "node:path";

export type DirectoryScanService = {
  scan: () => Promise<string[]>;
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  ".cache",
  ".pnpm-store",
  ".Trash",
  "Library",
  "Applications",
  ".claude",
]);

const MAX_DEPTH = 5;

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const findProjects = async (dir: string, depth: number): Promise<string[]> => {
  if (depth > MAX_DEPTH) return [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const dirs = entries.filter(
      (e) => e.isDirectory() && !e.name.startsWith(".") && !SKIP_DIRS.has(e.name),
    );

    const childScans = dirs.map((entry) => {
      const fullPath = join(dir, entry.name);
      return exists(join(fullPath, ".git")).then(async (isProject) => {
        if (isProject) return [fullPath];
        return await findProjects(fullPath, depth + 1);
      });
    });

    const nested = await Promise.all(childScans);
    return nested.flat();
  } catch {
    return [];
  }
};

export const createDirectoryScanService = (): DirectoryScanService => ({
  scan: async (): Promise<string[]> => {
    const home = process.env["HOME"] ?? "";
    if (!home) return [];

    const results = await findProjects(home, 0);
    return results.toSorted((a, b) => a.localeCompare(b));
  },
});
