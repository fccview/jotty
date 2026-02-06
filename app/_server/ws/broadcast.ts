"use server";

import type { WsEvent } from "@/app/_types";

export async function broadcast(event: Omit<WsEvent, "connectionId">): Promise<void> {
  if (!globalThis.__jottyBroadcast) {
    console.warn("[ws] broadcast called but __jottyBroadcast not set");
    return;
  }
  globalThis.__jottyBroadcast(event);
}
