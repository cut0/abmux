import { describe, it, expect, beforeEach } from "vitest";
import {
  createSessionDetectionService,
  type SessionDetectionService,
} from "./session-detection-service.ts";
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

describe("createSessionDetectionService", () => {
  let service: SessionDetectionService;

  beforeEach(() => {
    service = createSessionDetectionService();
  });

  describe("groupBySession", () => {
    it("ペインを UnifiedPane に変換してディレクトリ > ウィンドウでグループ化する", () => {
      const panes = [
        mockPane({
          title: "\u2733 API実装",
          paneId: "%1",
          paneIndex: 0,
          windowIndex: 0,
          cwd: "/project-a",
        }),
        mockPane({ title: "zsh", paneId: "%2", paneIndex: 1, windowIndex: 0, cwd: "/project-a" }),
        mockPane({ title: "nvim", paneId: "%3", paneIndex: 2, windowIndex: 0, cwd: "/project-a" }),
      ];
      const result = service.groupBySession({ panes });
      expect(result).toHaveLength(1);
      expect(result[0].tabs[0].panes).toHaveLength(3);
      expect(result[0].tabs[0].panes[0].kind).toBe("claude");
      expect(result[0].tabs[0].panes[0].claudeTitle).toBe("API実装");
      expect(result[0].tabs[0].panes[1].kind).toBe("available");
      expect(result[0].tabs[0].panes[2].kind).toBe("busy");
    });

    it("Braille prefix のペインを claude として分類する", () => {
      const panes = [
        mockPane({ title: "\u2810 タスク", paneId: "%1", windowIndex: 0, cwd: "/project" }),
      ];
      const result = service.groupBySession({ panes });
      expect(result[0].tabs[0].panes[0].kind).toBe("claude");
      expect(result[0].tabs[0].panes[0].claudeStatus).toBe("thinking");
    });

    it("同じセッションの複数ウィンドウをまとめる", () => {
      const panes = [
        mockPane({ title: "zsh", paneId: "%1", windowIndex: 0, cwd: "/project" }),
        mockPane({ title: "zsh", paneId: "%2", windowIndex: 3, cwd: "/project" }),
      ];
      const result = service.groupBySession({ panes });
      expect(result).toHaveLength(1);
      expect(result[0].tabs).toHaveLength(2);
    });

    it("paneIndex 昇順でソートされる", () => {
      const panes = [
        mockPane({ title: "zsh", paneId: "%30", paneIndex: 1, windowIndex: 0, cwd: "/project" }),
        mockPane({ title: "zsh", paneId: "%10", paneIndex: 0, windowIndex: 0, cwd: "/project" }),
      ];
      const result = service.groupBySession({ panes });
      expect(result[0].tabs[0].panes[0].pane.paneIndex).toBe(0);
      expect(result[0].tabs[0].panes[1].pane.paneIndex).toBe(1);
    });

    it("空のペインリストでは空配列を返す", () => {
      expect(service.groupBySession({ panes: [] })).toHaveLength(0);
    });
  });

  describe("detectStatusFromText", () => {
    it("確認プロンプトが表示されている場合、確認待ちを返す", () => {
      expect(service.detectStatusFromText("Do you want to proceed?\nEsc to cancel")).toBe(
        "waiting-confirm",
      );
    });

    it("Running… が表示されている場合、ツール実行中を返す", () => {
      expect(service.detectStatusFromText("Bash(ls)\n  Running\u2026")).toBe("tool-running");
    });

    it("ろーでぃんぐ が表示されている場合、思考中を返す", () => {
      expect(service.detectStatusFromText("\u2733 ろーでぃんぐ\u2026 (10s)")).toBe("thinking");
    });

    it("❯ プロンプトが表示されている場合、入力待ちを返す", () => {
      expect(service.detectStatusFromText("Done\n\u2770 \n-- INSERT --")).toBe("waiting-input");
    });

    it("判定できない場合は待機中を返す", () => {
      expect(service.detectStatusFromText("some output")).toBe("idle");
    });
  });
});
