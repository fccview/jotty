import { ReactNode } from "react";

export const PanelEmpty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-jotty border border-dashed border-border px-4 py-6 text-center text-md lg:text-sm text-muted-foreground">
    {children}
  </p>
);
