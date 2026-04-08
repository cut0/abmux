import { basename } from "node:path";
import { render } from "ink";
import { createElement } from "react";
import { ManagerView, type ManagerActions } from "../components/ManagerView.tsx";
import type { Infra } from "../infra/index.ts";
import type { Services } from "../services/index.ts";
import type { Usecases } from "../usecases/index.ts";
import type { ManagedSession, UnifiedPane } from "../models/session.ts";
import { findMatchingDirectory } from "../utils/PathUtils.ts";

type TuiCommandDeps = {
  usecases: Usecases;
  services: Services;
  infra: Infra;
};

export const createTuiCommand =
  ({ usecases, services, infra }: TuiCommandDeps) =>
  async (): Promise<void> => {
    const directories = await services.directoryScan.scan();

    let instance: ReturnType<typeof render>;
    let pendingPrompt: string | undefined;
    let pendingSession: string | undefined;
    let pendingCwd: string | undefined;

    const actions: ManagerActions = {
      fetchSessions: async (): Promise<ManagedSession[]> => {
        const result = await usecases.manager.list();
        const resolved = await Promise.all(
          result.sessionGroups.map(async (group) => {
            const enrichedGroup = {
              sessionName: group.sessionName,
              tabs: await Promise.all(
                group.tabs.map(async (tab) => ({
                  windowIndex: tab.windowIndex,
                  windowName: tab.windowName,
                  panes: await Promise.all(
                    tab.panes.map((up) => usecases.manager.enrichStatus(up)),
                  ),
                })),
              ),
            };
            const paneCwd = group.tabs[0]?.panes[0]?.pane.cwd ?? "";
            const path = findMatchingDirectory(paneCwd, directories) ?? paneCwd;
            return { path, group: enrichedGroup };
          }),
        );
        const grouped = Map.groupBy(resolved, (item) => item.path || item.group.sessionName);
        return [...grouped.entries()].map(([key, items]) => ({
          name: basename(key) || items[0].group.sessionName,
          path: items[0].path,
          groups: items.map((item) => item.group),
        }));
      },
      createSession: async (sessionName: string, cwd: string, prompt: string): Promise<void> => {
        await usecases.manager.createSession({ sessionName, cwd, prompt });
      },
      killSession: async (sessionName: string): Promise<void> => {
        await usecases.manager.killSession(sessionName);
      },
      killPane: async (paneId: string): Promise<void> => {
        await usecases.manager.killPane(paneId);
      },
      highlightWindow: async (up: UnifiedPane): Promise<void> => {
        await usecases.manager.highlightWindow(up);
      },
      unhighlightWindow: async (up: UnifiedPane): Promise<void> => {
        await usecases.manager.unhighlightWindow(up);
      },
      openEditor: (sessionName: string, cwd: string): string | undefined => {
        instance.unmount();
        const prompt = infra.editor.open();
        pendingPrompt = prompt;
        pendingSession = sessionName;
        pendingCwd = cwd;
        instance = renderApp();
        return prompt;
      },
      navigateToPane: async (up: UnifiedPane): Promise<void> => {
        const target = `${up.pane.sessionName}:${String(up.pane.windowIndex)}`;
        await infra.tmuxCli.selectWindow(target);
        await infra.tmuxCli.selectPane(up.pane.paneId);
        instance.unmount();
        await infra.tmuxCli.attachSession(up.pane.sessionName);
        instance = renderApp();
      },
    };

    const renderApp = (): ReturnType<typeof render> => {
      const prompt = pendingPrompt;
      const session = pendingSession;
      const cwd = pendingCwd;
      pendingPrompt = undefined;
      pendingSession = undefined;
      pendingCwd = undefined;
      const rawCwd = process.cwd();
      const currentSession = basename(findMatchingDirectory(rawCwd, directories) ?? rawCwd);
      return render(
        createElement(ManagerView, {
          actions,
          currentSession,
          directories,
          restoredPrompt: prompt,
          restoredSession: session,
          restoredCwd: cwd,
        }),
        { concurrent: true },
      );
    };

    instance = renderApp();
    await instance.waitUntilExit();
  };
