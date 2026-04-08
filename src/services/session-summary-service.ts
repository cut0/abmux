import type { SessionSummaryResult } from "../models/claude-session.ts";
import type { SessionGroup } from "../models/session.ts";
import { SESSION_STATUS_LABEL } from "../models/session.ts";
import type { ServiceContext } from "./index.ts";

const EMPTY_RESULT: SessionSummaryResult = { overallSummary: "", sessions: [] };

export type SessionSummaryService = {
  fetchSummary: (groups: SessionGroup[]) => Promise<SessionSummaryResult>;
};

const formatGroupsForPrompt = (groups: SessionGroup[]): string => {
  const lines: string[] = [];
  for (const group of groups) {
    const panes = group.tabs.flatMap((t) => t.panes);
    const paneDescriptions = panes.map((p) => {
      if (p.kind === "claude") {
        const status = p.claudeStatus ? SESSION_STATUS_LABEL[p.claudeStatus] : "idle";
        const title = p.claudeTitle ?? "";
        return `  - [claude] status=${status} title="${title}"`;
      }
      return `  - [${p.kind}] title="${p.pane.title}"`;
    });
    lines.push(`session: ${group.sessionName}`);
    lines.push(`  panes (${String(panes.length)}):`);
    lines.push(...paneDescriptions);
  }
  return lines.join("\n");
};

const buildPrompt = (groups: SessionGroup[]): string => {
  const data = formatGroupsForPrompt(groups);
  return [
    "以下は tmux セッションとペインの一覧です。",
    "overallSummary: 全体として今どういう作業が行われていて、どういう状態かを日本語で簡潔に1〜2文で説明してください。",
    "sessions.panes: 各ペインが何をしているか、日本語で簡潔に1文ずつ説明してください。",
    "sessionName はそのまま、paneTitle はペインの title をそのまま入れてください。",
    "",
    data,
  ].join("\n");
};

export const createSessionSummaryService = (context: ServiceContext): SessionSummaryService => ({
  fetchSummary: async (groups: SessionGroup[]): Promise<SessionSummaryResult> => {
    if (groups.length === 0) return EMPTY_RESULT;
    const prompt = buildPrompt(groups);
    return await context.infra.claudeCli.querySessionSummary(prompt);
  },
});
