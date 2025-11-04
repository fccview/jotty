"use client";

import { useState, useEffect } from "react";
import {
  getLatestGitHubRelease,
  GitHubRelease,
} from "@/app/_server/actions/github";

interface CachedRelease {
  data: GitHubRelease;
  timestamp: number;
}

const CACHE_KEY = "github-latest-release";
const CACHE_DURATION = 60 * 60 * 1000;

export const useGitHubRelease = () => {
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelease = async () => {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsedCache: CachedRelease = JSON.parse(cached);
          const now = Date.now();

          if (now - parsedCache.timestamp < CACHE_DURATION) {
            setRelease(parsedCache.data);
            return;
          }
        } catch (e) {
          console.warn("Invalid GitHub release cache, fetching fresh data");
        }
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getLatestGitHubRelease();

        if (result.success && result.data) {
          setRelease(result.data);

          const cacheData: CachedRelease = {
            data: result.data,
            timestamp: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } else {
          setError(result.error || "Failed to fetch release");
        }
      } catch (err) {
        setError("Failed to fetch GitHub release");
        console.error("Error fetching GitHub release:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRelease();
  }, []);

  return { release, loading, error };
};
