"use client";

import { useAppMode } from "@/app/_providers/AppModeProvider";

interface AppNameProps {
  className?: string;
  fallback?: string;
}

export const AppName = ({
  className,
  fallback = "jotty·page",
}: AppNameProps) => {
  const { appSettings } = useAppMode();
  const appName = appSettings?.appName || fallback;

  return (
    <span className={className}>
      {appName === "rwMarkable" ? (
        <>
          <span className="text-primary">rw</span>Markable
        </>
      ) : appName === "jotty·page" ? (
        <>
          <span className="text-primary">jotty</span>·page
        </>
      ) : (
        appName
      )}
    </span>
  );
};
