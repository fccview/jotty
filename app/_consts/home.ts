export const HOME_WIDGET_KEYS = [
  "homeWelcome",
  "homePickUp",
  "homePinboard",
  "homeTags",
] as const;

export type HomeWidgetKey = (typeof HOME_WIDGET_KEYS)[number];

interface HomeWidgetCopy {
  labelKey: string;
  descriptionKey?: string;
}

export const HOME_WIDGET_COPY: Record<HomeWidgetKey, HomeWidgetCopy> = {
  homeWelcome: { labelKey: "settings.homeWelcome" },
  homePickUp: { labelKey: "settings.homePickUp" },
  homePinboard: {
    labelKey: "settings.homePinboard",
    descriptionKey: "settings.homePinboardDescription",
  },
  homeTags: { labelKey: "settings.homeTags" },
};
