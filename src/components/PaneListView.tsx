import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useMemo, useRef, useState, type FC } from "react";
import type { SessionGroup, UnifiedPane } from "../models/session.ts";
import { PaneItem } from "./sessions/PaneItem.tsx";
import { useScroll } from "../hooks/use-scroll.ts";

type Props = {
  selectedSession: string;
  group: SessionGroup;
  isFocused: boolean;
  availableRows: number;
  onNavigate: (up: UnifiedPane) => void;
  onHighlight: (up: UnifiedPane) => void;
  onUnhighlight: (up: UnifiedPane) => void;
  onBack: () => void;
  onNewSession: (sessionName: string) => void;
  onOpenEditor: (sessionName: string) => void;
  onKillPane: (paneId: string) => Promise<void>;
  cursorRef?: { current: number };
};

export const PaneListView: FC<Props> = ({
  selectedSession,
  group,
  isFocused,
  availableRows,
  onNavigate,
  onHighlight,
  onUnhighlight,
  onBack,
  onNewSession,
  onOpenEditor,
  onKillPane,
  cursorRef,
}) => {
  const { exit } = useApp();
  const [cursor, setCursor] = useState(cursorRef?.current ?? 0);
  const highlightedRef = useRef<UnifiedPane | undefined>(undefined);

  const panes = useMemo(() => group.tabs.flatMap((t) => t.panes), [group]);

  const clampedCursor = cursor >= panes.length ? Math.max(0, panes.length - 1) : cursor;
  if (clampedCursor !== cursor) {
    setCursor(clampedCursor);
  }
  if (cursorRef) cursorRef.current = clampedCursor;

  const reservedLines = 1;
  const { scrollOffset, visibleCount } = useScroll(
    clampedCursor,
    panes.length,
    availableRows - reservedLines,
  );
  const visiblePanes = useMemo(
    () => panes.slice(scrollOffset, scrollOffset + visibleCount),
    [panes, scrollOffset, visibleCount],
  );

  const highlight = useCallback(
    (up: UnifiedPane | undefined): void => {
      const prev = highlightedRef.current;
      if (prev && prev !== up) onUnhighlight(prev);
      if (up) onHighlight(up);
      highlightedRef.current = up;
    },
    [onHighlight, onUnhighlight],
  );

  const clearHighlight = useCallback((): void => {
    const prev = highlightedRef.current;
    if (prev) onUnhighlight(prev);
    highlightedRef.current = undefined;
  }, [onUnhighlight]);

  const moveCursor = useCallback(
    (next: number): void => {
      const clamped = Math.max(0, Math.min(panes.length - 1, next));
      setCursor(clamped);
      highlight(panes[clamped]);
    },
    [panes, highlight],
  );

  const didInitRef = useRef(false);
  if (!didInitRef.current && panes.length > 0) {
    didInitRef.current = true;
    highlight(panes[clampedCursor]);
  }

  useInput(
    (input, key) => {
      if (input === "q") {
        clearHighlight();
        exit();
        return;
      }

      if (key.escape || key.leftArrow) {
        clearHighlight();
        onBack();
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

      if (input === "d") {
        const pane = panes[clampedCursor];
        if (pane) {
          void onKillPane(pane.pane.paneId);
        }
        return;
      }

      if (input === "n") {
        onNewSession(selectedSession);
        return;
      }

      if (input === "v") {
        onOpenEditor(selectedSession);
        return;
      }

      if (key.return) {
        const pane = panes[clampedCursor];
        if (pane) onNavigate(pane);
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1}>
        <Text bold color={isFocused ? "green" : "gray"}>
          Panes
        </Text>
        <Text dimColor>
          {" "}
          {selectedSession} ({panes.length > 0 ? clampedCursor + 1 : 0}/{panes.length})
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {panes.length === 0 ? (
          <Box paddingLeft={1}>
            <Text dimColor>No panes. Press n or v to create.</Text>
          </Box>
        ) : (
          visiblePanes.map((up, i) => (
            <PaneItem
              key={up.pane.paneId}
              unifiedPane={up}
              isHighlighted={scrollOffset + i === clampedCursor}
            />
          ))
        )}
      </Box>
    </Box>
  );
};
