"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import { fromBase64, toBase64 } from "lib0/buffer";
import { LiveStatus, LiveType, type LiveMessage } from "@/app/_types/live";

const RETRY_MS = 2000;
const DEV_WS_PORT = 3131;
const JOIN_TIMEOUT_MS = 5000;
const REMOTE = Symbol("remote");
export const LIVE_FIELD = "default";

type Draft = { base: string; markdown: string };
type ReadyMessage = Extract<LiveMessage, { type: LiveType.Ready }>;

const draftKey = (uuid: string) => `jotty-live-draft:${uuid}`;
const bases = new Map<string, string>();

const storage = <T>(action: () => T) => {
  try {
    return action();
  } catch (error) {
    console.error("[live] local draft unavailable:", error);
    return null;
  }
};

const sameText = (a: string, b: string) => a.trim() === b.trim();

const readDraft = (uuid: string): Draft | null => {
  const raw = storage(() => localStorage.getItem(draftKey(uuid)));
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Partial<Draft>;
    if (typeof draft.markdown !== "string") return null;
    return { base: typeof draft.base === "string" ? draft.base : "", markdown: draft.markdown };
  } catch (error) {
    console.error("[live] unreadable local draft:", error);
    return { base: "", markdown: raw };
  }
};

const dropDraft = (uuid: string) => storage(() => localStorage.removeItem(draftKey(uuid)));

export const saveDraft = (uuid: string, markdown: string) => {
  const base = bases.get(uuid);
  if (base === undefined) return;
  storage(() => localStorage.setItem(draftKey(uuid), JSON.stringify({ base, markdown })));
};

export const markSaved = (uuid: string, markdown: string) => {
  bases.set(uuid, markdown);
  dropDraft(uuid);
};

export const settleDraft = (uuid: string, fileMarkdown: string, canRestore: boolean) => {
  const draft = readDraft(uuid);
  bases.set(uuid, fileMarkdown);
  if (!draft || sameText(draft.markdown, fileMarkdown)) {
    if (draft) dropDraft(uuid);
    return { markdown: fileMarkdown, restored: false, dropped: null };
  }
  if (canRestore && sameText(draft.base, fileMarkdown)) {
    return { markdown: draft.markdown, restored: true, dropped: null };
  }
  dropDraft(uuid);
  return { markdown: fileMarkdown, restored: false, dropped: draft.markdown };
};

const peerNames = (awareness: Awareness) =>
  Array.from(
    new Set(
      Array.from(awareness.getStates().values())
        .map((state) => (state as { user?: { name?: string } }).user?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  );

export const useLiveSession = (uuid: string | undefined, readFile: () => string) => {
  const [session] = useState(() => {
    if (!uuid || typeof window === "undefined") return null;
    const doc = new Y.Doc();
    return { doc, awareness: new Awareness(doc) };
  });
  const [state, setState] = useState({
    status: LiveStatus.Joining,
    initialize: false,
    markdown: "",
    hasContent: false,
    restored: false,
    dropped: null as string | null,
    solo: false,
    generation: 0,
    peers: [] as string[],
  });
  const fileRef = useRef(readFile);
  fileRef.current = readFile;
  const resetting = useRef(false);
  const teardown = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!uuid || !session) return;
    clearTimeout(teardown.current);
    const { doc, awareness } = session;
    let socket: WebSocket;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    let online = false;
    let joined = false;
    let solo = false;

    const send = (type: LiveType.Update | LiveType.Awareness, bytes: Uint8Array) => {
      if (online && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, data: toBase64(bytes) }));
      }
    };
    const hasContent = () => doc.getXmlFragment(LIVE_FIELD).length > 0;
    const shareDoc = (update: Uint8Array, origin: unknown) => {
      setState((old) => (old.hasContent === hasContent() ? old : { ...old, hasContent: hasContent() }));
      if (origin !== REMOTE) send(LiveType.Update, update);
    };
    const shareCursor = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      if ([...added, ...updated, ...removed].includes(doc.clientID)) {
        send(LiveType.Awareness, encodeAwarenessUpdate(awareness, [doc.clientID]));
      }
    };
    const sharePeers = () => setState((old) => ({ ...old, peers: peerNames(awareness) }));
    doc.on("update", shareDoc);
    awareness.on("update", shareCursor);
    awareness.on("change", sharePeers);

    const goSolo = () => {
      if (joined || solo || stopped) return;
      solo = true;
      const settled = settleDraft(uuid, fileRef.current(), true);
      setState((old) => ({ ...old, ...settled, solo: true, initialize: true, generation: old.generation + 1 }));
    };
    const joinTimer = setTimeout(goSolo, JOIN_TIMEOUT_MS);

    const join = (message: ReadyMessage) => {
      const snapshot = fromBase64(message.snapshot);
      const { structs } = Y.decodeUpdate(snapshot);
      const fresh = !structs.some((struct) => doc.store.clients.has(struct.id.client));
      if (fresh) resetting.current = true;
      doc.transact(() => {
        const fragment = doc.getXmlFragment(LIVE_FIELD);
        if (fresh) fragment.delete(0, fragment.length);
        Y.applyUpdate(doc, snapshot);
      }, REMOTE);
      online = true;
      joined = true;
      solo = false;
      clearTimeout(joinTimer);
      const settled = fresh ? settleDraft(uuid, message.markdown, message.initialize) : null;
      setState((old) => ({
        ...old,
        ...settled,
        dropped: settled?.dropped ?? old.dropped,
        status: LiveStatus.Live,
        solo: false,
        initialize: message.initialize,
        hasContent: hasContent(),
        generation: settled ? old.generation + 1 : old.generation,
        peers: peerNames(awareness),
      }));
      send(LiveType.Update, Y.encodeStateAsUpdate(doc));
      shareCursor({ added: [doc.clientID], updated: [], removed: [] });
    };

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(
        process.env.NODE_ENV === "development"
          ? `ws://${location.hostname}:${DEV_WS_PORT}/_live/${uuid}`
          : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/_live/${uuid}`,
      );
      socket.onmessage = (event) => {
        if (stopped) return;
        try {
          const message = JSON.parse(event.data) as LiveMessage;
          if (message.type === LiveType.Ready) {
            join(message);
          } else if (message.type === LiveType.Update) {
            Y.applyUpdate(doc, fromBase64(message.data), REMOTE);
          } else if (message.type === LiveType.Awareness) {
            applyAwarenessUpdate(awareness, fromBase64(message.data), REMOTE);
          }
        } catch (error) {
          console.error("[live] invalid server message:", error);
          socket.close();
        }
      };
      socket.onclose = (event) => {
        online = false;
        if (stopped) return;
        const refused = event.code === 1008;
        setState((old) => ({ ...old, status: refused ? LiveStatus.Refused : LiveStatus.Offline }));
        goSolo();
        stopped = refused;
        if (!refused) timer = setTimeout(connect, RETRY_MS);
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(joinTimer);
      doc.off("update", shareDoc);
      awareness.off("update", shareCursor);
      awareness.off("change", sharePeers);
      socket.close();
      teardown.current = setTimeout(() => {
        awareness.destroy();
        doc.destroy();
      });
    };
  }, [uuid, session]);

  if (!session) return null;
  const dismissDropped = () => setState((old) => ({ ...old, dropped: null }));
  const ready =
    state.solo ||
    (state.status !== LiveStatus.Joining &&
      state.status !== LiveStatus.Refused &&
      (state.initialize || state.hasContent));
  return { ...session, ...state, ready, resetting, dismissDropped };
};

export type LiveSession = NonNullable<ReturnType<typeof useLiveSession>>;
