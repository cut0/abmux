import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useMemo, useState, type FC } from "react";
import type { ManagedSession } from "../../models/session.ts";
import { useScroll } from "../../hooks/use-scroll.ts";
import { formatCwd } from "../../utils/PathUtils.ts";

type Props = {
  sessions: ManagedSession[];
  currentSession: string;
  isFocused: boolean;
  availableRows: number;
  onSelect: (name: string) => void;
  onCursorChange: (name: string) => void;
  onDeleteSession?: (name: string) => void;
  onAddSession?: () => void;
  cursorRef?: { current: number };
};

export const sortSessions = (
  sessions: ManagedSession[],
  currentSession: string,
): ManagedSession[] => {
  const current = sessions.filter((s) => s.name === currentSession);
  const rest = sessions.filter((s) => s.name !== currentSession);
  return [...current, ...rest];
};

export const SessionListPanel: FC<Props> = ({
  sessions,
  currentSession,
  isFocused,
  availableRows,
  onSelect,
  onCursorChange,
  onDeleteSession,
  onAddSession,
  cursorRef,
}) => {
  const { exit } = useApp();
  const [cursor, setCursor] = useState(cursorRef?.current ?? 0);

  const sortedSessions = useMemo(
    () => sortSessions(sessions, currentSession),
    [sessions, currentSession],
  );

  const names = useMemo(() => sortedSessions.map((s) => s.name), [sortedSessions]);

  const clampedCursor = cursor >= names.length ? Math.max(0, names.length - 1) : cursor;
  if (clampedCursor !== cursor) {
    setCursor(clampedCursor);
  }
  if (cursorRef) cursorRef.current = clampedCursor;

  const reservedLines = 1;
  const { scrollOffset, visibleCount } = useScroll(
    clampedCursor,
    names.length,
    availableRows - reservedLines,
  );
  const visibleSessions = sortedSessions.slice(scrollOffset, scrollOffset + visibleCount);

  const moveCursor = useCallback(
    (next: number): void => {
      const clamped = Math.max(0, Math.min(names.length - 1, next));
      setCursor(clamped);
      const name = names[clamped];
      if (name) onCursorChange(name);
    },
    [names, onCursorChange],
  );

  useInput(
    (input, key) => {
      if (input === "q") {
        exit();
        return;
      }

      if (key.upArrow) {
        moveCursor(clampedCursor - 1);
        return;
      }

      if (key.downArrow) {
        moveCursor(clampedCursor + 1);
        return;
      }

      if (key.return || key.rightArrow) {
        const name = names[clampedCursor];
        if (name) onSelect(name);
        return;
      }

      if (input === "d" && onDeleteSession) {
        const name = names[clampedCursor];
        if (name) onDeleteSession(name);
        return;
      }

      if (input === "n" && onAddSession) {
        onAddSession();
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1}>
        <Text bold color={isFocused ? "green" : "gray"}>
          Sessions
        </Text>
        <Text dimColor>
          {" "}
          ({clampedCursor + 1}/{names.length})
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleSessions.map((session, i) => {
          const globalIndex = scrollOffset + i;
          const isHighlighted = globalIndex === clampedCursor;
          const isCurrent = session.name === currentSession;
          return (
            <Box key={session.name} paddingLeft={1} gap={1}>
              <Text color={isHighlighted ? "green" : undefined}>
                {isHighlighted ? "\u25B6" : " "}
              </Text>
              <Text color={isHighlighted ? "green" : "cyan"} bold={isHighlighted} wrap="truncate">
                {session.path ? formatCwd(session.path) : session.name}
              </Text>
              {isCurrent && <Text color="yellow">(cwd)</Text>}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
