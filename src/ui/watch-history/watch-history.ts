import { getWatchHistoryManager } from "./WatchHistoryManager.js";

export async function initWatchHistory(): Promise<void> {
  await getWatchHistoryManager().init();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void initWatchHistory(), { once: true });
  } else {
    void initWatchHistory();
  }
}
