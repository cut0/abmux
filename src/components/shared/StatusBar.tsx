import { Box, Text } from "ink";
import type { FC } from "react";

type Props = {
  message: string;
  type?: "success" | "error" | "info";
};

const COLOR_MAP = {
  success: "green",
  error: "red",
  info: "gray",
} as const;

export const StatusBar: FC<Props> = ({ message, type = "info" }) => {
  return (
    <Box marginTop={1}>
      <Text color={COLOR_MAP[type]}>{message}</Text>
    </Box>
  );
};
