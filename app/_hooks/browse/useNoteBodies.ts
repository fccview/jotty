"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Note } from "@/app/_types";
import { readNoteBodies } from "@/app/_server/actions/note";
import { hasNoteBody, isNoteEncrypted, withNoteBody } from "@/app/_utils/note-display-utils";
import {
  BodyFailures,
  isCoolingDown,
  nextRetryIn,
  retryNow,
  withFailures,
  withoutFailures,
} from "@/app/_utils/browse/body-retry";

const bodyKey = (note: Pick<Note, "uuid" | "updatedAt">) => `${note.uuid}@${note.updatedAt}`;

const wantsBody = (note: Note) => !hasNoteBody(note) && !isNoteEncrypted(note);

interface UseNoteBodiesOptions {
  notes: Note[];
  pageItems: Note[];
  wanted: Note[];
  upcoming: Note[];
  isActive: boolean;
}

export const useNoteBodies = ({
  notes,
  pageItems,
  wanted,
  upcoming,
  isActive,
}: UseNoteBodiesOptions) => {
  const [fetched, setFetched] = useState<Map<string, string>>(() => new Map());
  const [settled, setSettled] = useState<Set<string>>(() => new Set());
  const [failures, setFailures] = useState<BodyFailures>(() => new Map());
  const [clock, setClock] = useState(0);
  const inFlight = useRef(new Set<string>());

  const shipped = useMemo(
    () => new Map(notes.filter(hasNoteBody).map((note) => [bodyKey(note), note.content])),
    [notes],
  );

  const bodyOf = useCallback(
    (note: Note) => shipped.get(bodyKey(note)) ?? fetched.get(bodyKey(note)),
    [shipped, fetched],
  );

  const isMissing = useCallback(
    (note: Note) =>
      wantsBody(note) &&
      bodyOf(note) === undefined &&
      !settled.has(bodyKey(note)) &&
      !isCoolingDown(failures, bodyKey(note), clock),
    [bodyOf, settled, failures, clock],
  );

  const missing = useMemo(
    () => (isActive ? wanted.filter(isMissing) : []),
    [isActive, wanted, isMissing],
  );
  const asking = useMemo(
    () => (missing.length ? missing : isActive ? upcoming.filter(isMissing) : []),
    [missing, isActive, upcoming, isMissing],
  );

  const pageKey = useMemo(() => pageItems.map((note) => note.uuid).join(","), [pageItems]);

  useEffect(() => {
    setFailures(retryNow);
  }, [pageKey]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setFailures(retryNow);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    const wait = nextRetryIn(failures, Date.now());
    if (wait === null) return;
    const timer = window.setTimeout(() => setClock(Date.now()), wait);
    return () => window.clearTimeout(timer);
  }, [failures]);

  useEffect(() => {
    const ask = asking.filter((note) => !inFlight.current.has(bodyKey(note)));
    if (!ask.length) return;

    const keys = new Map(ask.map((note) => [note.uuid, bodyKey(note)]));
    const asked = Array.from(keys.values());
    keys.forEach((key) => inFlight.current.add(key));

    const fail = (error: unknown) => {
      console.error("Could not load note bodies:", error);
      const now = Date.now();
      setFailures((prev) => withFailures(prev, asked, now));
      setClock(now);
    };

    readNoteBodies(ask.map((note) => note.uuid))
      .then((result) => {
        if (!result.success) {
          fail(result.error);
          return;
        }
        setFetched((prev) => {
          const next = new Map(prev);
          (result.data || []).forEach((body) => {
            const key = keys.get(body.uuid);
            if (key) next.set(key, body.content);
          });
          return next;
        });
        setSettled((prev) => {
          const next = new Set(prev);
          asked.forEach((key) => next.add(key));
          return next;
        });
        setFailures((prev) => withoutFailures(prev, asked));
      })
      .catch(fail)
      .finally(() => keys.forEach((key) => inFlight.current.delete(key)));
  }, [asking]);

  const isReady = missing.length === 0;
  const [held, setHeld] = useState(pageItems);
  if (isReady && held !== pageItems) setHeld(pageItems);
  const shown = isReady ? pageItems : held;

  return useMemo(
    () =>
      isActive
        ? shown.map((note) => {
            const body = hasNoteBody(note) ? undefined : bodyOf(note);
            return body === undefined ? note : withNoteBody(note, body);
          })
        : shown,
    [isActive, shown, bodyOf],
  );
};
