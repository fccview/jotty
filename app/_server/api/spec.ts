import { readPackageVersion } from "@/app/_server/actions/config";
import { buildSpec, contractsOf } from "./openapi";
import { ROUTE_MODULES } from "./route-index";

const UNKNOWN_VERSION = "unknown";

export const apiSpec = async (origin: string) => {
  const version = await readPackageVersion();
  return buildSpec(contractsOf(ROUTE_MODULES), {
    origin,
    version: version.success && version.data ? version.data : UNKNOWN_VERSION,
  });
};
