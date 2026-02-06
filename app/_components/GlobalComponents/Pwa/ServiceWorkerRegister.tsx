"use client";

import { useEffect } from "react";

export const ServiceWorkerRegister = () => {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/serwist/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }
  }, []);

  return null;
};
