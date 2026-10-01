"use client";

import { Checklist } from "@/app/_types";
import { cn } from "@/app/_utils/global-utils";
import { avatarSeed } from "@/app/_utils/agent-avatar-utils";
import {
  AgentAvatar,
  AgentAvatarSizes,
} from "@/app/_components/GlobalComponents/Agent/AgentAvatar";

interface AgentChipProps {
  agentId: string;
  checklist: Pick<Checklist, "uuid" | "specNote">;
  size?: AgentAvatarSizes;
  className?: string;
}

export const AgentChip = ({
  agentId,
  checklist,
  size = AgentAvatarSizes.XS,
  className,
}: AgentChipProps) => (
  <span className={cn("flex items-center gap-1", className)}>
    <AgentAvatar
      agentId={agentId}
      seed={avatarSeed(agentId, checklist.uuid, checklist.specNote)}
      size={size}
    />
    <span className="font-mono">{agentId}</span>
  </span>
);
