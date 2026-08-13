import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchLatestPosts } from "../lib/posts";
import type { LatestFile, Post } from "../types";

export function usePosts() {
  const { t } = useTranslation();
  const [latestFile, setLatestFile] = useState<LatestFile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [downloadTime, setDownloadTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const timestamp = Date.now();
    setDownloadTime(timestamp);
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchLatestPosts(timestamp);
      setLatestFile(result.latest);
      setPosts(result.posts);
    } catch (refreshError) {
      setLatestFile(null);
      setPosts([]);
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : t("errors.latest"),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { latestFile, posts, downloadTime, isLoading, error, refresh };
}