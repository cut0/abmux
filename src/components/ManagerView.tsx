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
import { PromptInputView } from "./PromptInputView.tsx";
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

const FOCUS = {
  left: "left",
  right: "right",
  bottom: "bottom",
} as const;

type Focus = (typeof FOCUS)[keyof typeof FOCUS];

type ViewState =
  | { mode: "split" }
  | { mode: "confirm"; prompt: string; cwd: string }
  | { mode: "promptInput" }
  | { mode: "deleteSession"; sessionName: string }
  | { mode: "addSession" };

export type UISnapshot = {
  focus: Focus;
  selectedSession: string | undefined;
  sessionListCursor: number;
  paneListCursor: number;
  overviewCursor: number;
  overviewResult: SessionSummaryResult;
};

export type UISnapshotRef = { current: UISnapshot | undefined };

export type RemountState = {
  prompt?: string;
  session?: string;
  cwd?: string;
  snapshot?: UISnapshot;
};

type State = {
  view: ViewState;
  focus: Focus;
  selectedSession: string | undefined;
  sessions: ManagedSession[];
  sessionsLoading: boolean;
  overviewResult: SessionSummaryResult | undefined;
};

type Props = {
  actions: ManagerActions;
  currentSession: string;
  directories: string[];
  remountState?: RemountState;
  snapshotRef: UISnapshotRef;
};

const POLL_INTERVAL = 3000;
const OVERVIEW_POLL_INTERVAL = 60_000;

const initState = (remountState?: RemountState): State => {
  const snapshot = remountState?.snapshot;
  return {
    view: remountState?.prompt
      ? { mode: "confirm", prompt: remountState.prompt, cwd: remountState.cwd ?? "" }
      : { mode: "split" },
    focus: snapshot?.focus ?? FOCUS.left,
    selectedSession: remountState?.session ?? snapshot?.selectedSession,
    sessions: [],
    sessionsLoading: true,
    overviewResult: snapshot?.overviewResult,
  };
};

export const ManagerView: FC<Props> = ({
  actions,
  currentSession,
  directories,
  remountState,
  snapshotRef,
}) => {
  const { rows, columns } = useTerminalSize();
  const [state, setState] = useState<State>(() => initState(remountState));
  const overviewInFlightRef = useRef(false);

  const snapshot = remountState?.snapshot;
  const cursorsRef = useRef({
    session: { current: snapshot?.sessionListCursor ?? 0 },
    pane: { current: snapshot?.paneListCursor ?? 0 },
    overview: { current: snapshot?.overviewCursor ?? 0 },
    paneRestored: false,
  });

  const patch = useCallback((partial: Partial<State>): void => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const fetched = await actions.fetchSessions();
      setState((prev) => {
        const fetchedNames = new Set(fetched.map((s) => s.name));
        const userOnly = prev.sessions.filter(
          (s) => !fetchedNames.has(s.name) && s.groups.length === 0,
        );
        return { ...prev, sessions: [...userOnly, ...fetched], sessionsLoading: false };
      });
    } catch {
      patch({ sessionsLoading: false });
    }
  }, [actions, patch]);

  useInterval(() => void refresh(), POLL_INTERVAL);

  useInterval(
    () => {
      if (overviewInFlightRef.current) return;
      overviewInFlightRef.current = true;
      void actions
        .fetchOverview(state.sessions)
        .then((result) => {
          patch({ overviewResult: result });
        })
        .catch(() => {
          // keep previous items
        })
        .finally(() => {
          overviewInFlightRef.current = false;
        });
    },
    OVERVIEW_POLL_INTERVAL,
    !state.sessionsLoading,
  );

  useInput(
    (_input, key) => {
      if (key.tab) {
        setState((prev) => {
          const next =
            prev.focus === FOCUS.left
              ? FOCUS.right
              : prev.focus === FOCUS.right
                ? FOCUS.bottom
                : FOCUS.left;
          return { ...prev, focus: next };
        });
      }
    },
    { isActive: state.view.mode === "split" },
  );

  const resolvedSession = state.selectedSession ?? state.sessions[0]?.name;

  const paneInitialCursor =
    !cursorsRef.current.paneRestored && snapshot?.selectedSession === resolvedSession
      ? snapshot?.paneListCursor
      : undefined;
  if (paneInitialCursor !== undefined) cursorsRef.current.paneRestored = true;

  snapshotRef.current = {
    focus: state.focus,
    selectedSession: resolvedSession,
    sessionListCursor: cursorsRef.current.session.current,
    paneListCursor: cursorsRef.current.pane.current,
    overviewCursor: cursorsRef.current.overview.current,
    overviewResult: state.overviewResult ?? { overallSummary: "", sessions: [] },
  };

  const selectedManagedSession = useMemo(
    () => state.sessions.find((s) => s.name === resolvedSession),
    [state.sessions, resolvedSession],
  );

  const selectedGroup = useMemo(() => {
    if (!selectedManagedSession) return undefined;
    return {
      sessionName: selectedManagedSession.name,
      tabs: selectedManagedSession.groups.flatMap((g) => g.tabs),
    };
  }, [selectedManagedSession]);

  const allGroups = useMemo(
    () => state.sessions.flatMap((s) => s.groups),
    [state.sessions],
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
    patch({ view: { mode: "addSession" } });
  }, [patch]);

  const handleAddSessionSelect = useCallback(
    (path: string): void => {
      const name = basename(path);
      setState((prev) => {
        const exists = prev.sessions.some((s) => s.name === name);
        return {
          ...prev,
          view: { mode: "split" },
          selectedSession: name,
          sessions: exists ? prev.sessions : [{ name, path, groups: [] }, ...prev.sessions],
        };
      });
    },
    [],
  );

  const handleCancelAddSession = useCallback((): void => {
    patch({ view: { mode: "split" } });
  }, [patch]);

  const handleDeleteSession = useCallback(
    (name: string): void => {
      patch({ view: { mode: "deleteSession", sessionName: name } });
    },
    [patch],
  );

  const handleConfirmDelete = useCallback((): void => {
    if (state.view.mode !== "deleteSession") return;
    const { sessionName } = state.view;
    const session = state.sessions.find((s) => s.name === sessionName);
    setState((prev) => ({
      ...prev,
      view: { mode: "split" },
      sessions: prev.sessions.filter((s) => s.name !== sessionName),
      selectedSession:
        prev.selectedSession === sessionName ? undefined : prev.selectedSession,
    }));
    if (session) {
      const killAll = Promise.all(
        session.groups.map((g) => swallow(() => actions.killSession(g.sessionName))),
      );
      void killAll.then(() => void refresh());
    }
  }, [state.view, state.sessions, actions, refresh]);

  const handleCancelDelete = useCallback((): void => {
    patch({ view: { mode: "split" } });
  }, [patch]);

  const handleNewSession = useCallback((): void => {
    patch({ view: { mode: "promptInput" } });
  }, [patch]);

  const handleOpenEditor = useCallback(
    (sessionName: string): void => {
      const cwd = selectedManagedSession?.path;
      if (!cwd) return;
      actions.openEditor(sessionName, cwd);
    },
    [actions, selectedManagedSession],
  );

  const handlePromptInputSubmit = useCallback(
    (prompt: string): void => {
      const cwd = selectedManagedSession?.path;
      if (!cwd) return;
      patch({ view: { mode: "confirm", prompt, cwd } });
    },
    [patch, selectedManagedSession],
  );

  const handlePromptInputCancel = useCallback((): void => {
    patch({ view: { mode: "split" } });
  }, [patch]);

  const handleConfirmNew = useCallback(
    ({ worktree }: { worktree: boolean }): void => {
      if (state.view.mode !== "confirm") return;
      if (!resolvedSession) return;
      void actions
        .createSession(resolvedSession, state.view.cwd, state.view.prompt, worktree)
        .then(() => void refresh());
      patch({ view: { mode: "split" } });
    },
    [state.view, resolvedSession, actions, refresh, patch],
  );

  const handleCancelConfirm = useCallback((): void => {
    patch({ view: { mode: "split" } });
  }, [patch]);

  const handleSessionSelect = useCallback(
    (name: string): void => {
      patch({ selectedSession: name, focus: FOCUS.right });
    },
    [patch],
  );

  const handleSessionCursorChange = useCallback(
    (name: string): void => {
      patch({ selectedSession: name });
    },
    [patch],
  );

  const handleNavigate = useCallback(
    (up: UnifiedPane): void => {
      void actions.navigateToPane(up);
    },
    [actions],
  );

  const handleBack = useCallback((): void => {
    patch({ focus: FOCUS.left });
  }, [patch]);

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

  if (state.sessionsLoading) {
    return (
      <Box flexDirection="column" height={rows}>
        <Header title={`${APP_TITLE} v${APP_VERSION}`} />
        <StatusBar message="Loading..." type="info" />
      </Box>
    );
  }

  if (state.view.mode === "addSession") {
    return (
      <DirectorySearchView
        directories={directories}
        onSelect={handleAddSessionSelect}
        onCancel={handleCancelAddSession}
      />
    );
  }

  if (state.view.mode === "deleteSession") {
    const { sessionName } = state.view;
    const deleteSession = state.sessions.find((s) => s.name === sessionName);
    const paneCount =
      deleteSession?.groups.reduce(
        (sum, g) => sum + g.tabs.reduce((s, t) => s + t.panes.length, 0),
        0,
      ) ?? 0;
    return (
      <DeleteSessionView
        sessionName={sessionName}
        paneCount={paneCount}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    );
  }

  if (state.view.mode === "promptInput") {
    return (
      <PromptInputView
        selectedDir={resolvedSession ?? ""}
        onSubmit={handlePromptInputSubmit}
        onCancel={handlePromptInputCancel}
      />
    );
  }

  if (state.view.mode === "confirm") {
    return (
      <ConfirmView
        selectedDir={resolvedSession ?? ""}
        prompt={state.view.prompt}
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
          borderColor={state.focus === FOCUS.left ? "green" : "gray"}
        >
          <SessionListPanel
            sessions={state.sessions}
            currentSession={currentSession}
            isFocused={state.focus === FOCUS.left}
            availableRows={topHeight - 2}
            onSelect={handleSessionSelect}
            onCursorChange={handleSessionCursorChange}
            onDeleteSession={handleDeleteSession}
            onAddSession={handleOpenAddSession}
            initialCursor={snapshot?.sessionListCursor}
            cursorRef={cursorsRef.current.session}
          />
        </Box>
        <Box
          flexDirection="column"
          width={rightWidth}
          borderStyle="round"
          borderColor={state.focus === FOCUS.right ? "green" : "gray"}
        >
          <PaneListPanel
            selectedSession={resolvedSession}
            group={selectedGroup}
            isFocused={state.focus === FOCUS.right}
            availableRows={topHeight - 2}
            onNavigate={handleNavigate}
            onHighlight={handleHighlight}
            onUnhighlight={handleUnhighlight}
            onBack={handleBack}
            onNewSession={handleNewSession}
            onOpenEditor={handleOpenEditor}
            onKillPane={handleKillPane}
            initialCursor={paneInitialCursor}
            cursorRef={cursorsRef.current.pane}
          />
        </Box>
      </Box>
      <SessionOverviewPanel
        overallSummary={state.overviewResult?.overallSummary ?? ""}
        items={state.overviewResult?.sessions ?? []}
        groups={allGroups}
        isLoading={!state.overviewResult}
        isFocused={state.focus === FOCUS.bottom}
        availableRows={bottomHeight}
        onBack={handleBack}
        initialCursor={snapshot?.overviewCursor}
        cursorRef={cursorsRef.current.overview}
      />
      <StatusBar
        message={
          state.focus === FOCUS.left
            ? "\u2191/\u2193 move  Enter/\u2192 select  Tab next  n add  d delete  q quit"
            : state.focus === FOCUS.right
              ? "\u2191/\u2193 move  Enter focus  Tab next  n new  v vim  d kill  Esc/\u2190 back  q quit"
              : "\u2191/\u2193 scroll  Tab next  Esc/\u2190 back  q quit"
        }
        statusCounts={statusCounts}
      />
    </Box>
  );
};
