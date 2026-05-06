"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

export interface FavoriteItem {
  pluginId: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  icon: string;
  collectedAt: string;
}

const STORAGE_KEY = "plugin-favorites";

export function useFavorites() {
  const [favorites, setFavorites, loaded] = useLocalStorage<FavoriteItem[]>(
    STORAGE_KEY,
    []
  );

  const isFavorited = useCallback(
    (pluginId: string) => {
      return favorites.some((f) => f.pluginId === pluginId);
    },
    [favorites]
  );

  const addFavorite = useCallback(
    (item: Omit<FavoriteItem, "collectedAt">) => {
      setFavorites((prev) => {
        if (prev.some((f) => f.pluginId === item.pluginId)) return prev;
        const now = new Date().toISOString().slice(0, 10);
        return [{ ...item, collectedAt: now }, ...prev];
      });
    },
    [setFavorites]
  );

  const removeFavorite = useCallback(
    (pluginId: string) => {
      setFavorites((prev) => prev.filter((f) => f.pluginId !== pluginId));
    },
    [setFavorites]
  );

  const toggleFavorite = useCallback(
    (item: Omit<FavoriteItem, "collectedAt">) => {
      if (isFavorited(item.pluginId)) {
        removeFavorite(item.pluginId);
      } else {
        addFavorite(item);
      }
    },
    [isFavorited, addFavorite, removeFavorite]
  );

  return { favorites, isFavorited, addFavorite, removeFavorite, toggleFavorite, loaded };
}
