"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ItemType } from "@/app/_types";
import { togglePin } from "@/app/_server/actions/dashboard";
import { useToast } from "@/app/_providers/ToastProvider";

export const usePinRefusal = () => {
  const t = useTranslations();
  const { showToast } = useToast();

  return useCallback(
    (refusalMessage?: string) =>
      showToast({ title: refusalMessage || t("common.error"), type: "error" }),
    [showToast, t],
  );
};

export const usePinToggle = (type: ItemType) => {
  const router = useRouter();
  const refuse = usePinRefusal();
  const inFlight = useRef<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const toggle = useCallback(
    async (uuid?: string, onToggled?: () => void) => {
      if (!uuid || inFlight.current) return;

      inFlight.current = uuid;
      setToggling(uuid);
      try {
        const result = await togglePin(uuid, type);
        if (result.success) {
          onToggled?.();
          router.refresh();
        } else {
          refuse(result.error);
        }
      } catch (error) {
        console.error("Failed to toggle pin:", error);
        refuse();
      } finally {
        inFlight.current = null;
        setToggling(null);
      }
    },
    [type, router, refuse],
  );

  return { toggle, toggling };
};
