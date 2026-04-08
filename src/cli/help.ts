import { APP_TITLE, APP_VERSION } from "../constants.ts";

export const printHelp = (): void => {
  console.log(`${APP_TITLE} v${APP_VERSION}

Usage:
  abmux                              Start TUI
  abmux new <prompt> [--dir <path>]  Create session and launch Claude
  abmux open [session]               Attach to session
  abmux kill [session]               Kill session
  abmux list                         List sessions
  abmux --help                       Show this help`);
};
