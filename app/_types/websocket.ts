export interface WsEvent {
  type: "checklist" | "note" | "category" | "settings" | "sharing";
  action: "created" | "updated" | "deleted";
  entityId?: string;
  username: string;
  connectionId?: string;
}

declare global {
  var __jottyBroadcast: ((event: WsEvent) => void) | undefined;
}
