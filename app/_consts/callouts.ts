export type CalloutType = "info" | "warning" | "success" | "danger";

export const CALLOUT_ALIASES: Record<string, CalloutType> = {
  info: "info",
  warning: "warning",
  success: "success",
  danger: "danger",
  note: "info",
  tip: "success",
  important: "warning",
  caution: "danger",
};

export const CALLOUT_MARKER = new RegExp(
  `^\\[!(${Object.keys(CALLOUT_ALIASES).join("|")})\\]\\s*`,
  "i",
);
