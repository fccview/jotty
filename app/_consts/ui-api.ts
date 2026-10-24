export const UI_API_BASE = "/api/ui";

export enum UiAreas {
  SIDEBAR = "sidebar",
  CATALOG = "catalog",
  BROWSE = "browse",
}

export enum SidebarOps {
  ROWS = "rows",
  LOCATE = "locate",
  SEARCH = "search",
}

export enum CatalogOps {
  FIND = "find",
  BY_UUID = "by-uuid",
  TAGGED = "tagged",
  WIKIS = "wikis",
  ADJACENT = "adjacent",
}

export enum BrowseOps {
  PAGE = "page",
}
