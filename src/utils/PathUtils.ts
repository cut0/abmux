export const formatCwd = (cwd: string): string => {
  const home = process.env["HOME"] ?? "";
  if (home && cwd.startsWith(home)) {
    return `~${cwd.slice(home.length)}`;
  }
  return cwd;
};

export const findMatchingDirectory = (path: string, directories: string[]): string | undefined => {
  let matched: string | undefined;
  for (const dir of directories) {
    if (path === dir || path.startsWith(dir + "/")) {
      if (!matched || dir.length > matched.length) {
        matched = dir;
      }
    }
  }
  return matched;
};
