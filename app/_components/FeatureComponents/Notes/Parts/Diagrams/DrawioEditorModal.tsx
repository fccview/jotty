"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Modal, ModalVariant } from "@/app/_components/GlobalComponents/Modals/Modal";
import { useThemeTone } from "@/app/_hooks/useThemeTone";
import { ThemeTone } from "@/app/_consts/diagrams";
import {
  DrawioAction,
  DrawioEvent,
  drawioEmbedUrl,
  EMPTY_DRAWIO_MODEL,
  isBlankDrawioSvg,
  isTrustedDrawioOrigin,
  readDrawioMessage,
  readDrawioSvg,
} from "@/app/_utils/drawio-utils";

export interface DrawioSave {
  diagramData: string | null;
  svgData: string | null;
}

interface DrawioEditorModalProps {
  baseUrl: string;
  diagramData: string | null;
  onSave: (attrs: DrawioSave) => void;
  onClose: () => void;
}

interface PendingExport {
  xml: string | null;
  close: boolean;
}

const CLOSE_TIMEOUT = 5000;

export const DrawioEditorModal = ({ baseUrl, diagramData, onSave, onClose }: DrawioEditorModalProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const { tone } = useThemeTone();
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const originRef = useRef<string | null>(null);
  const savedRef = useRef(diagramData);
  const pendingRef = useRef<PendingExport | null>(null);
  const timerRef = useRef<number | null>(null);
  const callbacks = useRef({ onSave, onClose });
  callbacks.current = { onSave, onClose };

  const [src] = useState(() => drawioEmbedUrl(baseUrl, { dark: tone === ThemeTone.Dark, locale }));
  const expectedOrigin = useMemo(() => new URL(src).origin, [src]);

  const post = (message: Record<string, unknown>) => {
    const target = frameRef.current?.contentWindow;
    if (!target || !originRef.current) return false;
    target.postMessage(JSON.stringify(message), originRef.current);
    return true;
  };

  const finish = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = null;
    callbacks.current.onClose();
  };

  const requestExport = (pending: PendingExport) => {
    pendingRef.current = pending;
    if (!post({ action: DrawioAction.Export, format: "svg" })) {
      finish();
      return;
    }
    if (!pending.close) return;
    timerRef.current = window.setTimeout(() => {
      console.warn("Draw.io did not answer the export request, closing without saving");
      finish();
    }, CLOSE_TIMEOUT);
  };

  const applyExport = (data: unknown, exportedXml: unknown) => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    const xml = pending?.xml ?? (typeof exportedXml === "string" ? exportedXml : null);
    const svg = readDrawioSvg(data);
    if (xml && svg) {
      const blank = isBlankDrawioSvg(svg);
      const next = blank ? null : xml;
      if (next !== savedRef.current) {
        savedRef.current = next;
        callbacks.current.onSave({ diagramData: next, svgData: blank ? null : svg });
      }
      post({ action: DrawioAction.Status, modified: false });
    }
    if (pending?.close) finish();
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      if (!isTrustedDrawioOrigin(event.origin, expectedOrigin)) {
        console.warn(`Ignored a draw.io message from ${event.origin}`);
        return;
      }
      originRef.current = event.origin;
      const message = readDrawioMessage(event.data);
      if (!message) return;

      switch (message.event) {
        case DrawioEvent.Init:
          post({ action: DrawioAction.Load, xml: savedRef.current || EMPTY_DRAWIO_MODEL, autosave: 0 });
          break;
        case DrawioEvent.Save:
          requestExport({ xml: typeof message.xml === "string" ? message.xml : null, close: Boolean(message.exit) });
          break;
        case DrawioEvent.Export:
          applyExport(message.data, message.xml);
          break;
        case DrawioEvent.Exit:
          finish();
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [expectedOrigin]);

  const handleClose = () => {
    if (pendingRef.current?.close) return;
    if (!originRef.current) {
      finish();
      return;
    }
    requestExport({ xml: null, close: true });
  };

  return (
    <Modal isOpen onClose={handleClose} title={t("editor.editDiagram")} variant={ModalVariant.WORKSPACE} flush>
      <iframe
        ref={frameRef}
        src={src}
        title={t("editor.drawioEditor")}
        allow="clipboard-read; clipboard-write"
        className="h-full min-h-[60vh] w-full flex-1 border-0"
      />
    </Modal>
  );
};
