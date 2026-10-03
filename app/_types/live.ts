export enum LiveStatus {
  Joining = "joining",
  Live = "live",
  Offline = "offline",
  Refused = "refused",
}

export enum LiveType {
  Ready = "ready",
  Update = "update",
  Awareness = "awareness",
}

export type LiveMessage =
  | {
      type: LiveType.Ready;
      snapshot: string;
      initialize: boolean;
      markdown: string;
    }
  | { type: LiveType.Update | LiveType.Awareness; data: string };
