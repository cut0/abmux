import { Box, Text, useInput } from "ink";
import type { FC } from "react";
import { Header } from "./shared/Header.tsx";
import { useTerminalSize } from "../hooks/use-terminal-size.ts";
import { APP_TITLE } from "../constants.ts";

type Props = {
  sessionName: string;
  paneCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export const DeleteSessionView: FC<Props> = ({ sessionName, paneCount, onConfirm, onCancel }) => {
  const { rows } = useTerminalSize();

  useInput((_input, key) => {
    if (key.return) {
      onConfirm();
      return;
    }
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" height={rows}>
      <Header title={APP_TITLE} />
      <Box flexDirection="column" gap={1} paddingLeft={2}>
        <Text bold color="red">
          Delete session?
        </Text>
        <Text>
          Session: <Text bold>{sessionName}</Text>
        </Text>
        <Text>
          Panes: <Text bold>{paneCount}</Text>
        </Text>
        <Text dimColor>All processes in this session will be terminated.</Text>
      </Box>
      <Box flexGrow={1} />
      <Box gap={2}>
        <Text dimColor>Enter confirm</Text>
        <Text dimColor>Esc cancel</Text>
      </Box>
    </Box>
  );
};
