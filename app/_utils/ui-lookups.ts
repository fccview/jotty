import type {
  AdjacentNotes,
  BrowsePage,
  BrowseQuery,
  ContentFilter,
  ItemShelf,
  SidebarPage,
  SidebarSearch,
  SidebarSpot,
  WikiAsk,
  WikiHit,
} from "@/app/_types";
import { BrowseOps, CatalogOps, SidebarOps, UiAreas } from "@/app/_consts/ui-api";
import { askUi } from "./ui-api";

export const fetchSidebarRows = (mode: string, category: string, offset: number, stamp: string) =>
  askUi<SidebarPage>(UiAreas.SIDEBAR, SidebarOps.ROWS, { mode, category, offset, stamp });

export const fetchSidebarSpot = (mode: string, uuid: string) =>
  askUi<SidebarSpot | null>(UiAreas.SIDEBAR, SidebarOps.LOCATE, { mode, uuid });

export const fetchSidebarSearch = (mode: string, query: string, stamp: string) =>
  askUi<SidebarSearch>(UiAreas.SIDEBAR, SidebarOps.SEARCH, { mode, query, stamp });

export const fetchItems = (query: string, limit: number, byCategory: boolean) =>
  askUi<ItemShelf>(UiAreas.CATALOG, CatalogOps.FIND, { query, limit, byCategory });

export const fetchItemsByUuid = (uuids: string[]) =>
  askUi<ItemShelf>(UiAreas.CATALOG, CatalogOps.BY_UUID, { uuids });

export const fetchTaggedItems = (tag: string) =>
  askUi<ItemShelf>(UiAreas.CATALOG, CatalogOps.TAGGED, { tag });

export const fetchWikiTargets = (asks: WikiAsk[]) =>
  askUi<Record<string, WikiHit | null>>(UiAreas.CATALOG, CatalogOps.WIKIS, { asks });

export const fetchAdjacentNotes = (uuid: string, filter: ContentFilter | null) =>
  askUi<AdjacentNotes>(UiAreas.CATALOG, CatalogOps.ADJACENT, { uuid, filter });

export const fetchBrowsePage = <T>(scope: string, query: BrowseQuery) =>
  askUi<BrowsePage<T>>(UiAreas.BROWSE, BrowseOps.PAGE, { scope, query });
