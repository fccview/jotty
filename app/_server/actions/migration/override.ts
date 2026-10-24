"use server";

import { Result } from "@/app/_types";
import { DATA_SCHEMA_VERSION } from "@/app/_consts/files";
import { isAdmin } from "@/app/_server/actions/users";
import { stampSchema } from "@/app/_server/actions/lib/migration-check";

export const forceUnblock = async (
  residue: string[],
  version: number = DATA_SCHEMA_VERSION,
): Promise<Result<null>> => {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    const stamped = Number.isInteger(version)
      ? Math.min(Math.max(version, 0), DATA_SCHEMA_VERSION)
      : DATA_SCHEMA_VERSION;

    console.warn(
      `Migration gate overridden by an admin at schema version ${stamped}.`,
      residue.length > 0
        ? `Unresolved: ${residue.join(" | ")}`
        : "No residue was reported, the migration itself failed.",
    );

    await stampSchema(stamped);

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in forceUnblock:", error);
    return { success: false, error: "Failed to override the migration gate" };
  }
};
