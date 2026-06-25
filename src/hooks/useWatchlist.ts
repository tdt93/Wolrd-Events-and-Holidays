import { useCallback, useEffect, useState } from "react";

const WATCHLIST_KEY = "sunny-atlas-watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const toggle = useCallback((code: string) => {
    setWatchlist((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }, []);

  const isWatched = useCallback(
    (code: string) => watchlist.includes(code),
    [watchlist],
  );

  return { watchlist, toggle, isWatched };
}
