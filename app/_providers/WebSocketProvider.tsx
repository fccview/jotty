"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useEditorActivityStore } from "@/app/_utils/editor-activity-store";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import type { WsEvent } from "@/app/_types";

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (handler: (event: WsEvent) => void) => () => void;
}

const _noop = () => () => {};

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  subscribe: _noop,
});

export const useWebSocket = () => useContext(WebSocketContext);

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;
const REFRESH_DEBOUNCE = 500;

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { user } = useAppMode();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const connectionIdRef = useRef<string | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPendingUpdates = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const listenersRef = useRef<Set<(event: WsEvent) => void>>(new Set());

  const isEditorActive = useEditorActivityStore((s) => s.isActive);

  const subscribe = useCallback((handler: (event: WsEvent) => void) => {
    listenersRef.current.add(handler);
    return () => { listenersRef.current.delete(handler); };
  }, []);

  const debouncedRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      router.refresh();
    }, REFRESH_DEBOUNCE);
  }, [router]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const raw = JSON.parse(event.data) as Record<string, unknown>;

        if (raw.type === "connected") {
          connectionIdRef.current = (raw.connectionId as string) ?? null;
          return;
        }

        const data = raw as unknown as WsEvent;
        listenersRef.current.forEach((handler) => handler(data));

        if (data.type === "notification") return;

        if (isEditorActive()) {
          hasPendingUpdates.current = true;
          return;
        }

        debouncedRefresh();
      } catch {}
    },
    [isEditorActive, debouncedRefresh],
  );

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (!user) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const isDev = process.env.NODE_ENV === "development";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = isDev
      ? `ws://${window.location.hostname}:3131`
      : `${protocol}//${window.location.host}/_ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close();
        return;
      }
      setIsConnected(true);
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
    };

    ws.onmessage = handleMessage;

    ws.onclose = (e) => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      wsRef.current = null;
      connectionIdRef.current = null;

      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, reconnectDelayRef.current);

      reconnectDelayRef.current = Math.min(
        reconnectDelayRef.current * 2,
        MAX_RECONNECT_DELAY,
      );
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [handleMessage, user]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    if (!isEditorActive() && hasPendingUpdates.current) {
      hasPendingUpdates.current = false;
      debouncedRefresh();
    }
  }, [isEditorActive, debouncedRefresh]);

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};
