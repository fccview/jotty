"use client";

import React, { createContext, useContext, ReactNode } from "react";

interface ItemMetadata {
  id: string;
  uuid?: string;
  title: string;
  category: string;
  owner?: string;
  createdAt?: string;
  updatedAt?: string;
  type: "note" | "checklist";
}

interface MetadataContextType {
  metadata: ItemMetadata;
}

const MetadataContext = createContext<MetadataContextType | undefined>(
  undefined
);

interface MetadataProviderProps {
  children: ReactNode;
  metadata: ItemMetadata;
}

export const MetadataProvider = ({
  children,
  metadata,
}: MetadataProviderProps) => {
  return (
    <MetadataContext.Provider value={{ metadata }}>
      {children}
    </MetadataContext.Provider>
  );
};

export const useMetadata = (): ItemMetadata => {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error("useMetadata must be used within a MetadataProvider");
  }
  return context.metadata;
};
