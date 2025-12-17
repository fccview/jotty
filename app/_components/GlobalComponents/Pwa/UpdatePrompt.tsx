"use client";

import { useState, useEffect } from "react";
import { MultiplicationSignIcon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { useGitHubRelease } from "@/app/_hooks/useGitHubRelease";
import { readPackageVersion } from "@/app/_server/actions/config";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";
import { convertMarkdownToHtml } from "@/app/_utils/markdown-utils";

export const UpdatePrompt = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [showReleaseNotesModal, setShowReleaseNotesModal] = useState(false);
  const [currentAppVersion, setCurrentAppVersion] = useState<string | null>(
    null
  );
  const { release: latestRelease, error: releaseError } = useGitHubRelease();

  useEffect(() => {
    const checkforUpdates = async () => {
      const dismissedVersion = localStorage.getItem(
        "update-prompt-dismissed-version"
      );

      const currentVersionResult = await readPackageVersion();
      if (!currentVersionResult.success || !currentVersionResult.data) {
        console.error("Failed to read current app version");
        return;
      }
      const currentVersion = currentVersionResult.data;
      setCurrentAppVersion(currentVersion);

      if (!latestRelease) {
        if (releaseError) {
          console.log("Failed to fetch latest release:", releaseError);
        }
        return;
      }

      const latestGithubVersion = latestRelease.tag_name.replace(/^v/, "");

      if (
        compareVersions(dismissedVersion || "0.0.0", currentVersion) < 0 &&
        compareVersions(currentVersion, latestGithubVersion) < 0
      ) {
        setLatestVersion(latestGithubVersion);
        setReleaseUrl(latestRelease.html_url);
        setReleaseNotes(latestRelease.body);
        setShowUpdatePrompt(true);
      }
    };

    if (latestRelease || releaseError) {
      checkforUpdates();
    }
  }, [latestRelease, releaseError]);

  const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    if (currentAppVersion) {
      localStorage.setItem(
        "update-prompt-dismissed-version",
        currentAppVersion
      );
    }
  };

  const handlePromptClick = () => {
    setShowReleaseNotesModal(true);
  };

  const handleCloseModal = () => {
    setShowReleaseNotesModal(false);
    handleDismiss();
  };

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <>
      <Modal
        isOpen={showReleaseNotesModal}
        onClose={handleCloseModal}
        title={`Release Notes v${latestVersion}`}
        className="lg:max-h-[80vh] lg:!max-w-[80vw] lg:!w-[80vw]"
      >
        <div className="flex flex-col h-full max-h-[calc(80vh-10rem)]">
          <div className="flex-1 overflow-y-auto">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {releaseNotes && (
                <UnifiedMarkdownRenderer
                  content={convertMarkdownToHtml(releaseNotes)}
                />
              )}
            </div>
          </div>
        </div>
        <div className="py-4 flex justify-end gap-2">
          <Button onClick={handleCloseModal} variant="ghost">
            Close
          </Button>
          {releaseUrl && (
            <Button onClick={() => window.open(releaseUrl, "_blank")}>
              View on GitHub
            </Button>
          )}
        </div>
      </Modal>
      <div className="fixed bottom-4 left-[2vw] lg:left-auto lg:right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-4 w-[96vw] lg:w-[300px]">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={handlePromptClick}
          >
            <div className="p-2 bg-primary rounded-lg flex items-center justify-center">
              <svg
                className="h-5 w-5 text-primary-foreground"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-foreground hover:underline">
                New version: {latestVersion}
              </h3>
              <p className="text-sm text-muted-foreground">
                Click to see release notes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <MultiplicationSignIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
