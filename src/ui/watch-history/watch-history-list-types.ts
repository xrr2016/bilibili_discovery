import type { WatchHistoryEntry } from "../../database/types/watch-history.js";
import type { RenderBook } from "../../renderer/RenderBook.js";

export interface WatchHistoryListConfig {
  renderBook: RenderBook<WatchHistoryEntry, HTMLElement>;
  container: HTMLElement;
  autoRender?: boolean;
  onPageChange?: (page: number) => void;
}
