import { Box, Text } from "ink";
import { useRef, type FC } from "react";
import type { SessionGroup, UnifiedPane } from "../models/session.ts";
import { PaneListView } from "./PaneListView.tsx";

type Props = {
  selectedSession: string | undefined;
  group: SessionGroup | undefined;
  isFocused: boolean;
  availableRows: number;
  onNavigate: (up: UnifiedPane) => void;
  onHighlight: (up: UnifiedPane) => Promise<void>;
  onUnhighlight: (up: UnifiedPane) => Promise<void>;
  onBack: () => void;
  onNewSession: (sessionName: string) => void;
  onOpenEditor: (sessionName: string) => void;
  onKillPane: (paneId: string) => Promise<void>;
  cursorRef?: { current: number };
};

export const PaneListPanel: FC<Props> = ({
  selectedSession,
  group,
  isFocused,
  availableRows,
  onNavigate,
  onHighlight,
  onUnhighlight,
  onBack,
  onNewSession,
  onOpenEditor,
  onKillPane,
  cursorRef,
}) => {
  const prevSessionRef = useRef(selectedSession);
  if (prevSessionRef.current !== selectedSession) {
    prevSessionRef.current = selectedSession;
    if (cursorRef) cursorRef.current = 0;
  }

  if (!selectedSession) {
    return (
      <Box paddingLeft={1}>
        <Text dimColor>No session selected</Text>
      </Box>
    );
  }

  return (
    <PaneListView
      key={selectedSession}
      selectedSession={selectedSession}
      group={group ?? { sessionName: selectedSession, tabs: [] }}
      isFocused={isFocused}
      availableRows={availableRows}
      onNavigate={onNavigate}
      onHighlight={onHighlight}
      onUnhighlight={onUnhighlight}
      onBack={onBack}
      onNewSession={onNewSession}
      onOpenEditor={onOpenEditor}
      onKillPane={onKillPane}
      cursorRef={cursorRef}
    />
  );
};
