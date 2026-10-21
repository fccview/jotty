export const HOME_WIDGET_KEYS = [
  "homeWelcome",
  "homePickUp",
  "homePinboard",
  "homeTags",
] as const;

export type HomeWidgetKey = (typeof HOME_WIDGET_KEYS)[number];
