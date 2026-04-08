import { basename } from "node:path";
import { Box, Text } from "ink";
import { useCallback, useEffect, useMemo, useRef, useState, type FC } from "react";
import type { SessionGroup, UnifiedPane } from "../models/session.ts";
import { Header } from "./shared/Header.tsx";
import { StatusBar } from "./shared/StatusBar.tsx";
import { SessionListPanel } from "./shared/DirectorySelect.tsx";
import { PaneListPanel } from "./PaneListPanel.tsx";
import { ConfirmView } from "./ConfirmView.tsx";
import { DeleteSessionView } from "./DeleteSessionView.tsx";
import { DirectorySearchView } from "./DirectorySearchView.tsx";
import { useTerminalSize } from "../hooks/use-terminal-size.ts";
import { APP_TITLE, APP_VERSION } from "../constants.ts";
import { swallow } from "../utils/PromiseUtils.ts";


export type ManagerActions = {
  fetchSessions: () => Promise<SessionGroup[]>;
  createSession: (sessionName: string, cwd: string, prompt: string) => Promise<void>;
  killSession: (sessionName: string) => Promise<void>;
  killPane: (paneId: string) => Promise<void>;
  highlightWindow: (up: UnifiedPane) => Promise<void>;
  unhighlightWindow: (up: UnifiedPane) => Promise<void>;
  openEditor: (sessionName: string) => string | undefined;
  attachSession: (sessionName: string) => void;
};

const MODE = {
  split: "split",
  confirm: "confirm",
  deleteSession: "deleteSession",
  addSession: "addSession",
} as const;

type Mode = (typeof MODE)[keyof typeof MODE];

const FOCUS = {
  left: "left",
  right: "right",
} as const;

type Focus = (typeof FOCUS)[keyof typeof FOCUS];

type FetchState = {
  data: SessionGroup[];
  isLoading: boolean;
};

type Props = {
  actions: ManagerActions;
  currentSession: string;
  currentCwd: string;
  directories: string[];
  restoredPrompt?: string;
  restoredSession?: string;
};

const POLL_INTERVAL = 3000;


export const ManagerView: FC<Props> = ({
  actions,
  currentSession,
  currentCwd,
  directories,
  restoredPrompt,
  restoredSession,
}) => {
  const { rows, columns } = useTerminalSize();
  const [fetchState, setFetchState] = useState<FetchState>({ data: [], isLoading: true });
  const [mode, setMode] = useState<Mode>(restoredPrompt ? MODE.confirm : MODE.split);
  const [focus, setFocus] = useState<Focus>(FOCUS.left);
  const [selectedSession, setSelectedSession] = useState<string | undefined>(restoredSession);
  const [pendingPrompt, setPendingPrompt] = useState(restoredPrompt ?? "");
  const [pendingDeleteSession, setPendingDeleteSession] = useState<string | undefined>(undefined);
  const sessionCwdMap = useRef(new Map<string, string>());


  const refresh = useCallback(async (): Promise<void> => {
    try {
      const groups = await actions.fetchSessions();
      const knownNames = new Set(groups.map((g) => g.sessionName));
      const missing: SessionGroup[] = [];
      for (const name of sessionCwdMap.current.keys()) {
        if (!knownNames.has(name)) {
          missing.push({ sessionName: name, tabs: [] });
        }
      }
      setFetchState({ data: [...missing, ...groups], isLoading: false });
    } catch {
      setFetchState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [actions]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL);
    return (): void => {
      clearInterval(timer);
    };
  }, [refresh]);


  const resolvedSession = selectedSession ?? fetchState.data[0]?.sessionName;

  const selectedGroup = useMemo(
    () => fetchState.data.find((g) => g.sessionName === resolvedSession),
    [fetchState.data, resolvedSession],
  );


  const handleOpenAddSession = useCallback((): void => {
    setMode(MODE.addSession);
  }, []);

  const handleAddSessionSelect = useCallback(
    (path: string): void => {
      const name = basename(path);
      sessionCwdMap.current.set(name, path);
      const exists = fetchState.data.some((g) => g.sessionName === name);
      if (!exists) {
        setFetchState((prev) => ({
          ...prev,
          data: [{ sessionName: name, tabs: [] }, ...prev.data],
        }));
      }
      setSelectedSession(name);
      setMode(MODE.split);
    },
    [fetchState.data],
  );

  const handleCancelAddSession = useCallback((): void => {
    setMode(MODE.split);
  }, []);

  const handleDeleteSession = useCallback((name: string): void => {
    setPendingDeleteSession(name);
    setMode(MODE.deleteSession);
  }, []);

  const handleConfirmDelete = useCallback((): void => {
    if (!pendingDeleteSession) return;
    sessionCwdMap.current.delete(pendingDeleteSession);
    if (resolvedSession === pendingDeleteSession) {
      setSelectedSession(undefined);
    }
    void swallow(() => actions.killSession(pendingDeleteSession)).then(() => void refresh());
    setPendingDeleteSession(undefined);
    setMode(MODE.split);
  }, [pendingDeleteSession, resolvedSession, actions, refresh]);

  const handleCancelDelete = useCallback((): void => {
    setPendingDeleteSession(undefined);
    setMode(MODE.split);
  }, []);

  const handleNewSession = useCallback(
    (sessionName: string): void => {
      actions.openEditor(sessionName);
    },
    [actions],
  );

  const handleConfirmNew = useCallback((): void => {
    if (!resolvedSession) return;
    const cwd = sessionCwdMap.current.get(resolvedSession) ?? currentCwd;
    void actions.createSession(resolvedSession, cwd, pendingPrompt).then(() => void refresh());
    setPendingPrompt("");
    setMode(MODE.split);
  }, [resolvedSession, currentCwd, pendingPrompt, actions, refresh]);

  const handleCancelConfirm = useCallback((): void => {
    setPendingPrompt("");
    setMode(MODE.split);
  }, []);

  const handleSessionSelect = useCallback((name: string): void => {
    setSelectedSession(name);
    setFocus(FOCUS.right);
  }, []);

  const handleSessionCursorChange = useCallback((name: string): void => {
    setSelectedSession(name);
  }, []);

  const handleNavigate = useCallback(
    (up: UnifiedPane): void => {
      actions.attachSession(up.pane.sessionName);
    },
    [actions],
  );

  const handleBack = useCallback((): void => {
    setFocus(FOCUS.left);
  }, []);

  const handleKillPane = useCallback(
    async (paneId: string): Promise<void> => {
      await swallow(() => actions.killPane(paneId));
      void refresh();
    },
    [actions, refresh],
  );

  const handleHighlight = useCallback(
    async (up: UnifiedPane): Promise<void> => {
      await swallow(() => actions.highlightWindow(up));
    },
    [actions],
  );

  const handleUnhighlight = useCallback(
    async (up: UnifiedPane): Promise<void> => {
      await swallow(() => actions.unhighlightWindow(up));
    },
    [actions],
  );


  if (fetchState.isLoading) {
    return (
      <Box flexDirection="column" height={rows}>
        <Header title={`${APP_TITLE} v${APP_VERSION}`} />
        <StatusBar message="Loading..." type="info" />
      </Box>
    );
  }

  if (mode === MODE.addSession) {
    return (
      <DirectorySearchView
        directories={directories}
        onSelect={handleAddSessionSelect}
        onCancel={handleCancelAddSession}
      />
    );
  }

  if (mode === MODE.deleteSession && pendingDeleteSession) {
    const deleteGroup = fetchState.data.find((g) => g.sessionName === pendingDeleteSession);
    const paneCount = deleteGroup?.tabs.reduce((sum, t) => sum + t.panes.length, 0) ?? 0;
    return (
      <DeleteSessionView
        sessionName={pendingDeleteSession}
        paneCount={paneCount}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    );
  }

  if (mode === MODE.confirm && pendingPrompt) {
    return (
      <ConfirmView
        selectedDir={resolvedSession ?? ""}
        prompt={pendingPrompt}
        onConfirm={handleConfirmNew}
        onCancel={handleCancelConfirm}
      />
    );
  }

  const panelHeight = rows - 5;
  const leftWidth = Math.floor(columns / 3);
  const rightWidth = columns - leftWidth;

  return (
    <Box flexDirection="column" height={rows}>
      <Header title={`${APP_TITLE} - v${APP_VERSION}`} />
      <Box flexDirection="row" flexGrow={1}>
        <Box
          flexDirection="column"
          width={leftWidth}
          borderStyle="round"
          borderColor={focus === FOCUS.left ? "green" : "gray"}
        >
          <SessionListPanel
            sessionGroups={fetchState.data}
            currentSession={currentSession}
            isFocused={focus === FOCUS.left}
            availableRows={panelHeight}
            onSelect={handleSessionSelect}
            onCursorChange={handleSessionCursorChange}
            onDeleteSession={handleDeleteSession}
            onAddSession={handleOpenAddSession}
          />
        </Box>
        <Box
          flexDirection="column"
          width={rightWidth}
          borderStyle="round"
          borderColor={focus === FOCUS.right ? "green" : "gray"}
        >
          <PaneListPanel
            selectedSession={resolvedSession}
            group={selectedGroup}
            isFocused={focus === FOCUS.right}
            availableRows={panelHeight}
            onNavigate={handleNavigate}
            onHighlight={handleHighlight}
            onUnhighlight={handleUnhighlight}
            onBack={handleBack}
            onNewSession={handleNewSession}
            onKillPane={handleKillPane}
          />
        </Box>
      </Box>
      <Text dimColor>
        {focus === FOCUS.left
          ? "\u2191/\u2193 move  Enter/\u2192 select  n add  d delete  q quit"
          : "\u2191/\u2193 move  Enter focus  n new  d kill  Esc/\u2190 back  q quit"}
      </Text>
    </Box>
  );
};
