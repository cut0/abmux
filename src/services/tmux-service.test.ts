import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTmuxService, type TmuxService } from "./tmux-service.ts";
import type { TmuxCli } from "../infra/tmux-cli.ts";
import type { Infra } from "../infra/index.ts";

const createMockTmuxCli = (): TmuxCli =>
  ({
    listPanes: vi.fn().mockResolvedValue([]),
    newSession: vi.fn().mockResolvedValue("test-session"),
    newWindow: vi.fn().mockResolvedValue(undefined),
    splitWindow: vi.fn().mockResolvedValue(undefined),
    sendKeys: vi.fn().mockResolvedValue(undefined),
    capturePane: vi.fn().mockResolvedValue("some text"),
    selectPane: vi.fn().mockResolvedValue(undefined),
    selectWindow: vi.fn().mockResolvedValue(undefined),
    renameWindow: vi.fn().mockResolvedValue(undefined),
    attachSession: vi.fn().mockResolvedValue(undefined),
    killPane: vi.fn().mockResolvedValue(undefined),
    killSession: vi.fn().mockResolvedValue(undefined),
    hasSession: vi.fn().mockResolvedValue(true),
  }) as TmuxCli;

describe("createTmuxService", () => {
  let mockCli: TmuxCli;
  let service: TmuxService;

  beforeEach(() => {
    mockCli = createMockTmuxCli();
    const infra: Infra = {
      tmuxCli: mockCli,
      editor: { open: () => undefined },
      claudeCli: { querySessionSummary: vi.fn().mockResolvedValue({ sessions: [] }) },
    };
    service = createTmuxService({ infra });
  });

  describe("listPanes", () => {
    it("tmuxCli.listPanes を呼び出してペイン一覧を返す", async () => {
      const panes = [{ paneId: "%0" }];
      vi.mocked(mockCli.listPanes).mockResolvedValue(panes as never);
      const result = await service.listPanes();
      expect(result).toBe(panes);
      expect(mockCli.listPanes).toHaveBeenCalledOnce();
    });
  });

  describe("sendCommand", () => {
    it("tmuxCli.sendKeys を呼び出す", async () => {
      await service.sendCommand({ target: "%3", command: "ls -la" });
      expect(mockCli.sendKeys).toHaveBeenCalledWith({
        target: "%3",
        keys: "ls -la",
      });
    });
  });

  describe("attachSession", () => {
    it("tmuxCli.attachSession を呼び出す", async () => {
      await service.attachSession("my-session");
      expect(mockCli.attachSession).toHaveBeenCalledWith("my-session");
    });
  });

  describe("killSession", () => {
    it("tmuxCli.killSession を呼び出す", async () => {
      await service.killSession("my-session");
      expect(mockCli.killSession).toHaveBeenCalledWith("my-session");
    });
  });

  describe("renameWindow", () => {
    it("tmuxCli.renameWindow を呼び出す", async () => {
      await service.renameWindow({ target: "sess:0", name: "\u25B6 Task" });
      expect(mockCli.renameWindow).toHaveBeenCalledWith({ target: "sess:0", name: "\u25B6 Task" });
    });
  });

  describe("getText", () => {
    it("tmuxCli.capturePane を呼び出してペイン内容を返す", async () => {
      vi.mocked(mockCli.capturePane).mockResolvedValue("pane content");
      const result = await service.getText("%5");
      expect(result).toBe("pane content");
      expect(mockCli.capturePane).toHaveBeenCalledWith("%5");
    });
  });
});
