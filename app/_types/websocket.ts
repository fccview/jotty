export interface WsEvent {
  type: "checklist" | "note" | "category" | "settings" | "sharing" | "notification" | "relations" | "attachments";
  action: "created" | "updated" | "deleted";
  entityId?: string;
  username: string;
  recipient?: string;
  connectionId?: string;
}

declare global {
  var __jottyBroadcast: ((event: WsEvent) => void) | undefined;
  var __jottyHasConnectedClients: (() => boolean) | undefined;
}
