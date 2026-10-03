import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";

export enum LiveStatus {
  Joining = "joining",
  Live = "live",
  Offline = "offline",
  Refused = "refused",
}

export enum LiveRefusals {
  Refused = "refused",
  Encrypted = "encrypted",
  Locked = "locked",
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
      generation: string;
      initialize: boolean;
      markdown: string;
    }
  | { type: LiveType.Update | LiveType.Awareness; data: string };

declare global {
  var __jottyLiveUpgrade:
    | ((req: IncomingMessage, socket: Socket, head: Buffer, actor: string, sessionId: string) => void)
    | undefined;
  var __jottyLiveRecheck: (() => Promise<unknown>) | undefined;
}
