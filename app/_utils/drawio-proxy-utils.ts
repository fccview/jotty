export const buildDrawioTarget = (base: string, segments: string[], search: string): URL | null => {
  let root: URL;
  try {
    root = new URL(`${base.replace(/\/+$/, "")}/`);
  } catch {
    return null;
  }
  const path = segments.map((segment) => encodeURIComponent(segment)).join("/");
  const target = new URL(path, root);
  if (target.origin !== root.origin || !target.pathname.startsWith(root.pathname)) return null;
  target.search = search;
  return target;
};
