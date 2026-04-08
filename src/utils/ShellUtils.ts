export const escapeShellArg = (arg: string): string => {
  if (arg === "") return "''";
  return `'${arg.replace(/'/g, "'\\''")}'`;
};
