import path from "path";
import { DATA_DIR } from "@/app/_consts/files";
import { AttachmentKinds, LEGACY_DIRS } from "@/app/_consts/attachments";
import { Modes } from "@/app/_types/enums";
import { resolvePath } from "@/app/_utils/path-utils";

const _badSegment = (value: string): boolean =>
  !value || value.startsWith(".") || /[\\/\0]/.test(value);

export const legacyFileOf = (
  owner: string,
  kind: AttachmentKinds,
  name: string,
): string | null => {
  if (_badSegment(owner) || _badSegment(name)) return null;

  const base = path.join(process.cwd(), DATA_DIR, Modes.NOTES, owner, LEGACY_DIRS[kind]);
  const resolved = resolvePath(base, name);
  if (!resolved.ok || path.dirname(resolved.absolutePath) !== base) return null;

  return resolved.absolutePath;
};
