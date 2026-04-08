import type { Infra } from "../infra/index.ts";
import {
  createSessionDetectionService,
  type SessionDetectionService,
} from "./session-detection-service.ts";
import { createTmuxService, type TmuxService } from "./tmux-service.ts";
import { createDirectoryScanService, type DirectoryScanService } from "./directory-scan-service.ts";

export type ServiceContext = {
  infra: Infra;
};

export type Services = {
  tmux: TmuxService;
  sessionDetection: SessionDetectionService;
  directoryScan: DirectoryScanService;
};

export const createServices = (context: ServiceContext): Services => ({
  tmux: createTmuxService(context),
  sessionDetection: createSessionDetectionService(),
  directoryScan: createDirectoryScanService(),
});
