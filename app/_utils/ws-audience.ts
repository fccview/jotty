import type { WsEvent } from "@/app/_types";

export const reachesUser = (
  event: Pick<WsEvent, "recipient">,
  username: string | null | undefined,
): boolean => !event.recipient || event.recipient === username;
