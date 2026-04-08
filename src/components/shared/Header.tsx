import { Box, Text } from "ink";
import type { FC } from "react";

type Props = {
  title: string;
};

export const Header: FC<Props> = ({ title }) => {
  return (
    <Box marginBottom={1}>
      <Text bold color="cyan">
        {title}
      </Text>
    </Box>
  );
};
