import { basename } from "node:path";
import { render } from "ink";
import { createElement } from "react";
import { ManagerView, type ManagerActions } from "../components/ManagerView.tsx";
import type { Infra } from "../infra/index.ts";
import type { Services } from "../services/index.ts";
import type { Usecases } from "../usecases/index.ts";
import type { SessionGroup, UnifiedPane } from "../models/session.ts";

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

    const actions: ManagerActions = {
      fetchSessions: async (): Promise<SessionGroup[]> => {
        const result = await usecases.manager.list();
        return await Promise.all(
          result.sessionGroups.map(async (group) => ({
            sessionName: group.sessionName,
            tabs: await Promise.all(
              group.tabs.map(async (tab) => ({
                windowIndex: tab.windowIndex,
                windowName: tab.windowName,
                panes: await Promise.all(tab.panes.map((up) => usecases.manager.enrichStatus(up))),
              })),
            ),
          })),
        );
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
      openEditor: (sessionName: string): string | undefined => {
        instance.unmount();
        const prompt = infra.editor.open();
        pendingPrompt = prompt;
        pendingSession = sessionName;
        instance = renderApp();
        return prompt;
      },
      attachSession: (sessionName: string): void => {
        instance.unmount();
        void infra.tmuxCli.attachSession(sessionName);
        instance = renderApp();
      },
    };

    const renderApp = (): ReturnType<typeof render> => {
      const prompt = pendingPrompt;
      const session = pendingSession;
      pendingPrompt = undefined;
      pendingSession = undefined;
      return render(
        createElement(ManagerView, {
          actions,
          currentSession: basename(process.cwd()),
          currentCwd: process.cwd(),
          directories,
          restoredPrompt: prompt,
          restoredSession: session,
        }),
        { concurrent: true },
      );
    };

    instance = renderApp();
    await instance.waitUntilExit();
  };
