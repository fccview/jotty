"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useToast } from "@/app/_providers/ToastProvider";
import { copyTextToClipboard } from "@/app/_utils/global-utils";
import { LiveStatus } from "@/app/_types/live";
import type { LiveSession } from "@/app/_hooks/useLiveSession";

const BAR = "flex flex-wrap items-center gap-3 px-8 py-2 text-xs border-b border-border";

export const LiveStatusBar = ({ live }: { live: LiveSession }) => {
  const t = useTranslations();
  const { usersPublicData } = useAppMode();
  const { showToast } = useToast();

  const copyDropped = async () => {
    if (!live.dropped) return;
    const copied = await copyTextToClipboard(live.dropped);
    showToast({
      type: copied ? "success" : "error",
      title: t(copied ? "common.copied" : "common.copyFailed"),
    });
    if (copied) live.dismissDropped();
  };

  const status =
    live.status === LiveStatus.Live ? (
      <>
        <span>{t("live.currentlyEditing")}</span>
        <span className="flex -space-x-2">
          {live.peers.map((name) => (
            <span key={name} title={name}>
              <UserAvatar
                username={name}
                avatarUrl={usersPublicData.find((entry) => entry.username === name)?.avatarUrl}
                size="sm"
                className="ring-2 ring-background"
              />
            </span>
          ))}
        </span>
      </>
    ) : live.solo ? (
      <span>{t("live.status.unavailable")}</span>
    ) : live.status === LiveStatus.Offline ? (
      <span>{t("live.status.offline")}</span>
    ) : live.status === LiveStatus.Refused ? (
      <span>{t("live.status.refused")}</span>
    ) : null;

  return (
    <>
      {live.dropped && (
        <div role="alert" className={`${BAR} text-destructive`}>
          <span>{t("live.dropped")}</span>
          <Button variant="outline" size="xs" onClick={copyDropped}>
            {t("live.copyDropped")}
          </Button>
          <Button variant="ghost" size="xs" onClick={live.dismissDropped}>
            {t("common.dismiss")}
          </Button>
        </div>
      )}
      {status && (
        <div role="status" className={`${BAR} text-muted-foreground`}>
          {status}
        </div>
      )}
    </>
  );
};
