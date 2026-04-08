import { Box, Text, useInput } from "ink";
import type { FC } from "react";
import { Header } from "./shared/Header.tsx";
import { useTerminalSize } from "../hooks/use-terminal-size.ts";
import { APP_TITLE } from "../constants.ts";

type Props = {
  selectedDir: string;
  prompt: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmView: FC<Props> = ({ selectedDir, prompt, onConfirm, onCancel }) => {
  const { rows } = useTerminalSize();
  const previewLines = prompt.split("\n");
  const maxPreview = Math.min(previewLines.length, rows - 6);

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
      <Header title={`${APP_TITLE} — ${selectedDir}`} />
      <Box marginBottom={1}>
        <Text bold>New Claude session:</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={2}>
        {previewLines.slice(0, maxPreview).map((line, i) => (
          <Text key={i} color="white">
            {line}
          </Text>
        ))}
        {previewLines.length > maxPreview && (
          <Text dimColor>... ({previewLines.length - maxPreview} more lines)</Text>
        )}
      </Box>
      <Box gap={2}>
        <Text dimColor>Enter confirm</Text>
        <Text dimColor>Esc cancel</Text>
      </Box>
    </Box>
  );
};
