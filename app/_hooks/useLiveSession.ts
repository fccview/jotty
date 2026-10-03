"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import { fromBase64, toBase64 } from "lib0/buffer";
import { LiveRefusals, LiveStatus, LiveType, type LiveMessage } from "@/app/_types/live";

const RETRY_MS = 2000;
const REMOTE = Symbol("remote");

const draftKey = (uuid: string) => `jotty-live-draft:${uuid}`;

const storage = <T>(action: () => T) => {
  try {
    return action();
  } catch (error) {
    console.error("[live] local draft unavailable:", error);
    return null;
  }
};

export const saveDraft = (uuid: string, markdown: string) =>
  storage(() => localStorage.setItem(draftKey(uuid), markdown));

const peerNames = (awareness: Awareness) =>
  Array.from(
    new Set(
      Array.from(awareness.getStates().values())
        .map((state) => (state as { user?: { name?: string } }).user?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  );

export const useLiveSession = (uuid?: string) => {
  const [session] = useState(() => {
    if (!uuid || typeof window === "undefined" || process.env.NODE_ENV !== "production") return null;
    const doc = new Y.Doc();
    return { doc, awareness: new Awareness(doc) };
  });
  const [state, setState] = useState({
    status: LiveStatus.Joining,
    initialize: false,
    markdown: "",
    hasContent: false,
    restored: false,
    peers: [] as string[],
    refusal: LiveRefusals.Refused,
  });

  useEffect(() => {
    if (!uuid || !session) return;
    const { doc, awareness } = session;
    let socket: WebSocket;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    let online = false;
    let generation: string | null = null;

    const send = (type: LiveType.Update | LiveType.Awareness, bytes: Uint8Array) => {
      if (online && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type, data: toBase64(bytes) }));
      }
    };
    const hasContent = () => doc.getXmlFragment("default").length > 0;
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

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/_live/${uuid}`,
      );
      socket.onmessage = (event) => {
        if (stopped) return;
        try {
          const message = JSON.parse(event.data) as LiveMessage;
          if (message.type === LiveType.Ready) {
            const snapshot = fromBase64(message.snapshot);
            const { structs } = Y.decodeUpdate(snapshot);
            const foreign = !structs.some((struct) => doc.store.clients.has(struct.id.client));
            const newRoom = generation !== null && generation !== message.generation;
            generation = message.generation;
            doc.transact(() => {
              const fragment = doc.getXmlFragment("default");
              if (newRoom || (structs.length && foreign)) fragment.delete(0, fragment.length);
              Y.applyUpdate(doc, snapshot);
            }, REMOTE);
            online = true;
            const draft = message.initialize ? storage(() => localStorage.getItem(draftKey(uuid))) : null;
            const restored = draft !== null && draft.trim() !== message.markdown.trim();
            if (draft !== null && !restored) storage(() => localStorage.removeItem(draftKey(uuid)));
            setState({
              status: LiveStatus.Live,
              initialize: message.initialize,
              markdown: draft ?? message.markdown,
              hasContent: hasContent(),
              restored,
              peers: peerNames(awareness),
              refusal: LiveRefusals.Refused,
            });
            send(LiveType.Update, Y.encodeStateAsUpdate(doc));
            shareCursor({ added: [doc.clientID], updated: [], removed: [] });
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
        stopped = refused;
        const refusal = Object.values(LiveRefusals).find((reason) => reason === event.reason) ?? LiveRefusals.Refused;
        setState((old) => ({ ...old, status: refused ? LiveStatus.Refused : LiveStatus.Offline, refusal }));
        if (!refused) timer = setTimeout(connect, RETRY_MS);
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      awareness.setLocalState(null);
      doc.off("update", shareDoc);
      awareness.off("update", shareCursor);
      awareness.off("change", sharePeers);
      socket.close();
      awareness.destroy();
      doc.destroy();
    };
  }, [uuid, session]);

  if (!session) return null;
  const ready =
    state.status !== LiveStatus.Joining &&
    state.status !== LiveStatus.Refused &&
    (state.initialize || state.hasContent);
  return { ...session, ...state, ready };
};
