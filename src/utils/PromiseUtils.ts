export const swallow = async (fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
  } catch {}
};
