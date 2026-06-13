"use client";

import { useMemo, useState } from "react";
import type React from "react";
import {
  File02Icon,
  Link04Icon,
  RefreshIcon,
  SharedWifiIcon,
} from "hugeicons-react";
import { useTranslations } from "next-intl";
import { LinkIndex } from "@/app/_types";
import { Checklist, Note } from "@/app/_types";
import { getUsername } from "@/app/_server/actions/users";
import { rebuildLinkIndex } from "@/app/_server/actions/link";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useToast } from "@/app/_providers/ToastProvider";
import { ConnectionsGraph } from "./ConnectionsGraph/ConnectionsGraph";
import {
  buildConnectionGraphData,
  ConnectionGraphFilters,
  filterConnectionGraphData,
} from "./ConnectionsGraph/graph-data";

interface LinksTabProps {
  linkIndex: LinkIndex;
  notes: Partial<Note>[];
  checklists: Partial<Checklist>[];
}

export const LinksTab = ({ linkIndex, notes, checklists }: LinksTabProps) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [rebuildingIndex, setRebuildingIndex] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [showArrows, setShowArrows] = useState(true);
  const [nodeScale, setNodeScale] = useState(1);
  const [linkWidth, setLinkWidth] = useState(1.6);
  const [linkDistance, setLinkDistance] = useState(90);
  const [repelForce, setRepelForce] = useState(120);
  const [filters, setFilters] = useState<ConnectionGraphFilters>({
    search: "",
    showNotes: true,
    showChecklists: true,
    showOrphans: false,
    showTagLinks: true,
  });

  const graphData = useMemo(
    () => buildConnectionGraphData(linkIndex, notes, checklists, true),
    [linkIndex, notes, checklists],
  );

  const visibleGraphData = useMemo(
    () => filterConnectionGraphData(graphData, filters),
    [filters, graphData],
  );

  const connectedItems = graphData.nodes.filter((node) => !node.orphan).length;

  const handleRebuildIndex = async () => {
    setRebuildingIndex(true);
    try {
      const username = await getUsername();
      await rebuildLinkIndex(username);
      showToast({
        type: "success",
        title: t("common.success"),
        message: t("profile.successfullyRebuiltIndexReload"),
      });
      window.location.reload();
    } catch (error) {
      console.error("Failed to rebuild index:", error);
      showToast({
        type: "error",
        title: t("common.error"),
        message: t("profile.failedToRebuildIndex"),
      });
    } finally {
      setRebuildingIndex(false);
    }
  };

  const updateFilters = (next: Partial<ConnectionGraphFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
  };

  if (graphData.totalNodes === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <Stats
          totalNodes={0}
          totalLinks={0}
          connectedItems={0}
        />
        <div className="rounded-md border border-border bg-card p-8">
          <div className="mx-auto max-w-md space-y-4 text-center">
            <Link04Icon className="mx-auto h-12 w-12" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {t("profile.noLinksFound")}
              </h3>
              <p className="text-muted-foreground">
                {t("profile.startCreatingInternalLinks")}{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-sm">
                  /note/your-note
                </code>{" "}
                {t("profile.orFormat")}{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-sm">
                  /checklist/your-list
                </code>{" "}
                {t("profile.inYourContent")}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleRebuildIndex}
              disabled={rebuildingIndex}
              className="gap-2"
            >
              <RefreshIcon
                className={`h-4 w-4 ${rebuildingIndex ? "animate-spin" : ""}`}
              />
              {rebuildingIndex ? t("admin.rebuilding") : t("admin.rebuildIndexes")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />
      <Stats
        totalNodes={graphData.totalNodes}
        totalLinks={graphData.totalLinks}
        connectedItems={connectedItems}
      />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">{t("profile.linkNetwork")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("profile.visibleGraphSummary", {
                items: visibleGraphData.nodes.length,
                links: visibleGraphData.links.length,
              })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRebuildIndex}
            disabled={rebuildingIndex}
            className="w-full gap-2 sm:w-auto"
            title={t("profile.rebuildLinkIndexes")}
          >
            <RefreshIcon
              className={`h-4 w-4 ${rebuildingIndex ? "animate-spin" : ""}`}
            />
            {rebuildingIndex ? t("admin.rebuilding") : t("admin.rebuildIndexes")}
          </Button>
        </div>

        {graphData.truncated > 0 && (
          <p className="rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
            {t("profile.graphTruncated", {
              visible: visibleGraphData.nodes.length,
              omitted: graphData.truncated,
            })}
          </p>
        )}

        <div className="order-2 lg:order-1">
          <Controls
            filters={filters}
            updateFilters={updateFilters}
            showLabels={showLabels}
            setShowLabels={setShowLabels}
            showArrows={showArrows}
            setShowArrows={setShowArrows}
            nodeScale={nodeScale}
            setNodeScale={setNodeScale}
            linkWidth={linkWidth}
            setLinkWidth={setLinkWidth}
            linkDistance={linkDistance}
            setLinkDistance={setLinkDistance}
            repelForce={repelForce}
            setRepelForce={setRepelForce}
          />
        </div>

        <div className="order-1 lg:order-2">
          <ConnectionsGraph
            graphData={visibleGraphData}
            selectedNodeId={selectedNodeId}
            onSelectedNodeChange={setSelectedNodeId}
            showLabels={showLabels}
            showArrows={showArrows}
            nodeScale={nodeScale}
            linkWidth={linkWidth}
            linkDistance={linkDistance}
            repelForce={repelForce}
            labels={{
              unknown: t("profile.unknown"),
              total: t("profile.totalConnections"),
              inbound: t("profile.inboundConnections"),
              outbound: t("profile.outboundConnections"),
              updated: t("profile.updated"),
              uuid: t("profile.uuid"),
              openItem: t("profile.openItem"),
              selectItem: t("profile.selectItem"),
              inspectHint: t("profile.inspectNodeHint"),
              linkedItems: t("profile.linkedItems"),
            }}
          />
        </div>
      </section>
    </div>
  );

  function Header() {
    return (
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{t("profile.contentLinks")}</h2>
        <p className="text-muted-foreground">
          {t("profile.visualizeRelationships")}
        </p>
      </div>
    );
  }

  function Stats({
    totalNodes,
    totalLinks,
    connectedItems,
  }: {
    totalNodes: number;
    totalLinks: number;
    connectedItems: number;
  }) {
    return (
      <div className="rounded-jotty border border-border bg-card p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          <Stat icon={<File02Icon className="h-5 w-5" />} value={totalNodes} label={t("checklists.totalItems")} />
          <Stat icon={<Link04Icon className="h-5 w-5" />} value={totalLinks} label={t("profile.connectionsTab")} />
          <Stat icon={<SharedWifiIcon className="h-5 w-5" />} value={connectedItems} label={t("profile.connectedItems")} />
        </div>
      </div>
    );
  }

  function Stat({
    icon,
    value,
    label,
  }: {
    icon: React.ReactNode;
    value: number;
    label: string;
  }) {
    return (
      <div className="flex items-center gap-3">
        <div className="rounded-jotty bg-secondary p-2">{icon}</div>
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      </div>
    );
  }
};

interface ControlsProps {
  filters: ConnectionGraphFilters;
  updateFilters: (next: Partial<ConnectionGraphFilters>) => void;
  showLabels: boolean;
  setShowLabels: (value: boolean) => void;
  showArrows: boolean;
  setShowArrows: (value: boolean) => void;
  nodeScale: number;
  setNodeScale: (value: number) => void;
  linkWidth: number;
  setLinkWidth: (value: number) => void;
  linkDistance: number;
  setLinkDistance: (value: number) => void;
  repelForce: number;
  setRepelForce: (value: number) => void;
}

const Controls = ({
  filters,
  updateFilters,
  showLabels,
  setShowLabels,
  showArrows,
  setShowArrows,
  nodeScale,
  setNodeScale,
  linkWidth,
  setLinkWidth,
  linkDistance,
  setLinkDistance,
  repelForce,
  setRepelForce,
}: ControlsProps) => {
  const t = useTranslations();

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="grid gap-4">
        <label className="space-y-1">
          <span className="text-sm font-medium">{t("common.search")}</span>
          <input
            value={filters.search}
            onChange={(event) => updateFilters({ search: event.target.value })}
            placeholder={t("profile.graphSearchPlaceholder")}
            className="h-10 w-full rounded-jotty border border-input bg-background px-3 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Toggle
          label={t("notes.title")}
          checked={filters.showNotes}
          onChange={(checked) => updateFilters({ showNotes: checked })}
        />
        <Toggle
          label={t("checklists.title")}
          checked={filters.showChecklists}
          onChange={(checked) => updateFilters({ showChecklists: checked })}
        />
        <Toggle
          label={t("profile.orphans")}
          checked={filters.showOrphans}
          onChange={(checked) => updateFilters({ showOrphans: checked })}
        />
        <Toggle
          label={t("profile.labels")}
          checked={showLabels}
          onChange={setShowLabels}
        />
        <Toggle
          label={t("profile.arrows")}
          checked={showArrows}
          onChange={setShowArrows}
        />
        <Toggle
          label={t("profile.tagLinks")}
          checked={filters.showTagLinks}
          onChange={(checked) => updateFilters({ showTagLinks: checked })}
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Range
          label={t("profile.nodeSize")}
          value={nodeScale}
          min={0.6}
          max={1.8}
          step={0.1}
          onChange={setNodeScale}
        />
        <Range
          label={t("profile.linkWidth")}
          value={linkWidth}
          min={0.5}
          max={4}
          step={0.1}
          onChange={setLinkWidth}
        />
        <Range
          label={t("profile.linkDistance")}
          value={linkDistance}
          min={45}
          max={180}
          step={5}
          onChange={setLinkDistance}
        />
        <Range
          label={t("profile.repelForce")}
          value={repelForce}
          min={40}
          max={260}
          step={10}
          onChange={setRepelForce}
        />
      </div>
    </div>
  );
};

const Toggle = ({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) => (
  <label className="flex min-h-10 items-center justify-between gap-3 rounded-jotty border border-border px-3 py-2 text-sm">
    <span className={`min-w-0 truncate ${disabled ? "text-muted-foreground" : ""}`}>
      {label}
    </span>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 shrink-0"
    />
  </label>
);

const Range = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) => (
  <label className="block min-h-16 rounded-jotty border border-border px-3 py-2">
    <span className="block truncate text-sm font-medium">
      {label} {value}
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="mt-2 block w-full"
    />
  </label>
);
