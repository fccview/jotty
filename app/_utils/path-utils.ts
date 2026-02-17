import path from "path";

export const isPathSafe = (basePath: string, userPath: string): boolean => {
  const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const resolved = path.resolve(basePath, normalized);
  const basePathNormalized = path.normalize(basePath);
  
  return (
    resolved === basePathNormalized ||
    resolved.startsWith(basePathNormalized + path.sep)
  );
};

export const validateNoPathTraversal = (pathSegment: string): boolean => {
  return !pathSegment.includes("..") && 
         !pathSegment.includes("/") && 
         !pathSegment.includes("\\");
};
