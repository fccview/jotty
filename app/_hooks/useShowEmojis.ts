import { useSettings } from "@/app/_utils/settings-store";
import { useAppMode } from "@/app/_providers/AppModeProvider";

export const useShowEmojis = (): boolean => {
  const { user } = useAppMode();
  const { showEmojis: sessionShowEmojis } = useSettings();

  if (sessionShowEmojis !== null) {
    return sessionShowEmojis;
  }

  return user?.showChecklistEmojis
    ? user.showChecklistEmojis === "enable"
    : true;
};
