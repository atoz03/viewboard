const CACHE_KEY = "viewboard:cache";

export interface ViewBoardCache {
  lastSyncTime?: string;
}

export const loadCache = (): ViewBoardCache => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ViewBoardCache) : {};
  } catch {
    return {};
  }
};

export const saveCache = (partial: ViewBoardCache): ViewBoardCache => {
  const existing = loadCache();
  const next = { ...existing, ...partial };
  localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  return next;
};
