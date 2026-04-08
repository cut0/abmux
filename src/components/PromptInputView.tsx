import { Box, Text, useInput } from "ink";
import { useState, type FC } from "react";
import { Header } from "./shared/Header.tsx";
import { useTerminalSize } from "../hooks/use-terminal-size.ts";
import { APP_TITLE } from "../constants.ts";

type Props = {
  selectedDir: string;
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
};

export const PromptInputView: FC<Props> = ({ selectedDir, onSubmit, onCancel }) => {
  const { rows } = useTerminalSize();
  const [value, setValue] = useState("");

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      const trimmed = value.trim();
      if (trimmed) onSubmit(trimmed);
      return;
    }

    if (key.backspace || key.delete) {
      setValue((prev) => prev.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setValue((prev) => prev + input);
    }
  });

  return (
    <Box flexDirection="column" height={rows}>
      <Header title={`${APP_TITLE} — ${selectedDir}`} />
      <Box marginBottom={1}>
        <Text bold>New prompt:</Text>
      </Box>
      <Box paddingLeft={1} flexGrow={1}>
        <Text color="green">{">"} </Text>
        <Text>{value}</Text>
        <Text dimColor>{value ? "" : "type your prompt..."}</Text>
      </Box>
      <Box gap={2}>
        <Text dimColor>Enter submit</Text>
        <Text dimColor>Esc cancel</Text>
      </Box>
    </Box>
  );
};
