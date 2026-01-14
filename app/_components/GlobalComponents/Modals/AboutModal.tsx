"use client";

import { useState } from "react";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useTranslations } from "next-intl";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { getLatestGitHubRelease } from "@/app/_server/actions/github";
import { Loading03Icon, ArrowUpDoubleIcon } from "hugeicons-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal = ({ isOpen, onClose }: AboutModalProps) => {
  const t = useTranslations();
  const { appVersion } = useAppMode();
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    latestVersion?: string;
    currentVersion?: string;
  } | null>(null);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setUpdateInfo(null);

    try {
      const result = await getLatestGitHubRelease();
      if (result.success && result.data) {
        const latestVersion = result.data.tag_name;
        const currentVersion = appVersion || "unknown";

        const cleanLatest = latestVersion.replace(/^v/, "");
        const cleanCurrent = currentVersion.replace(/^v/, "");
        const hasUpdate =
          cleanLatest !== cleanCurrent && cleanCurrent !== "unknown";

        setUpdateInfo({
          hasUpdate,
          latestVersion: cleanLatest,
          currentVersion: cleanCurrent,
        });
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("common.about")}>
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">jotty·page</h2>
          <div className="flex items-center justify-center gap-2">
            <p className="text-sm text-muted-foreground">
              {t("common.version")}: {appVersion || "unknown"}
            </p>
            <Button
              onClick={handleCheckForUpdates}
              disabled={isChecking}
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
            >
              {isChecking ? (
                <Loading03Icon className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowUpDoubleIcon className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {updateInfo && (
          <div
            className={`w-full p-4 rounded-jotty border text-sm ${
              updateInfo.hasUpdate
                ? "bg-primary/10 border-primary/20"
                : "bg-muted border-border"
            }`}
          >
            {updateInfo.hasUpdate ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <ArrowUpDoubleIcon className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-primary">
                    {t("admin.updateAvailable")}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {updateInfo.currentVersion} → {updateInfo.latestVersion}
                </p>
                <a
                  href={`https://github.com/fccview/jotty/releases/tag/${updateInfo.latestVersion}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-primary underline hover:no-underline mt-1"
                >
                  {t("common.viewOnGithub")}
                </a>
              </div>
            ) : (
              <p className="text-muted-foreground">{t("admin.upToDate")}</p>
            )}
          </div>
        )}

        <div className="w-full space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">
            {t("common.links")}
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://discord.gg/invite/mMuk2WzVZu"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform hover:scale-110"
              title="Discord"
            >
              <img
                src="/repo-images/discord.svg"
                alt="Discord"
                className="w-10 h-10"
              />
            </a>
            <a
              href="https://www.reddit.com/r/jotty"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform hover:scale-110"
              title="Reddit"
            >
              <img
                src="/repo-images/reddit.svg"
                alt="Reddit"
                className="w-10 h-10"
              />
            </a>
            <a
              href="https://t.me/jottypage"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform hover:scale-110"
              title="Telegram"
            >
              <img
                src="/repo-images/telegram.svg"
                alt="Telegram"
                className="w-10 h-10"
              />
            </a>
          </div>
        </div>

        <div className="w-full pt-4 border-t border-border space-y-2">
          <a
            href="https://github.com/fccview/jotty"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-primary hover:underline"
          >
            {t("common.githubRepository")}
          </a>
          <a
            href="https://github.com/fccview/jotty/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-primary hover:underline"
          >
            {t("admin.issuesAndBugs")}
          </a>
          <a
            href="/howto/shortcuts"
            className="block text-sm text-primary hover:underline"
          >
            {t("common.documentation")}
          </a>
        </div>
      </div>
    </Modal>
  );
};
