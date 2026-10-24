import type { Result } from "@/app/_types";
import { UI_API_BASE, UiAreas } from "@/app/_consts/ui-api";

export const askUi = async <T>(
  area: UiAreas,
  op: string,
  args: Record<string, unknown> = {},
): Promise<Result<T>> => {
  const response = await fetch(`${UI_API_BASE}/${area}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ ...args, op }),
  });
  if (!response.ok) return { success: false, error: `${area}/${op} answered ${response.status}` };
  return (await response.json()) as Result<T>;
};
