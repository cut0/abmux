import { useEffect, useRef } from "react";

export const useInterval = (fn: () => void, intervalMs: number, enabled = true): void => {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    fnRef.current();
    const timer = setInterval(() => {
      fnRef.current();
    }, intervalMs);
    return (): void => {
      clearInterval(timer);
    };
  }, [intervalMs, enabled]);
};
