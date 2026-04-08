import { Box, Text } from "ink";
import { useMemo, type FC } from "react";
import {
  SESSION_STATUS,
  SESSION_STATUS_COLOR,
  SESSION_STATUS_LABEL,
  type SessionStatus,
} from "../../models/session.ts";

const STATUS_ICON: Record<SessionStatus, string> = {
  [SESSION_STATUS.waitingInput]: "\u276F",
  [SESSION_STATUS.waitingConfirm]: "\u2753",
  [SESSION_STATUS.thinking]: "\u25CF",
  [SESSION_STATUS.toolRunning]: "\u2733",
  [SESSION_STATUS.idle]: "\u25CB",
};

type Props = {
  message: string;
  type?: "success" | "error" | "info";
  statusCounts?: Partial<Record<SessionStatus, number>>;
};

const COLOR_MAP = {
  success: "green",
  error: "red",
  info: "gray",
} as const;

const STATUS_ORDER: readonly SessionStatus[] = [
  SESSION_STATUS.thinking,
  SESSION_STATUS.toolRunning,
  SESSION_STATUS.waitingConfirm,
  SESSION_STATUS.waitingInput,
  SESSION_STATUS.idle,
];

export const StatusBar: FC<Props> = ({ message, type = "info", statusCounts }) => {
  const summaryEntries = useMemo(() => {
    if (!statusCounts) return [];
    return STATUS_ORDER.filter((s) => (statusCounts[s] ?? 0) > 0).map((s) => ({
      status: s,
      icon: STATUS_ICON[s],
      label: SESSION_STATUS_LABEL[s],
      color: SESSION_STATUS_COLOR[s],
      count: statusCounts[s] ?? 0,
    }));
  }, [statusCounts]);

  return (
    <Box>
      <Box flexGrow={1}>
        <Text color={COLOR_MAP[type]}>{message}</Text>
      </Box>
      {summaryEntries.length > 0 && (
        <Box gap={1}>
          {summaryEntries.map((entry) => (
            <Text key={entry.status} color={entry.color as never}>
              {entry.icon}
              {String(entry.count)} {entry.label}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};
