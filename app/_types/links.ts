export interface ItemLinks {
  isLinkedTo: {
    notes: string[];
    checklists: string[];
  };
  isReferencedIn: {
    notes: string[];
    checklists: string[];
  };
}

export interface LinkIndex {
  notes: Record<string, ItemLinks>;
  checklists: Record<string, ItemLinks>;
  [key: string]: Record<string, ItemLinks>;
}
