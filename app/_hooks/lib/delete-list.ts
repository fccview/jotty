import { deleteList } from "@/app/_server/actions/checklist";

interface DeleteOutcome {
  ok: boolean;
  error?: string;
}

/**
 * A server action can reject outright (network drop, redeploy) as well as
 * answer with a failure, so callers get one shape covering both.
 */
export const runListDelete = async (uuid: string): Promise<DeleteOutcome> => {
  const formData = new FormData();
  formData.append("uuid", uuid);

  try {
    const result = await deleteList(formData);

    if (!result?.success) {
      return { ok: false, error: result?.error };
    }

    return { ok: true };
  } catch (error) {
    console.error("Checklist deletion request failed:", error);
    return { ok: false };
  }
};
