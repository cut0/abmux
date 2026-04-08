import { Spinner } from "@inkjs/ui";
import { Box, Text, useApp, useInput } from "ink";
import { useCallback, useMemo, useState, type FC } from "react";
import type { SessionSummaryItem } from "../models/claude-session.ts";
import type { SessionGroup } from "../models/session.ts";
import { SESSION_STATUS_COLOR, SESSION_STATUS_LABEL } from "../models/session.ts";
import { useScroll } from "../hooks/use-scroll.ts";

type Props = {
  overallSummary: string;
  items: SessionSummaryItem[];
  groups: SessionGroup[];
  isLoading: boolean;
  isFocused: boolean;
  availableRows: number;
  onBack: () => void;
};

type OverviewLine = {
  key: string;
  type: "spacer" | "summary" | "session" | "pane";
  text?: string;
  sessionName?: string;
  statusLabel?: string;
  statusColor?: string;
  description?: string;
};

export const SessionOverviewPanel: FC<Props> = ({
  overallSummary,
  items,
  groups,
  isLoading,
  isFocused,
  availableRows,
  onBack,
}) => {
  const { exit } = useApp();
  const [cursor, setCursor] = useState(0);

  const lines = useMemo((): OverviewLine[] => {
    const summaryLines: OverviewLine[] = overallSummary
      ? [
          { key: "summary", type: "summary", text: overallSummary },
          { key: "spacer:summary", type: "spacer" },
        ]
      : [];

    const sessionLines = items.flatMap((item, idx): OverviewLine[] => {
      const group = groups.find((g) => g.sessionName === item.sessionName);
      const allPanes = group?.tabs.flatMap((t) => t.panes) ?? [];

      const paneLines = item.panes.map((paneSummary): OverviewLine => {
        const matched = allPanes.find(
          (p) => (p.claudeTitle ?? p.pane.title) === paneSummary.paneTitle,
        );
        const statusLabel = matched?.claudeStatus
          ? SESSION_STATUS_LABEL[matched.claudeStatus]
          : undefined;
        const statusColor = matched?.claudeStatus
          ? SESSION_STATUS_COLOR[matched.claudeStatus]
          : undefined;
        return {
          key: `p:${item.sessionName}:${paneSummary.paneTitle}`,
          type: "pane",
          statusLabel,
          statusColor,
          description: paneSummary.description,
        };
      });

      const spacer: OverviewLine[] =
        idx > 0 ? [{ key: `spacer:${item.sessionName}`, type: "spacer" }] : [];

      return [
        ...spacer,
        { key: `s:${item.sessionName}`, type: "session", sessionName: item.sessionName },
        ...paneLines,
      ];
    });

    return [...summaryLines, ...sessionLines];
  }, [overallSummary, items, groups]);

  const clampedCursor = cursor >= lines.length ? Math.max(0, lines.length - 1) : cursor;

  const reservedLines = 3; // border top(1) + header(1) + border bottom(1)
  const { scrollOffset, visibleCount } = useScroll(
    clampedCursor,
    lines.length,
    availableRows - reservedLines,
  );
  const visibleLines = useMemo(
    () => lines.slice(scrollOffset, scrollOffset + visibleCount),
    [lines, scrollOffset, visibleCount],
  );

  const moveCursor = useCallback(
    (next: number): void => {
      setCursor(Math.max(0, Math.min(lines.length - 1, next)));
    },
    [lines.length],
  );

  useInput(
    (input, key) => {
      if (input === "q") {
        exit();
        return;
      }

      if (key.escape || key.leftArrow) {
        onBack();
        return;
      }

      if (key.upArrow) {
        moveCursor(clampedCursor - 1);
        return;
      }

      if (key.downArrow) {
        moveCursor(clampedCursor + 1);
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box
      flexDirection="column"
      height={availableRows}
      borderStyle="round"
      borderColor={isFocused ? "green" : "gray"}
    >
      <Box paddingLeft={1} gap={1}>
        <Text bold color={isFocused ? "green" : "gray"}>
          Overview
        </Text>
        {isLoading && <Spinner label="" />}
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {lines.length === 0 && !isLoading ? (
          <Box paddingLeft={1}>
            <Text dimColor>No sessions.</Text>
          </Box>
        ) : (
          visibleLines.map((line, i) => {
            const globalIndex = scrollOffset + i;
            const isHighlighted = isFocused && globalIndex === clampedCursor;

            if (line.type === "spacer") {
              return <Box key={line.key} height={1} />;
            }
            if (line.type === "summary") {
              return (
                <Box key={line.key} paddingLeft={1}>
                  <Text color={isHighlighted ? "green" : undefined} wrap="wrap">
                    {line.text}
                  </Text>
                </Box>
              );
            }
            if (line.type === "session") {
              return (
                <Box key={line.key} paddingLeft={1}>
                  <Text color={isHighlighted ? "green" : "cyan"}>{line.sessionName}</Text>
                </Box>
              );
            }
            return (
              <Box key={line.key} paddingLeft={3} gap={1}>
                {line.statusLabel ? (
                  <Text color={isHighlighted ? "green" : (line.statusColor as never)}>
                    [{line.statusLabel}]
                  </Text>
                ) : (
                  <Text color={isHighlighted ? "green" : "gray"}>[--]</Text>
                )}
                <Text color={isHighlighted ? "green" : undefined} wrap="wrap">
                  {line.description}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};
