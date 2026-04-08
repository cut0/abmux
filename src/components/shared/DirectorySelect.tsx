import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useMemo, useState, type FC } from "react";
import type { SessionGroup } from "../../models/session.ts";
import { useScroll } from "../../hooks/use-scroll.ts";

type Props = {
  sessionGroups: SessionGroup[];
  currentSession: string;
  isFocused: boolean;
  availableRows: number;
  onSelect: (name: string) => void;
  onCursorChange: (name: string) => void;
  onDeleteSession?: (name: string) => void;
  onAddSession?: () => void;
};

export const sortSessionGroups = (
  groups: SessionGroup[],
  currentSession: string,
): SessionGroup[] => {
  const current = groups.filter((g) => g.sessionName === currentSession);
  const rest = groups.filter((g) => g.sessionName !== currentSession);
  return [...current, ...rest];
};

export const SessionListPanel: FC<Props> = ({
  sessionGroups,
  currentSession,
  isFocused,
  availableRows,
  onSelect,
  onCursorChange,
  onDeleteSession,
  onAddSession,
}) => {
  const { exit } = useApp();
  const [cursor, setCursor] = useState(0);

  const sortedGroups = useMemo(
    () => sortSessionGroups(sessionGroups, currentSession),
    [sessionGroups, currentSession],
  );

  const sessions = useMemo(() => sortedGroups.map((g) => g.sessionName), [sortedGroups]);

  const clampedCursor = cursor >= sessions.length ? Math.max(0, sessions.length - 1) : cursor;
  if (clampedCursor !== cursor) {
    setCursor(clampedCursor);
  }

  const reservedLines = 1;
  const { scrollOffset, visibleCount } = useScroll(
    clampedCursor,
    sessions.length,
    availableRows - reservedLines,
  );
  const visibleSessions = sessions.slice(scrollOffset, scrollOffset + visibleCount);

  const moveCursor = useCallback(
    (next: number): void => {
      const clamped = Math.max(0, Math.min(sessions.length - 1, next));
      setCursor(clamped);
      const name = sessions[clamped];
      if (name) onCursorChange(name);
    },
    [sessions, onCursorChange],
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
        const name = sessions[clampedCursor];
        if (name) onSelect(name);
        return;
      }

      if (input === "d" && onDeleteSession) {
        const name = sessions[clampedCursor];
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
          ({clampedCursor + 1}/{sessions.length})
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleSessions.map((name, i) => {
          const globalIndex = scrollOffset + i;
          const isHighlighted = globalIndex === clampedCursor;
          const isCurrent = name === currentSession;
          return (
            <Box key={name} paddingLeft={1} gap={1}>
              <Text color={isHighlighted ? "green" : undefined}>
                {isHighlighted ? "\u25B6" : " "}
              </Text>
              <Text color={isHighlighted ? "green" : "cyan"} bold={isHighlighted} wrap="truncate">
                {name}
              </Text>
              {isCurrent && <Text color="yellow">(cwd)</Text>}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
