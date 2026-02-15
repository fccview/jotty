export interface Category {
  name: string;
  count: number;
  path: string;
  parent?: string;
  level: number;
}
