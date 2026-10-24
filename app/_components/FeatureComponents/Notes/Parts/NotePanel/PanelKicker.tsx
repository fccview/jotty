import { KICKER_CLASS } from "@/app/_consts/styling";
import { cn } from "@/app/_utils/global-utils";

export const PanelKicker = ({ label, count }: { label: string; count: number }) => (
  <h3 className={cn(KICKER_CLASS, "flex items-center justify-between px-2.5 pb-1 pt-2")}>
    <span>{label}</span>
    <span className="tabular-nums">{count}</span>
  </h3>
);
