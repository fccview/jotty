"use client";

import { createContext, ReactNode, useContext } from "react";
import { RelationsStatus } from "@/app/_consts/relations";
import type { ItemRelations } from "@/app/_types/relations";

const EMPTY: ItemRelations = { uuid: "", status: RelationsStatus.READY, backlinks: [], mentions: [], wikis: {} };

const RelationsContext = createContext<ItemRelations>(EMPTY);

export const RelationsProvider = ({
  relations,
  children,
}: {
  relations: ItemRelations;
  children: ReactNode;
}) => (
  <RelationsContext.Provider value={relations}>{children}</RelationsContext.Provider>
);

export const useRelations = (): ItemRelations => useContext(RelationsContext);
