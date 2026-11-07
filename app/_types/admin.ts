export interface AdminRow {
  uuid: string;
  id: string;
  title: string;
  owner: string;
  category: string;
  isShared: boolean;
  size: number;
}

export interface AdminLibrary {
  checklists: AdminRow[];
  notes: AdminRow[];
}

export interface AdminCounts {
  checklists: number;
  notes: number;
}
