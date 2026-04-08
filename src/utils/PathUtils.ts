export const formatCwd = (cwd: string): string => {
  const home = process.env["HOME"] ?? "";
  if (home && cwd.startsWith(home)) {
    return `~${cwd.slice(home.length)}`;
  }
  return cwd;
};
