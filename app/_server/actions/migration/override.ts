"use server";

import { Result } from "@/app/_types";
import { DATA_SCHEMA_VERSION } from "@/app/_consts/files";
import { isAdmin } from "@/app/_server/actions/users";
import { stampSchema } from "@/app/_server/actions/lib/migration-check";

export const forceUnblock = async (
  residue: string[],
): Promise<Result<null>> => {
  try {
    if (!(await isAdmin())) {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    console.warn(
      `Migration gate overridden by an admin at schema version ${DATA_SCHEMA_VERSION}.`,
      residue.length > 0
        ? `Unresolved: ${residue.join(" | ")}`
        : "No residue was reported, the migration itself failed.",
    );

    await stampSchema();

    return { success: true, data: null };
  } catch (error) {
    console.error("Error in forceUnblock:", error);
    return { success: false, error: "Failed to override the migration gate" };
  }
};
