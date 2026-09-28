import { useSettings } from "@/app/_utils/settings-store";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export const useShowEmojis = (ownerChoice?: boolean): boolean => {
  const { user } = useAppMode();
  const { showEmojis: sessionShowEmojis } = useSettings();

  if (ownerChoice !== undefined) {
    return ownerChoice;
  }

  if (sessionShowEmojis !== null) {
    return sessionShowEmojis;
  }

  return user?.showChecklistEmojis
    ? user.showChecklistEmojis === "enable"
    : true;
};
