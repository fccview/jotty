"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CubeIcon,
  GridViewIcon,
  Search01Icon,
  Target02Icon,
} from "hugeicons-react";
import type { BrainNode } from "@/app/_types/relations";
import {
  BrainColourModes,
  BrainDimensions,
  BrainFilters,
  BrainScope,
  MAX_DEPTH,
  searchNodes,
} from "../utils/brain-graph";

interface BrainToolbarProps {
  nodes: BrainNode[];
  dimension: BrainDimensions;
  scope: BrainScope;
  filters: BrainFilters;
  colourMode: BrainColourModes;
  hasFocus: boolean;
  webglReady: boolean;
  onDimension: (dimension: BrainDimensions) => void;
  onScope: (scope: BrainScope) => void;
  onFilters: (filters: BrainFilters) => void;
  onColourMode: (mode: BrainColourModes) => void;
  onFind: (node: BrainNode) => void;
}

const FILTER_KEYS: Array<keyof BrainFilters> = [
  "notes",
  "checklists",
  "tags",
  "ghosts",
  "suggestions",
  "orphans",
];

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-md lg:text-xs transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-muted-foreground hover:text-foreground"
  }`;

export const BrainToolbar = ({
  nodes,
  dimension,
  scope,
  filters,
  colourMode,
  hasFocus,
  webglReady,
  onDimension,
  onScope,
  onFilters,
  onColourMode,
  onFind,
}: BrainToolbarProps) => {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => searchNodes(nodes, query), [nodes, query]);

  return (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-jotty border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search01Icon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matches[0]) {
                onFind(matches[0]);
                setQuery("");
              }
            }}
            placeholder={t("brain.search")}
            aria-label={t("brain.search")}
            className="h-10 w-full rounded-jotty border border-input bg-background pl-8 pr-3 text-md lg:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {matches.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-jotty border border-border bg-card">
              {matches.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onFind(node);
                      setQuery("");
                    }}
                    className="block w-full truncate px-3 py-2 text-left text-md lg:text-sm hover:bg-accent"
                  >
                    {node.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="flex overflow-hidden rounded-jotty border border-border"
          role="group"
          aria-label={t("brain.dimension")}
        >
          {[BrainDimensions.THREE_D, BrainDimensions.TWO_D].map((option) => (
            <button
              key={option}
              type="button"
              disabled={option === BrainDimensions.THREE_D && !webglReady}
              onClick={() => onDimension(option)}
              aria-pressed={dimension === option}
              className={`flex h-10 items-center gap-1.5 px-3 text-md lg:text-sm disabled:opacity-40 ${
                dimension === option
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-accent"
              }`}
            >
              {option === BrainDimensions.THREE_D ? (
                <CubeIcon className="h-4 w-4" />
              ) : (
                <GridViewIcon className="h-4 w-4" />
              )}
              {t(`brain.dimensions.${option}`)}
            </button>
          ))}
        </div>

        {hasFocus && (
          <button
            type="button"
            onClick={() => onScope({ ...scope, local: !scope.local })}
            aria-pressed={scope.local}
            className={`flex h-10 items-center gap-1.5 rounded-jotty border px-3 text-md lg:text-sm disabled:opacity-40 ${
              scope.local
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-accent"
            }`}
          >
            <Target02Icon className="h-4 w-4" />
            {scope.local ? t("brain.local") : t("brain.global")}
          </button>
        )}

        {scope.local && hasFocus && (
          <label className="flex items-center gap-2 text-md lg:text-sm text-muted-foreground">
            {t("brain.depth", { depth: scope.depth })}
            <input
              type="range"
              min={1}
              max={MAX_DEPTH}
              value={scope.depth}
              onChange={(event) =>
                onScope({ ...scope, depth: Number(event.target.value) })
              }
              className="accent-primary"
            />
          </label>
        )}

        <select
          value={colourMode}
          onChange={(event) =>
            onColourMode(event.target.value as BrainColourModes)
          }
          aria-label={t("brain.colourBy")}
          className="h-10 rounded-jotty border border-input bg-background px-2 text-md lg:text-sm"
        >
          {Object.values(BrainColourModes).map((mode) => (
            <option key={mode} value={mode}>
              {t(`brain.colourModes.${mode}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTER_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={filters[key]}
            onClick={() => onFilters({ ...filters, [key]: !filters[key] })}
            className={chip(filters[key])}
          >
            {t(`brain.filters.${key}`)}
          </button>
        ))}
      </div>
    </div>
  );
};
