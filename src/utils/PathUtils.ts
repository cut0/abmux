export const formatCwd = (cwd: string): string => {
  const home = process.env["HOME"] ?? "";
  if (home && cwd.startsWith(home)) {
    return `~${cwd.slice(home.length)}`;
  }
  return cwd;
};

export const findMatchingDirectory = (path: string, directories: string[]): string | undefined =>
  directories
    .filter((dir) => path === dir || path.startsWith(dir + "/"))
    .reduce<string | undefined>(
      (best, dir) => (!best || dir.length > best.length ? dir : best),
      undefined,
    );
