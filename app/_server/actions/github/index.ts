"use server";

import { Result } from "@/app/_types";
import { getAppSettings } from "../config";

export interface GitHubRelease {
  tag_name: string;
  html_url: string;
  published_at: string;
  body: string;
}

export const getLatestGitHubRelease = async (): Promise<
  Result<GitHubRelease>
> => {
  const stopCheckUpdates = process.env.STOP_CHECK_UPDATES?.toLowerCase();
  const appSettings = await getAppSettings();

  if (
    stopCheckUpdates &&
    (stopCheckUpdates.toLowerCase() !== "no" ||
      stopCheckUpdates.toLowerCase() !== "false")
  ) {
    console.log("Update checks are disabled");

    return {
      success: false,
      error: "Update checks are disabled via environment variable",
    };
  }

  if (appSettings.success && appSettings.data) {
    if (appSettings.data.notifyNewUpdates === "no") {
      return {
        success: false,
        error: "Update checks are disabled via app settings",
      };
    }
  }

  try {
    const response = await fetch(
      "https://api.github.com/repos/fccview/jotty/releases/latest",
      {
        next: { revalidate: 28800 },
      }
    );

    if (!response.ok) {
      console.error(
        "Failed to fetch latest GitHub release:",
        response.statusText
      );
      return { success: false, error: "Failed to fetch latest release" };
    }

    const release: GitHubRelease = await response.json();
    return { success: true, data: release };
  } catch (error) {
    console.error("Error fetching latest GitHub release:", error);
    return { success: false, error: "Failed to fetch latest release" };
  }
};
