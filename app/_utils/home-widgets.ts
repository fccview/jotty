import { SanitisedUser } from "@/app/_types";
import { ToggleState } from "@/app/_types/enums";

const isShown = (value?: ToggleState) => value !== ToggleState.DISABLE;

export const homeWidgets = (user: SanitisedUser | null) => ({
  welcome: isShown(user?.homeWelcome),
  pickUp: isShown(user?.homePickUp),
  pinboard: isShown(user?.homePinboard),
  tags: isShown(user?.homeTags),
});

export type HomeWidgets = ReturnType<typeof homeWidgets>;
