export function isEnvEnabled(value: string | boolean | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;

  if (!value) return false;

  const lower = value.trim().toLowerCase();
  return lower !== "no" && lower !== "false" && lower !== "0";
}

export function isDebugFlag(flag: string): boolean {
  const v = process.env.DEBUGGER;
  if (!v || typeof v !== "string") return false;
  const trimmed = v.trim();

  if (trimmed === "*") return true;

  const parts = trimmed.split(",").map((s) => s.trim().toLowerCase());
  return parts.includes(flag.toLowerCase());
}
