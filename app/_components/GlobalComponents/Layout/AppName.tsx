"use client";

import { useEffect, useState } from "react";
import { getSettings } from "@/app/_server/actions/config";

interface AppNameProps {
  className?: string;
  fallback?: string;
}

export const AppName = ({
  className,
  fallback = "jotty·page",
}: AppNameProps) => {
  const [appName, setAppName] = useState<string>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAppName = async () => {
      try {
        const settings = await getSettings();
        if (settings.appName) {
          setAppName(settings.appName);
        }
      } catch (error) {
        console.error("Error loading app name:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAppName();
  }, []);

  if (loading) {
    return <span className={className}></span>;
  }

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
