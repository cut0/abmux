import { describe, it, expect, beforeEach, vi } from "vitest";
import { createManagerUsecase, type ManagerUsecase } from "./manager-usecase.ts";
import type { TmuxService } from "../services/tmux-service.ts";
import type { SessionDetectionService } from "../services/session-detection-service.ts";
import type { Infra } from "../infra/index.ts";
import type { TmuxCli } from "../infra/tmux-cli.ts";
import type { UnifiedPane } from "../models/session.ts";
import type { TmuxPane } from "../models/tmux.ts";

const mockPane = (overrides: Partial<TmuxPane> = {}): TmuxPane => ({
  sessionName: "default",
  windowIndex: 0,
  paneIndex: 0,
  paneId: "%0",
  cwd: "/home/user",
  title: "zsh",
  windowName: "zsh",
  isActive: false,
  paneWidth: 80,
  paneHeight: 24,
  ...overrides,
});

const mockUnifiedPane = (overrides: Partial<UnifiedPane> = {}): UnifiedPane => ({
  pane: mockPane({ paneId: "%5", windowIndex: 2 }),
  kind: "available",
  ...overrides,
});

const createMockTmuxService = (): TmuxService => ({
  listPanes: vi.fn().mockResolvedValue([]),
  createNewWindow: vi.fn().mockResolvedValue(undefined),
  splitWindow: vi.fn().mockResolvedValue(undefined),
  sendCommand: vi.fn().mockResolvedValue(undefined),
  sendKeys: vi.fn().mockResolvedValue(undefined),
  attachSession: vi.fn().mockResolvedValue(undefined),
  killPane: vi.fn().mockResolvedValue(undefined),
  killSession: vi.fn().mockResolvedValue(undefined),
  renameWindow: vi.fn().mockResolvedValue(undefined),
  getText: vi.fn().mockResolvedValue(""),
});

const createMockSessionDetectionService = (): SessionDetectionService => ({
  groupBySession: vi.fn().mockReturnValue([]),
  detectStatusFromText: vi.fn().mockReturnValue("waiting-input"),
});

const createMockTmuxCli = (): TmuxCli =>
  ({
    listPanes: vi.fn().mockResolvedValue([]),
    newSession: vi.fn().mockResolvedValue("test"),
    newWindow: vi.fn().mockResolvedValue(undefined),
    splitWindow: vi.fn().mockResolvedValue(undefined),
    sendKeys: vi.fn().mockResolvedValue(undefined),
    capturePane: vi.fn().mockResolvedValue(""),
    selectPane: vi.fn().mockResolvedValue(undefined),
    selectWindow: vi.fn().mockResolvedValue(undefined),
    renameWindow: vi.fn().mockResolvedValue(undefined),
    attachSession: vi.fn().mockResolvedValue(undefined),
    killPane: vi.fn().mockResolvedValue(undefined),
    killSession: vi.fn().mockResolvedValue(undefined),
    hasSession: vi.fn().mockResolvedValue(false),
  }) as TmuxCli;

describe("createManagerUsecase", () => {
  let mockTmux: TmuxService;
  let mockTmuxCli: TmuxCli;
  let mockSessionDetection: SessionDetectionService;
  let usecase: ManagerUsecase;

  beforeEach(() => {
    mockTmux = createMockTmuxService();
    mockTmuxCli = createMockTmuxCli();
    mockSessionDetection = createMockSessionDetectionService();
    usecase = createManagerUsecase({
      services: {
        tmux: mockTmux,
        sessionDetection: mockSessionDetection,
        directoryScan: { scan: vi.fn().mockResolvedValue([]) },
      },
      infra: { tmuxCli: mockTmuxCli, editor: { open: () => undefined } },
    });
  });

  describe("list", () => {
    it("ペイン一覧を取得してセッショングループを返す", async () => {
      const panes = [mockPane()];
      const groups = [
        {
          sessionName: "project",
          tabs: [{ windowIndex: 0, windowName: "zsh", panes: [mockUnifiedPane()] }],
        },
      ];
      vi.mocked(mockTmux.listPanes).mockResolvedValue(panes);
      vi.mocked(mockSessionDetection.groupBySession).mockReturnValue(groups);

      const result = await usecase.list();
      expect(result.sessionGroups).toBe(groups);
      expect(mockTmux.listPanes).toHaveBeenCalledOnce();
    });
  });

  describe("enrichStatus", () => {
    it("claude ペインのステータスを capture-pane で詳細化する", async () => {
      const up = mockUnifiedPane({ kind: "claude", claudeStatus: "tool-running" });
      vi.mocked(mockTmux.getText).mockResolvedValue("something\n❯ \n-- INSERT --");
      vi.mocked(mockSessionDetection.detectStatusFromText).mockReturnValue("waiting-input");

      const result = await usecase.enrichStatus(up);
      expect(result.claudeStatus).toBe("waiting-input");
    });

    it("claude 以外のペインはそのまま返す", async () => {
      const up = mockUnifiedPane({ kind: "available" });
      const result = await usecase.enrichStatus(up);
      expect(result).toBe(up);
      expect(mockTmux.getText).not.toHaveBeenCalled();
    });
  });

  describe("navigateTo", () => {
    it("対象セッションに attach する", async () => {
      const up = mockUnifiedPane({ pane: mockPane({ sessionName: "my-project" }) });
      await usecase.navigateTo(up);
      expect(mockTmux.attachSession).toHaveBeenCalledWith("my-project");
    });
  });

  describe("createSession", () => {
    it("新しい tmux session を作成して Claude を起動する", async () => {
      vi.mocked(mockTmuxCli.hasSession).mockResolvedValue(false);
      vi.mocked(mockTmuxCli.listPanes).mockResolvedValue([
        mockPane({ sessionName: "my-project", paneId: "%10", windowIndex: 0, paneIndex: 0 }),
      ]);
      await usecase.createSession({
        sessionName: "my-project",
        cwd: "/home/user/my-project",
        prompt: "テスト",
      });
      expect(mockTmuxCli.newSession).toHaveBeenCalled();
      expect(mockTmux.sendCommand).toHaveBeenCalledWith({
        target: "%10",
        command: "claude -w -- 'テスト'",
      });
    });

    it("既存 session がある場合は新しい window を作成する", async () => {
      vi.mocked(mockTmuxCli.hasSession).mockResolvedValue(true);
      vi.mocked(mockTmuxCli.listPanes).mockResolvedValue([
        mockPane({ sessionName: "my-project", paneId: "%11", windowIndex: 1, paneIndex: 0 }),
      ]);
      await usecase.createSession({
        sessionName: "my-project",
        cwd: "/home/user/my-project",
        prompt: "テスト",
      });
      expect(mockTmuxCli.newSession).not.toHaveBeenCalled();
      expect(mockTmuxCli.newWindow).toHaveBeenCalled();
    });

    it("プロンプト内のシェル特殊文字がエスケープされる", async () => {
      vi.mocked(mockTmuxCli.hasSession).mockResolvedValue(false);
      vi.mocked(mockTmuxCli.listPanes).mockResolvedValue([
        mockPane({ sessionName: "proj", paneId: "%7", windowIndex: 0, paneIndex: 0 }),
      ]);
      await usecase.createSession({
        sessionName: "proj",
        cwd: "/home/user/proj",
        prompt: "it's a $test",
      });
      expect(mockTmux.sendCommand).toHaveBeenCalledWith({
        target: "%7",
        command: "claude -w -- 'it'\\''s a $test'",
      });
    });
  });

  describe("highlightWindow", () => {
    it("ウィンドウ名に ▶ マーカーを設定する", async () => {
      const up = mockUnifiedPane({
        pane: mockPane({ sessionName: "proj", windowIndex: 1 }),
        claudeTitle: "API実装",
      });
      await usecase.highlightWindow(up);
      expect(mockTmux.renameWindow).toHaveBeenCalledWith({
        target: "proj:1",
        name: "▶ API実装",
      });
    });
  });

  describe("unhighlightWindow", () => {
    it("ウィンドウ名を空文字に戻す", async () => {
      const up = mockUnifiedPane({ pane: mockPane({ sessionName: "proj", windowIndex: 1 }) });
      await usecase.unhighlightWindow(up);
      expect(mockTmux.renameWindow).toHaveBeenCalledWith({ target: "proj:1", name: "" });
    });
  });

  describe("killSession", () => {
    it("tmux セッションを kill する", async () => {
      await usecase.killSession("my-session");
      expect(mockTmux.killSession).toHaveBeenCalledWith("my-session");
    });
  });
});
