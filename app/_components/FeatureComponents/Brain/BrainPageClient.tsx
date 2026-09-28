"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AiBrain04Icon } from "hugeicons-react";
import { Layout } from "@/app/_components/GlobalComponents/Layout/Layout";
import { MobileHeader } from "@/app/_components/GlobalComponents/Layout/MobileHeader";
import { IndexingRelations } from "@/app/_components/GlobalComponents/Layout/IndexingRelations";
import { useShortcut } from "@/app/_providers/ShortcutsProvider";
import { useToast } from "@/app/_providers/ToastProvider";
import { connectItems } from "@/app/_server/actions/relations";
import { createNote } from "@/app/_server/actions/note";
import { BrainNodeKinds, RelationsStatus } from "@/app/_consts/relations";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { ItemTypes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import type { Category, SanitisedUser } from "@/app/_types";
import type { BrainGraph, BrainNode } from "@/app/_types/relations";
import { BrainToolbar } from "./Parts/BrainToolbar";
import { BrainInspector } from "./Parts/BrainInspector";
import { BrainLegend } from "./Parts/BrainLegend";
import { useBrainPalette } from "./hooks/useBrainPalette";
import { useBrainPrefs } from "./hooks/useBrainPrefs";
import { BrainDimensions, brainView } from "./utils/brain-graph";

const BrainCanvas3D = dynamic(() => import("./Parts/BrainScene3D"), {
  ssr: false,
});
const BrainCanvas2D = dynamic(() => import("./Parts/BrainCanvas2D"), {
  ssr: false,
});

interface BrainPageClientProps {
  graph: BrainGraph;
  focus: string | null;
  isOwnBrain: boolean;
  categories: Category[];
  user: SanitisedUser | null;
}

const TAG_ROUTE = (tag: string) => `/?mode=tags&tag=${encodeURIComponent(tag)}`;

export const BrainPageClient = ({
  graph,
  focus,
  isOwnBrain,
  categories,
  user,
}: BrainPageClientProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { showToast } = useToast();
  const { openSettings, openCreateNoteModal, openCreateCategoryModal } =
    useShortcut();
  const palette = useBrainPalette();
  const focusId =
    focus && graph.nodes.some((node) => node.id === focus) ? focus : null;
  const prefs = useBrainPrefs(Boolean(focusId));
  const [selectedId, setSelectedId] = useState<string | null>(focusId);
  const [flyTo, setFlyTo] = useState<{ id: string; at: number } | null>(null);

  useEffect(() => setSelectedId(focusId), [focusId]);

  const view = useMemo(
    () => brainView(graph, prefs.filters, prefs.scope, focusId),
    [graph, prefs.filters, prefs.scope, focusId],
  );
  const nodeIndex = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const selected = selectedId ? nodeIndex.get(selectedId) || null : null;

  const find = useCallback((id: string) => {
    setSelectedId(id);
    setFlyTo({ id, at: Date.now() });
  }, []);

  const open = useCallback(
    async (node: BrainNode) => {
      if (node.kind === BrainNodeKinds.NOTE)
        return router.push(itemHref(ItemTypes.NOTE, node.id));
      if (node.kind === BrainNodeKinds.CHECKLIST)
        return router.push(itemHref(ItemTypes.CHECKLIST, node.id));
      if (node.kind === BrainNodeKinds.TAG)
        return router.push(TAG_ROUTE(node.title.replace(/^#/, "")));
      if (!isOwnBrain) return;

      const formData = new FormData();
      formData.append("title", node.title);
      formData.append("category", UNCATEGORIZED);
      formData.append("rawContent", "");
      const result = await createNote(formData);
      if (result.success && result.data?.uuid) {
        router.push(itemHref(ItemTypes.NOTE, result.data.uuid));
        return;
      }
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("brain.createFailed"),
      });
    },
    [router, isOwnBrain, showToast, t],
  );

  const connect = useCallback(
    async (source: BrainNode, target: BrainNode) => {
      const result = await connectItems(source.id, target.id);
      if (!result.success) {
        showToast({
          type: "error",
          title: t("common.error"),
          message: t("brain.connectFailed"),
        });
        return;
      }
      showToast({
        type: "success",
        title: t("common.success"),
        message: t("brain.connected", {
          source: source.title,
          target: target.title,
        }),
      });
      router.refresh();
    },
    [router, showToast, t],
  );

  const Canvas =
    prefs.dimension === BrainDimensions.THREE_D ? BrainCanvas3D : BrainCanvas2D;
  const building = graph.status === RelationsStatus.BUILDING;
  const empty = !building && graph.nodes.length === 0;

  return (
    <Layout
      categories={categories}
      onOpenSettings={openSettings}
      onOpenCreateModal={openCreateNoteModal}
      onOpenCategoryModal={openCreateCategoryModal}
      user={user}
    >
      <div className="flex h-full min-h-0 flex-col">
        <MobileHeader
          user={user}
          onOpenSettings={openSettings}
          currentLocale={user?.preferredLocale || "en"}
        />

        <div className="relative min-h-0 w-full flex-1 overflow-hidden bg-background">
          {building && <IndexingRelations />}

          {empty && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
              <AiBrain04Icon className="h-12 w-12 text-primary" />
              <p className="max-w-md text-md lg:text-sm">{t("brain.empty")}</p>
            </div>
          )}

          {!building && !empty && (
            <>
              <Canvas
                nodes={view.nodes}
                edges={view.edges}
                focusId={focusId}
                selectedId={selectedId}
                colourMode={prefs.colourMode}
                palette={palette}
                flyTo={flyTo}
                onSelect={setSelectedId}
                onOpen={open}
              />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 lg:p-4">
                <div className="max-w-4xl">
                  <BrainToolbar
                    nodes={view.nodes}
                    dimension={prefs.dimension}
                    scope={prefs.scope}
                    filters={prefs.filters}
                    colourMode={prefs.colourMode}
                    hasFocus={Boolean(focusId)}
                    webglReady={prefs.webglReady}
                    onDimension={prefs.setDimension}
                    onScope={prefs.setScope}
                    onFilters={prefs.setFilters}
                    onColourMode={prefs.setColourMode}
                    onFind={(node) => find(node.id)}
                  />
                </div>
              </div>

              <BrainLegend
                graph={graph}
                palette={palette}
                shown={view.nodes.length}
                owner={isOwnBrain ? null : graph.owner}
              />

              {selected && (
                <div className="absolute inset-x-3 bottom-3 z-10 max-h-[45%] lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-40 lg:max-h-none lg:w-80">
                  <BrainInspector
                    node={selected}
                    nodes={nodeIndex}
                    edges={view.edges}
                    canEdit={isOwnBrain}
                    onPick={find}
                    onOpen={open}
                    onConnect={connect}
                    onClose={() => setSelectedId(null)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};
