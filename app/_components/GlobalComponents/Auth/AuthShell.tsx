import { ReactNode } from "react";
import { DynamicLogo } from "@/app/_components/GlobalComponents/Layout/Logo/DynamicLogo";
import { AppName } from "@/app/_components/GlobalComponents/Layout/AppName";

interface AuthShellProps {
  children: ReactNode;
}

export const AuthShell = ({ children }: AuthShellProps) => {
  return (
    <div className="jotty-auth-wrapper min-h-screen w-full flex items-center justify-center lg:p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <DynamicLogo className="h-10 w-10 lg:h-8 lg:w-8" size="32x32" />
          <AppName className="text-2xl lg:text-xl font-bold text-foreground jotty-app-name" />
        </div>
        <div className="rounded-jotty border border-border bg-card p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
