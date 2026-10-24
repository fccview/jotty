import { canReach } from "@/app/_server/actions/share/queries";
import { findUserRecord } from "@/app/_server/actions/users/records";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import { validateNoPathTraversal } from "@/app/_utils/path-utils";

export const UNKNOWN_ASSIGNEE = "Assignee not found";
export const BLIND_ASSIGNEE = "Assignee can't see this board";

export const assigneeRefusal = async (
  assignee: string,
  uuid: string,
): Promise<string | null> => {
  if (!validateNoPathTraversal(assignee)) return UNKNOWN_ASSIGNEE;
  if (!(await findUserRecord(assignee))) return UNKNOWN_ASSIGNEE;
  const sees = await canReach(uuid, ItemTypes.CHECKLIST, assignee, PermissionTypes.READ);
  return sees ? null : BLIND_ASSIGNEE;
};
