"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export interface DownloadItem {
  pluginId: string;
  name: string;
  description: string;
  category: string;
  version: string;
  icon: string;
  downloadedAt: string;
}

export interface DownloadCountEntry {
  pluginId: string;
  count: number;
}

const DOWNLOADS_KEY = "plugin-downloads";
const DOWNLOAD_COUNTS_KEY = "plugin-download-counts";

export function useDownloads() {
  const [downloads, setDownloads, loaded] = useLocalStorage<DownloadItem[]>(
    DOWNLOADS_KEY,
    []
  );

  const [downloadCounts, setDownloadCounts, countsLoaded] = useLocalStorage<
    DownloadCountEntry[]
  >(DOWNLOAD_COUNTS_KEY, []);

  const localDownloadCount = useCallback(
    (pluginId: string) => {
      return downloadCounts.find((d) => d.pluginId === pluginId)?.count ?? 0;
    },
    [downloadCounts]
  );

  const effectiveDownloadCount = useCallback(
    (pluginId: string, baseCount: number) => {
      return baseCount + localDownloadCount(pluginId);
    },
    [localDownloadCount]
  );

  const addDownload = useCallback(
    (item: Omit<DownloadItem, "downloadedAt">) => {
      const now = new Date().toISOString().slice(0, 10);
      setDownloads((prev) => {
        const filtered = prev.filter((d) => d.pluginId !== item.pluginId);
        return [{ ...item, downloadedAt: now }, ...filtered];
      });
      setDownloadCounts((prev) => {
        const entry = prev.find((d) => d.pluginId === item.pluginId);
        if (entry) {
          return prev.map((d) =>
            d.pluginId === item.pluginId ? { ...d, count: d.count + 1 } : d
          );
        }
        return [...prev, { pluginId: item.pluginId, count: 1 }];
      });
    },
    [setDownloads, setDownloadCounts]
  );

  const hasDownloaded = useCallback(
    (pluginId: string) => {
      return downloads.some((d) => d.pluginId === pluginId);
    },
    [downloads]
  );

  return {
    downloads,
    downloadCounts,
    localDownloadCount,
    effectiveDownloadCount,
    addDownload,
    hasDownloaded,
    loaded: loaded && countsLoaded,
  };
}
