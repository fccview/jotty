import { SanitisedUser } from "@/app/_types";

const DISABLED = "disable";

export const useHomeWidgets = (user: SanitisedUser | null) => ({
  welcome: user?.homeWelcome !== DISABLED,
  pickUp: user?.homePickUp !== DISABLED,
  pinboard: user?.homePinboard !== DISABLED,
  tags: user?.homeTags !== DISABLED,
});
