import { basename } from "node:path";
import { Box, useInput } from "ink";
import { useCallback, useMemo, useRef, useState, type FC } from "react";

import type { SessionSummaryResult } from "../models/claude-session.ts";
import type { ManagedSession, SessionStatus, UnifiedPane } from "../models/session.ts";
import { Header } from "./shared/Header.tsx";
import { StatusBar } from "./shared/StatusBar.tsx";
import { SessionListPanel } from "./shared/DirectorySelect.tsx";
import { PaneListPanel } from "./PaneListPanel.tsx";
import { SessionOverviewPanel } from "./SessionOverviewPanel.tsx";
import { ConfirmView } from "./ConfirmView.tsx";
import { DeleteSessionView } from "./DeleteSessionView.tsx";
import { DirectorySearchView } from "./DirectorySearchView.tsx";
import { useInterval } from "../hooks/use-interval.ts";
import { useTerminalSize } from "../hooks/use-terminal-size.ts";
import { APP_TITLE, APP_VERSION } from "../constants.ts";
import { swallow } from "../utils/PromiseUtils.ts";

export type ManagerActions = {
  fetchSessions: () => Promise<ManagedSession[]>;
  fetchOverview: (sessions: ManagedSession[]) => Promise<SessionSummaryResult>;
  createSession: (
    sessionName: string,
    cwd: string,
    prompt: string,
    worktree: boolean,
  ) => Promise<void>;
  killSession: (sessionName: string) => Promise<void>;
  killPane: (paneId: string) => Promise<void>;
  highlightWindow: (up: UnifiedPane) => Promise<void>;
  unhighlightWindow: (up: UnifiedPane) => Promise<void>;
  openEditor: (sessionName: string, cwd: string) => string | undefined;
  navigateToPane: (up: UnifiedPane) => Promise<void>;
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
  bottom: "bottom",
} as const;

type Focus = (typeof FOCUS)[keyof typeof FOCUS];

export type UISnapshot = {
  focus: Focus;
  selectedSession: string | undefined;
  sessionListCursor: number;
  paneListCursor: number;
  overviewCursor: number;
  overviewResult: SessionSummaryResult;
};

export type UISnapshotRef = { current: UISnapshot | undefined };

type SessionsState = {
  sessions: ManagedSession[];
  isLoading: boolean;
};

type Props = {
  actions: ManagerActions;
  currentSession: string;
  directories: string[];
  restoredPrompt?: string;
  restoredSession?: string;
  restoredCwd?: string;
  snapshotRef: UISnapshotRef;
  restoredState?: UISnapshot;
};

const POLL_INTERVAL = 3000;
const OVERVIEW_POLL_INTERVAL = 60_000;

export const ManagerView: FC<Props> = ({
  actions,
  currentSession,
  directories,
  restoredPrompt,
  restoredSession,
  restoredCwd,
  snapshotRef,
  restoredState,
}) => {
  const { rows, columns } = useTerminalSize();
  const [sessionsState, setSessionsState] = useState<SessionsState>({
    sessions: [],
    isLoading: true,
  });
  const [mode, setMode] = useState<Mode>(restoredPrompt ? MODE.confirm : MODE.split);
  const [focus, setFocus] = useState<Focus>(restoredState?.focus ?? FOCUS.left);
  const [selectedSession, setSelectedSession] = useState<string | undefined>(
    restoredSession ?? restoredState?.selectedSession,
  );
  const [pendingPrompt, setPendingPrompt] = useState(restoredPrompt ?? "");
  const [pendingDeleteSession, setPendingDeleteSession] = useState<string | undefined>(undefined);
  const [overviewResult, setOverviewResult] = useState<SessionSummaryResult>(
    restoredState?.overviewResult ?? { overallSummary: "", sessions: [] },
  );
  const [overviewLoading, setOverviewLoading] = useState(
    restoredState?.overviewResult ? false : true,
  );
  const overviewInFlightRef = useRef(false);

  const sessionCursorRef = useRef(restoredState?.sessionListCursor ?? 0);
  const paneCursorRef = useRef(restoredState?.paneListCursor ?? 0);
  const overviewCursorRef = useRef(restoredState?.overviewCursor ?? 0);
  const paneRestoredRef = useRef(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const fetched = await actions.fetchSessions();
      setSessionsState((prev) => {
        const fetchedNames = new Set(fetched.map((s) => s.name));
        const userOnly = prev.sessions.filter(
          (s) => !fetchedNames.has(s.name) && s.groups.length === 0,
        );
        return { sessions: [...userOnly, ...fetched], isLoading: false };
      });
    } catch {
      setSessionsState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [actions]);

  useInterval(() => void refresh(), POLL_INTERVAL);

  useInterval(
    () => {
      if (overviewInFlightRef.current) return;
      overviewInFlightRef.current = true;
      void actions
        .fetchOverview(sessionsState.sessions)
        .then((result) => {
          setOverviewResult(result);
        })
        .catch(() => {
          // keep previous items
        })
        .finally(() => {
          setOverviewLoading(false);
          overviewInFlightRef.current = false;
        });
    },
    OVERVIEW_POLL_INTERVAL,
    !sessionsState.isLoading,
  );

  useInput(
    (_input, key) => {
      if (key.tab) {
        setFocus((prev) => {
          if (prev === FOCUS.left) return FOCUS.right;
          if (prev === FOCUS.right) return FOCUS.bottom;
          return FOCUS.left;
        });
      }
    },
    { isActive: mode === MODE.split },
  );

  const resolvedSession = selectedSession ?? sessionsState.sessions[0]?.name;

  const paneInitialCursor =
    !paneRestoredRef.current && restoredState?.selectedSession === resolvedSession
      ? restoredState?.paneListCursor
      : undefined;
  if (paneInitialCursor !== undefined) paneRestoredRef.current = true;

  snapshotRef.current = {
    focus,
    selectedSession: resolvedSession,
    sessionListCursor: sessionCursorRef.current,
    paneListCursor: paneCursorRef.current,
    overviewCursor: overviewCursorRef.current,
    overviewResult,
  };

  const selectedManagedSession = useMemo(
    () => sessionsState.sessions.find((s) => s.name === resolvedSession),
    [sessionsState.sessions, resolvedSession],
  );

  const selectedGroup = useMemo(() => {
    if (!selectedManagedSession) return undefined;
    return {
      sessionName: selectedManagedSession.name,
      tabs: selectedManagedSession.groups.flatMap((g) => g.tabs),
    };
  }, [selectedManagedSession]);

  const allGroups = useMemo(
    () => sessionsState.sessions.flatMap((s) => s.groups),
    [sessionsState.sessions],
  );

  const statusCounts = useMemo(
    (): Partial<Record<SessionStatus, number>> =>
      allGroups
        .flatMap((g) => g.tabs)
        .flatMap((t) => t.panes)
        .filter((p) => p.kind === "claude" && p.claudeStatus)
        .reduce<Partial<Record<SessionStatus, number>>>((acc, p) => {
          const s = p.claudeStatus;
          if (!s) return acc;
          acc[s] = (acc[s] ?? 0) + 1;
          return acc;
        }, {}),
    [allGroups],
  );

  const handleOpenAddSession = useCallback((): void => {
    setMode(MODE.addSession);
  }, []);

  const handleAddSessionSelect = useCallback((path: string): void => {
    const name = basename(path);
    setSessionsState((prev) => {
      const exists = prev.sessions.some((s) => s.name === name);
      if (exists) return prev;
      return {
        ...prev,
        sessions: [{ name, path, groups: [] }, ...prev.sessions],
      };
    });
    setSelectedSession(name);
    setMode(MODE.split);
  }, []);

  const handleCancelAddSession = useCallback((): void => {
    setMode(MODE.split);
  }, []);

  const handleDeleteSession = useCallback((name: string): void => {
    setPendingDeleteSession(name);
    setMode(MODE.deleteSession);
  }, []);

  const handleConfirmDelete = useCallback((): void => {
    if (!pendingDeleteSession) return;
    const session = sessionsState.sessions.find((s) => s.name === pendingDeleteSession);
    setSessionsState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.name !== pendingDeleteSession),
    }));
    if (resolvedSession === pendingDeleteSession) {
      setSelectedSession(undefined);
    }
    if (session) {
      const killAll = Promise.all(
        session.groups.map((g) => swallow(() => actions.killSession(g.sessionName))),
      );
      void killAll.then(() => void refresh());
    }
    setPendingDeleteSession(undefined);
    setMode(MODE.split);
  }, [pendingDeleteSession, resolvedSession, sessionsState.sessions, actions, refresh]);

  const handleCancelDelete = useCallback((): void => {
    setPendingDeleteSession(undefined);
    setMode(MODE.split);
  }, []);

  const handleNewSession = useCallback(
    (sessionName: string): void => {
      const cwd = selectedManagedSession?.path;
      if (!cwd) return;
      actions.openEditor(sessionName, cwd);
    },
    [actions, selectedManagedSession],
  );

  const handleConfirmNew = useCallback(
    ({ worktree }: { worktree: boolean }): void => {
      if (!resolvedSession) return;
      const cwd = restoredCwd ?? selectedManagedSession?.path;
      if (!cwd) return;
      void actions
        .createSession(resolvedSession, cwd, pendingPrompt, worktree)
        .then(() => void refresh());
      setPendingPrompt("");
      setMode(MODE.split);
    },
    [resolvedSession, restoredCwd, selectedManagedSession, pendingPrompt, actions, refresh],
  );

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
      void actions.navigateToPane(up);
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

  if (sessionsState.isLoading) {
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
    const deleteSession = sessionsState.sessions.find((s) => s.name === pendingDeleteSession);
    const paneCount =
      deleteSession?.groups.reduce(
        (sum, g) => sum + g.tabs.reduce((s, t) => s + t.panes.length, 0),
        0,
      ) ?? 0;
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

  const fixedRows = 3; // Header(1 + marginBottom 1) + StatusBar(1)
  const contentHeight = rows - fixedRows;
  const topHeight = Math.floor(contentHeight / 2);
  const bottomHeight = contentHeight - topHeight;
  const leftWidth = Math.floor(columns / 3);
  const rightWidth = columns - leftWidth;

  return (
    <Box flexDirection="column" height={rows}>
      <Header title={`${APP_TITLE} - v${APP_VERSION}`} />
      <Box flexDirection="row" height={topHeight}>
        <Box
          flexDirection="column"
          width={leftWidth}
          borderStyle="round"
          borderColor={focus === FOCUS.left ? "green" : "gray"}
        >
          <SessionListPanel
            sessions={sessionsState.sessions}
            currentSession={currentSession}
            isFocused={focus === FOCUS.left}
            availableRows={topHeight - 2}
            onSelect={handleSessionSelect}
            onCursorChange={handleSessionCursorChange}
            onDeleteSession={handleDeleteSession}
            onAddSession={handleOpenAddSession}
            initialCursor={restoredState?.sessionListCursor}
            cursorRef={sessionCursorRef}
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
            availableRows={topHeight - 2}
            onNavigate={handleNavigate}
            onHighlight={handleHighlight}
            onUnhighlight={handleUnhighlight}
            onBack={handleBack}
            onNewSession={handleNewSession}
            onKillPane={handleKillPane}
            initialCursor={paneInitialCursor}
            cursorRef={paneCursorRef}
          />
        </Box>
      </Box>
      <SessionOverviewPanel
        overallSummary={overviewResult.overallSummary}
        items={overviewResult.sessions}
        groups={allGroups}
        isLoading={overviewLoading}
        isFocused={focus === FOCUS.bottom}
        availableRows={bottomHeight}
        onBack={handleBack}
        initialCursor={restoredState?.overviewCursor}
        cursorRef={overviewCursorRef}
      />
      <StatusBar
        message={
          focus === FOCUS.left
            ? "\u2191/\u2193 move  Enter/\u2192 select  Tab next  n add  d delete  q quit"
            : focus === FOCUS.right
              ? "\u2191/\u2193 move  Enter focus  Tab next  n new  d kill  Esc/\u2190 back  q quit"
              : "\u2191/\u2193 scroll  Tab next  Esc/\u2190 back  q quit"
        }
        statusCounts={statusCounts}
      />
    </Box>
  );
};
