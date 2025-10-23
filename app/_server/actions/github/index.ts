"use server";

import { Result } from "@/app/_types";

export interface GitHubRelease {
  tag_name: string;
  html_url: string;
  published_at: string;
  body: string;
}

export const getLatestGitHubRelease = async (): Promise<
  Result<GitHubRelease>
> => {
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
