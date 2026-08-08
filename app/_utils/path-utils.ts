import path from "path";

export const isPathSafe = (basePath: string, userPath: string): boolean => {
  if (userPath.includes("\0")) return false;

  const resolved = path.resolve(basePath, userPath);
  const base = path.resolve(basePath);

  return resolved === base || resolved.startsWith(base + path.sep);
};

export const validateNoPathTraversal = (pathSegment: string): boolean => {
  return (
    !pathSegment.includes("..") &&
    !pathSegment.includes("/") &&
    !pathSegment.includes("\\")
  );
};

export type ResolvePathInBaseResult =
  | { ok: true; absolutePath: string; decodedInput: string }
  | { ok: false; reason: "invalid_encoding" | "outside_base" };

export const resolvePath = (
  baseDirAbsolute: string,
  userSuppliedPath: string,
): ResolvePathInBaseResult => {
  const baseDir = path.resolve(baseDirAbsolute);

  let decodedInput: string;
  try {
    decodedInput = decodeURIComponent(userSuppliedPath);
  } catch {
    return { ok: false, reason: "invalid_encoding" };
  }

  const candidatePath = path.resolve(baseDir, decodedInput);
  const isInside =
    candidatePath === baseDir ||
    candidatePath.startsWith(`${baseDir}${path.sep}`);

  if (!isInside) {
    return { ok: false, reason: "outside_base" };
  }

  return { ok: true, absolutePath: candidatePath, decodedInput };
};
