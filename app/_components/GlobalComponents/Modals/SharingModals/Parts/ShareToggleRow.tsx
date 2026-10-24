import { ComponentType, ReactNode } from "react";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { cn } from "@/app/_utils/global-utils";

interface ShareToggleRowProps {
  id: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint: ReactNode;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export const ShareToggleRow = ({
  id,
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: ShareToggleRowProps) => (
  <div className="flex min-h-9 items-center gap-3">
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-jotty transition-colors",
        checked ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0 flex-1">
      <label
        htmlFor={id}
        className="block text-md lg:text-sm font-medium leading-snug text-foreground"
      >
        {label}
      </label>
      <p className="mt-0.5 text-sm lg:text-xs leading-snug text-muted-foreground">{hint}</p>
    </div>
    <Toggle id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);
