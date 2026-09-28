export interface WsEvent {
  type: "checklist" | "note" | "category" | "settings" | "sharing" | "notification" | "relations";
  action: "created" | "updated" | "deleted";
  entityId?: string;
  username: string;
  connectionId?: string;
}

declare global {
  var __jottyBroadcast: ((event: WsEvent) => void) | undefined;
  var __jottyHasConnectedClients: (() => boolean) | undefined;
}
