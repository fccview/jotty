"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Modal, ModalVariant } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useToast } from "@/app/_providers/ToastProvider";
import { useThemeTone } from "@/app/_hooks/useThemeTone";
import { ThemeTone } from "@/app/_consts/diagrams";
import {
  buildScene,
  readScene,
  SceneStatus,
  serializeScene,
} from "@/app/_utils/excalidraw-scene-utils";
import { loadExcalidraw, pickLangCode } from "./excalidraw-loader";
import { DiagramNotice, NoticeTone } from "./DiagramNotice";

type ExcalidrawModule = Awaited<ReturnType<typeof loadExcalidraw>>;

export interface ExcalidrawSave {
  diagramData: string | null;
  svgData: string | null;
}

interface ExcalidrawEditorModalProps {
  diagramData: string | null;
  onSave: (attrs: ExcalidrawSave) => void;
  onClose: () => void;
}

const EXPORT_PADDING = 20;
const EXPORT_SCALE = 1;
const ESCAPE = "Escape";
const ENTER = "Enter";
const SAVE_KEY = "s";

const isSettled = (state: AppState) =>
  state.activeTool.type === "selection" &&
  !state.editingTextElement &&
  !state.newElement &&
  !state.multiElement &&
  !state.selectionElement &&
  !state.editingLinearElement &&
  !state.openMenu &&
  !state.openPopup &&
  !state.openDialog &&
  !state.openSidebar &&
  !state.contextMenu &&
  !state.isCropping &&
  !state.showHyperlinkPopup;

export const ExcalidrawEditorModal = ({ diagramData, onSave, onClose }: ExcalidrawEditorModalProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const { tone } = useThemeTone();
  const { showToast } = useToast();
  const [opened] = useState(() => readScene(diagramData));
  const [excalidraw, setExcalidraw] = useState<ExcalidrawModule | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const saveRef = useRef<(close: boolean) => Promise<void>>(async () => undefined);

  const [initialData] = useState(() =>
    opened.status === SceneStatus.Ready
      ? {
          elements: opened.scene.elements,
          appState: opened.scene.appState,
          files: opened.scene.files,
          scrollToContent: true,
        }
      : null,
  );

  useEffect(() => {
    let cancelled = false;
    loadExcalidraw()
      .then((loaded) => {
        if (!cancelled) setExcalidraw(loaded);
      })
      .catch((error) => {
        console.error("Failed to load Excalidraw:", error);
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!api || !initialData?.elements.length) return;
    const unsubscribe = api.onChange((elements) => {
      if (!elements.length) return;
      unsubscribe();
      api.scrollToContent(undefined, { fitToContent: true, animate: false });
    });
    return unsubscribe;
  }, [api, initialData]);


  const persist = useCallback(async () => {
    if (!api || !excalidraw) return;
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const scene = buildScene(elements, appState, api.getFiles());
    const data = serializeScene(scene);
    if (data === (diagramData || null)) return;
    const svg = data
      ? await excalidraw.exportToSvg({
          elements,
          appState: { ...appState, exportBackground: true, exportWithDarkMode: false, exportScale: EXPORT_SCALE },
          files: scene.files,
          exportPadding: EXPORT_PADDING,
        })
      : null;
    onSave({ diagramData: data, svgData: svg?.outerHTML ?? null });
  }, [api, excalidraw, diagramData, onSave]);

  const save = useCallback(
    async (close: boolean) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setIsSaving(true);
      try {
        await persist();
        if (close) onClose();
      } catch (error) {
        console.error("Failed to save Excalidraw diagram:", error);
        showToast({ type: "error", title: t("editor.diagramSaveFailed") });
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [persist, onClose, showToast, t],
  );

  const handleKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key !== SAVE_KEY && event.key !== ENTER) return;
    event.preventDefault();
    event.stopPropagation();
    save(event.key === ENTER);
  };

  saveRef.current = save;

  useEffect(() => {
    if (!api) return;
    const closeWhenSettled = (event: globalThis.KeyboardEvent) => {
      if (event.key !== ESCAPE || event.isComposing) return;
      if (!(event.target instanceof Node) || !wrapperRef.current?.contains(event.target)) return;
      if (isSettled(api.getAppState())) saveRef.current(true);
    };
    window.addEventListener("keydown", closeWhenSettled, true);
    return () => window.removeEventListener("keydown", closeWhenSettled, true);
  }, [api]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => event.stopPropagation();

  const retry = () => {
    setLoadFailed(false);
    setAttempt((count) => count + 1);
  };

  const renderBody = () => {
    if (opened.status === SceneStatus.Unreadable) {
      return <DiagramNotice tone={NoticeTone.Error} message={t("editor.diagramDataUnreadable")} />;
    }
    if (loadFailed) {
      return (
        <DiagramNotice
          tone={NoticeTone.Error}
          message={t("editor.diagramLoadFailed")}
          action={<Button size="sm" onClick={retry}>{t("common.retry")}</Button>}
        />
      );
    }
    if (!excalidraw || !initialData) {
      return <DiagramNotice tone={NoticeTone.Loading} message={t("common.loading")} />;
    }
    const { Excalidraw, THEME, languages } = excalidraw;
    return (
      <Excalidraw
        excalidrawAPI={setApi}
        initialData={initialData}
        theme={tone === ThemeTone.Dark ? THEME.DARK : THEME.LIGHT}
        langCode={pickLangCode(locale, languages.map((language) => language.code))}
        autoFocus
        UIOptions={{ canvasActions: { saveToActiveFile: false, toggleTheme: false } }}
      />
    );
  };

  return (
    <Modal
      isOpen
      onClose={() => save(true)}
      closeOnEscape={false}
      title={
        <div className="flex items-center gap-2">
          {t("editor.editDiagram")}
          <Button size="sm" onClick={() => save(true)} disabled={isSaving || !api}>
            {t("common.save")}
          </Button>
        </div>
      }
      variant={ModalVariant.WORKSPACE}
      flush
    >
      <div
        ref={wrapperRef}
        className="excalidraw-editor relative min-h-[60vh] w-full flex-1"
        onKeyDownCapture={handleKeyDownCapture}
        onKeyDown={handleKeyDown}
      >
        <div className="absolute inset-0">{renderBody()}</div>
      </div>
    </Modal>
  );
};
