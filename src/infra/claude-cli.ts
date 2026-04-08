import { execFile, execFileSync } from "node:child_process";
import { SESSION_SUMMARY_SCHEMA, type SessionSummaryResult } from "../models/claude-session.ts";

export type ClaudeCli = {
  querySessionSummary: (prompt: string) => Promise<SessionSummaryResult>;
};

type ClaudeJsonOutput = {
  type: string;
  subtype: string;
  result: string;
  is_error: boolean;
  structured_output?: unknown;
};

const resolveClaudePath = (): string => {
  try {
    return execFileSync("which", ["claude"], { encoding: "utf-8" }).trim();
  } catch {
    return "claude";
  }
};

const claudePath = resolveClaudePath();

const EMPTY_RESULT: SessionSummaryResult = { overallSummary: "", sessions: [] };

const execClaude = (args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    execFile(claudePath, args, { timeout: 120_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`claude failed: ${stderr || error.message}`));
        return;
      }
      resolve(stdout.trim());
    });
  });

const parseResult = (raw: string): SessionSummaryResult => {
  const output: ClaudeJsonOutput = JSON.parse(raw);
  if (output.is_error) return EMPTY_RESULT;
  const parsed: unknown = output.structured_output;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("sessions" in parsed) ||
    !Array.isArray((parsed as SessionSummaryResult).sessions)
  ) {
    return EMPTY_RESULT;
  }
  const result = parsed as SessionSummaryResult;
  return {
    overallSummary: result.overallSummary ?? "",
    sessions: result.sessions,
  };
};

export const createClaudeCli = (): ClaudeCli => ({
  querySessionSummary: async (prompt: string): Promise<SessionSummaryResult> => {
    try {
      const raw = await execClaude([
        "-p",
        "--output-format",
        "json",
        "--json-schema",
        JSON.stringify(SESSION_SUMMARY_SCHEMA),
        "--no-session-persistence",
        "--model",
        "haiku",
        prompt,
      ]);
      return parseResult(raw);
    } catch {
      return EMPTY_RESULT;
    }
  },
});
