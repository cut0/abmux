export type PaneSummaryItem = {
  paneTitle: string;
  description: string;
};

export type SessionSummaryItem = {
  sessionName: string;
  panes: PaneSummaryItem[];
};

export type SessionSummaryResult = {
  overallSummary: string;
  sessions: SessionSummaryItem[];
};

export const SESSION_SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    overallSummary: { type: "string" },
    sessions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sessionName: { type: "string" },
          panes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                paneTitle: { type: "string" },
                description: { type: "string" },
              },
              required: ["paneTitle", "description"],
            },
          },
        },
        required: ["sessionName", "panes"],
      },
    },
  },
  required: ["overallSummary", "sessions"],
} as const;
