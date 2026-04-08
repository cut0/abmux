export type TmuxPane = {
  sessionName: string;
  windowIndex: number;
  paneIndex: number;
  paneId: string;
  cwd: string;
  title: string;
  windowName: string;
  isActive: boolean;
  paneWidth: number;
  paneHeight: number;
};
