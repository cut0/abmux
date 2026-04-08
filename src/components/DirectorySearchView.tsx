import { Box, Text, useInput } from "ink";
import { useMemo, useState, type FC } from "react";
import { basename } from "node:path";
import { Header } from "./shared/Header.tsx";
import { useTerminalSize } from "../hooks/use-terminal-size.ts";
import { APP_TITLE } from "../constants.ts";
import { useScroll } from "../hooks/use-scroll.ts";

type Props = {
  directories: string[];
  onSelect: (path: string) => void;
  onCancel: () => void;
};

const formatPath = (path: string): string => {
  const home = process.env["HOME"] ?? "";
  if (home && path.startsWith(home)) {
    return `~${path.slice(home.length)}`;
  }
  return path;
};

export const DirectorySearchView: FC<Props> = ({ directories, onSelect, onCancel }) => {
  const { rows } = useTerminalSize();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const filtered = useMemo(() => {
    if (!query) return directories;
    const lower = query.toLowerCase();
    return directories.filter((d) => {
      const name = basename(d).toLowerCase();
      const formatted = formatPath(d).toLowerCase();
      return name.includes(lower) || formatted.includes(lower);
    });
  }, [directories, query]);

  const clampedCursor = cursor >= filtered.length ? Math.max(0, filtered.length - 1) : cursor;
  if (clampedCursor !== cursor) {
    setCursor(clampedCursor);
  }

  const listHeight = rows - 6;
  const { scrollOffset, visibleCount } = useScroll(clampedCursor, filtered.length, listHeight);
  const visibleItems = useMemo(
    () => filtered.slice(scrollOffset, scrollOffset + visibleCount),
    [filtered, scrollOffset, visibleCount],
  );

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      const selected = filtered[clampedCursor];
      if (selected) onSelect(selected);
      return;
    }

    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
      return;
    }

    if (key.downArrow) {
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
      return;
    }

    if (key.backspace || key.delete) {
      setQuery((q) => q.slice(0, -1));
      setCursor(0);
      return;
    }

    if (input && !key.ctrl && !key.meta && !key.upArrow && !key.downArrow) {
      setQuery((q) => q + input);
      setCursor(0);
    }
  });

  return (
    <Box flexDirection="column" height={rows}>
      <Header title={`${APP_TITLE} — Add Session`} />
      <Box paddingLeft={1} gap={1}>
        <Text bold>{">"}</Text>
        <Text>{query}</Text>
        <Text dimColor>{query ? "" : "type to filter..."}</Text>
      </Box>
      <Box paddingLeft={1}>
        <Text dimColor>
          {filtered.length}/{directories.length}
        </Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleItems.map((dir, i) => {
          const globalIndex = scrollOffset + i;
          const isHighlighted = globalIndex === clampedCursor;
          return (
            <Box key={dir} paddingLeft={1} gap={1}>
              <Text color={isHighlighted ? "green" : undefined}>
                {isHighlighted ? "\u25B6" : " "}
              </Text>
              <Text color={isHighlighted ? "green" : undefined} bold={isHighlighted}>
                {formatPath(dir)}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box gap={2}>
        <Text dimColor>Enter select</Text>
        <Text dimColor>Esc cancel</Text>
      </Box>
    </Box>
  );
};
