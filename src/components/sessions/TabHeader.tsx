import { Box, Text } from "ink";
import type { FC } from "react";

type DirectoryHeaderProps = {
  cwd: string;
  isFirst: boolean;
};

export const DirectoryHeader: FC<DirectoryHeaderProps> = ({ cwd, isFirst }) => {
  return (
    <Box marginTop={isFirst ? 0 : 1}>
      <Text color="cyan" bold>
        {cwd}
      </Text>
    </Box>
  );
};

type TabLabelProps = {
  tabName: string;
};

export const TabLabel: FC<TabLabelProps> = ({ tabName }) => {
  return (
    <Box paddingLeft={1}>
      <Text dimColor>{tabName}</Text>
    </Box>
  );
};
