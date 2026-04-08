import { Box, Text } from "ink";
import type { FC } from "react";
import type { UnifiedPane } from "../../models/session.ts";
import { SESSION_STATUS_COLOR, SESSION_STATUS_LABEL } from "../../models/session.ts";

type Props = {
  unifiedPane: UnifiedPane;
  isHighlighted: boolean;
};

export const PaneItem: FC<Props> = ({ unifiedPane, isHighlighted }) => {
  const { pane, kind, claudeStatus, claudeTitle } = unifiedPane;

  if (kind === "claude") {
    const icon = pane.title.charAt(0);
    const statusLabel = claudeStatus ? SESSION_STATUS_LABEL[claudeStatus] : "";
    const statusColor = claudeStatus ? SESSION_STATUS_COLOR[claudeStatus] : "gray";
    return (
      <Box paddingLeft={3} gap={1}>
        <Text color={isHighlighted ? "green" : undefined}>{isHighlighted ? "\u25B6" : " "}</Text>
        <Text color="#FF8C00">{icon}</Text>
        <Text color={statusColor as never}>[{statusLabel}]</Text>
        <Text color={isHighlighted ? "green" : undefined} bold={isHighlighted}>
          {claudeTitle}
        </Text>
        <Text dimColor>{pane.paneId}</Text>
      </Box>
    );
  }

  return (
    <Box paddingLeft={3} gap={1}>
      <Text color={isHighlighted ? "green" : undefined}>{isHighlighted ? "\u25B6" : " "}</Text>
      {kind === "available" && <Text color="#4AA8D8">{"\u25CB"}</Text>}
      {kind === "busy" && <Text color="#E05252">{"\u25CF"}</Text>}
      <Text color={isHighlighted ? "green" : undefined} bold={isHighlighted}>
        {pane.title || "(empty)"}
      </Text>
      <Text dimColor>{pane.paneId}</Text>
    </Box>
  );
};
