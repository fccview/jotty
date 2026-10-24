import type { BrowseSort } from "@/app/_consts/browse";

export interface BrowseQuery {
  filter: string;
  categories: string[];
  recursive: boolean;
  sort: BrowseSort;
  perPage: number;
  page: number;
}

export interface BrowsePage<T> {
  query: BrowseQuery;
  pageItems: T[];
  nextItems: T[];
  total: number;
  counts: Record<string, number>;
  size: number;
  pinned: number;
  kicker: Record<string, number>;
}
