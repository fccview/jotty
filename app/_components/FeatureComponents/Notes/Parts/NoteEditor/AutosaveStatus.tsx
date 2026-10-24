import { useTranslations } from "next-intl";
import { AlertCircleIcon, Tick02Icon } from "hugeicons-react";
import { SaveState } from "@/app/_utils/autosave-utils";
import { cn } from "@/app/_utils/global-utils";

const LABELS: Record<SaveState, string | null> = {
  [SaveState.IDLE]: null,
  [SaveState.SAVING]: "common.saving",
  [SaveState.SAVED]: "notes.autosaveSaved",
  [SaveState.FAILED]: "notes.autosaveFailed",
};

export const AutosaveStatus = ({ state }: { state: SaveState | null }) => {
  const t = useTranslations();
  const label = state && LABELS[state];
  if (!label) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      title={state === SaveState.FAILED ? t("notes.autosaveFailedHint") : undefined}
      className={cn(
        "jotty-autosave-status hidden lg:inline-flex items-center gap-1 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider",
        state === SaveState.FAILED ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {state === SaveState.SAVED && <Tick02Icon className="h-3.5 w-3.5" />}
      {state === SaveState.FAILED && <AlertCircleIcon className="h-3.5 w-3.5" />}
      {t(label)}
    </span>
  );
};
