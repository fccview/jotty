"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/app/_utils/global-utils";
import { robotLook } from "@/app/_utils/agent-avatar-utils";
import { RobotAntenna, RobotEyesPart, RobotHead, RobotMouth } from "./RobotParts";

export enum AgentAvatarSizes {
  XS = "xs",
  SM = "sm",
  MD = "md",
  LG = "lg",
}

const SIZE_CLASSES: Record<AgentAvatarSizes, string> = {
  [AgentAvatarSizes.XS]: "h-4 w-4",
  [AgentAvatarSizes.SM]: "h-6 w-6",
  [AgentAvatarSizes.MD]: "h-8 w-8",
  [AgentAvatarSizes.LG]: "h-10 w-10",
};

interface AgentAvatarProps {
  agentId: string;
  seed: string;
  size?: AgentAvatarSizes;
  className?: string;
}

export const AgentAvatar = ({
  agentId,
  seed,
  size = AgentAvatarSizes.MD,
  className,
}: AgentAvatarProps) => {
  const t = useTranslations();
  const look = useMemo(() => robotLook(seed), [seed]);

  return (
    <span
      className={cn(
        "jotty-agent-avatar inline-flex flex-shrink-0 items-center justify-center rounded-jotty bg-muted",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        role="img"
        aria-label={t("kanban.agentAvatar", { agent: agentId })}
        className="h-full w-full"
      >
        <title>{t("kanban.agentAvatar", { agent: agentId })}</title>
        <RobotAntenna look={look} />
        {look.ears && (
          <>
            <rect x="1" y="11.5" width="2.2" height="4" rx="0.8" fill={look.accent} />
            <rect x="20.8" y="11.5" width="2.2" height="4" rx="0.8" fill={look.accent} />
          </>
        )}
        <RobotHead look={look} />
        <rect x="7" y="9.2" width="10" height="9" rx="2" fill={look.face} />
        <RobotEyesPart look={look} />
        <RobotMouth look={look} />
      </svg>
    </span>
  );
};
