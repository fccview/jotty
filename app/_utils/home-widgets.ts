import { SanitisedUser } from "@/app/_types";
import { ToggleState } from "@/app/_types/enums";
import { Dated, newestFirst } from "@/app/_utils/order-utils";

const isShown = (value?: ToggleState) => value !== ToggleState.DISABLE;

const anyItem = () => true;

export const homeWidgets = (user: SanitisedUser | null) => ({
  welcome: isShown(user?.homeWelcome),
  pickUp: isShown(user?.homePickUp),
  pinboard: isShown(user?.homePinboard),
  tags: isShown(user?.homeTags),
});

export type HomeWidgets = ReturnType<typeof homeWidgets>;

export const pickUpItem = <T extends Dated>(
  items: T[],
  isVisible: boolean,
  prefer: (item: T) => boolean = anyItem,
): T | undefined => {
  if (!isVisible) return undefined;
  let newest: T | undefined;
  let preferred: T | undefined;
  for (const item of items) {
    if (!newest || newestFirst(item, newest) < 0) newest = item;
    if (prefer(item) && (!preferred || newestFirst(item, preferred) < 0)) preferred = item;
  }
  return preferred || newest;
};
