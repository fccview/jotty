export function isEnvEnabled(value: string | boolean | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (!value) return false;

  const lower = value.trim().toLowerCase();
  return lower !== "no" && lower !== "false" && lower !== "0";
}
