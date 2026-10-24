import { File02Icon, TaskDaily01Icon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { SMALL_RADIUS_CLASS } from "@/app/_consts/styling";

export enum EmptyIllustrations {
  NOTES = "notes",
  CHECKLISTS = "checklists",
  BOARDS = "boards",
}

const SLIP_LINES = ["w-[78%]", "w-[84%]", "w-[80%]"];

const Paper = () => (
  <div className="relative h-24 w-20 mx-auto">
    <div className="absolute inset-0 rounded-jotty border border-border bg-card -rotate-6 translate-x-1" />
    <div className="absolute inset-0 rounded-jotty border border-primary/30 bg-card shadow-sm flex items-center justify-center">
      <File02Icon className="h-8 w-8 text-primary" />
    </div>
  </div>
);

const Slip = ({ isBoard }: { isBoard: boolean }) => (
  <div className="mx-auto w-64 -rotate-2 rounded-jotty border-2 border-dashed border-primary/40 bg-card p-5 space-y-3">
    <div className="h-2.5 w-2/5 rounded-full bg-muted" />
    {SLIP_LINES.map((width) => (
      <div key={width} className="flex items-center gap-3">
        {isBoard ? (
          <TaskDaily01Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <span className={cn("h-4 w-4 shrink-0 border-[1.5px] border-muted-foreground/40", SMALL_RADIUS_CLASS)} />
        )}
        <div className={cn("h-2 rounded-full bg-muted", width)} />
      </div>
    ))}
  </div>
);

export const EmptyIllustration = ({ variant }: { variant: EmptyIllustrations }) =>
  variant === EmptyIllustrations.NOTES ? (
    <Paper />
  ) : (
    <Slip isBoard={variant === EmptyIllustrations.BOARDS} />
  );
