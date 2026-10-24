"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BrainColourModes,
  BrainDimensions,
  BrainFilters,
  BrainScope,
  DEFAULT_FILTERS,
} from "../utils/brain-graph";

const STORAGE_KEY = "jotty-brain-prefs";
const LOCAL_DEPTH = 2;

interface StoredPrefs {
  dimension?: BrainDimensions;
  filters?: Partial<BrainFilters>;
  colourMode?: BrainColourModes;
  depth?: number;
}

const _load = (): StoredPrefs => {
  try {
    return JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || "{}",
    ) as StoredPrefs;
  } catch {
    return {};
  }
};

const _save = (prefs: StoredPrefs) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    return;
  }
};

const _webgl = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
};

const _prefersFlat = (): boolean =>
  window.matchMedia("(pointer: coarse)").matches ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useBrainPrefs = (hasFocus: boolean) => {
  const [dimension, setDimensionState] = useState(BrainDimensions.TWO_D);
  const [filters, setFiltersState] = useState<BrainFilters>(DEFAULT_FILTERS);
  const [colourMode, setColourModeState] = useState(BrainColourModes.TYPE);
  const [scope, setScopeState] = useState<BrainScope>({
    local: hasFocus,
    depth: LOCAL_DEPTH,
  });
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    const stored = _load();
    const ready = _webgl();
    setWebglReady(ready);
    const wanted =
      stored.dimension ||
      (_prefersFlat() ? BrainDimensions.TWO_D : BrainDimensions.THREE_D);
    setDimensionState(ready ? wanted : BrainDimensions.TWO_D);
    setFiltersState({ ...DEFAULT_FILTERS, ...stored.filters });
    if (stored.colourMode) setColourModeState(stored.colourMode);
    if (stored.depth)
      setScopeState((current) => ({ ...current, depth: stored.depth! }));
  }, []);

  const persist = useCallback(
    (patch: StoredPrefs) => _save({ ..._load(), ...patch }),
    [],
  );

  return {
    dimension,
    filters,
    colourMode,
    scope,
    webglReady,
    setDimension: (next: BrainDimensions) => {
      setDimensionState(next);
      persist({ dimension: next });
    },
    setFilters: (next: BrainFilters) => {
      setFiltersState(next);
      persist({ filters: next });
    },
    setColourMode: (next: BrainColourModes) => {
      setColourModeState(next);
      persist({ colourMode: next });
    },
    setScope: (next: BrainScope) => {
      setScopeState(next);
      persist({ depth: next.depth });
    },
  };
};
