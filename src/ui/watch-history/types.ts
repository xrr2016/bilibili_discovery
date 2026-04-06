import type { ID, PaginationResult } from "../../database/types/base.js";
import type { WatchHistoryEntry } from "../../database/types/watch-history.js";
import type { WatchHistoryQueryCondition } from "../../database/query-server/query/types.js";

export interface WatchHistoryTagSummary {
  tagId: ID;
  name: string;
  count: number;
}

export interface WatchHistoryListItem extends WatchHistoryEntry {}

export interface WatchHistoryQuery extends Omit<WatchHistoryQueryCondition, "platform" | "tagExpressions"> {
  keyword: string;
  creatorKeyword: string;
  includeTagIds: ID[];
  excludeTagIds: ID[];
  page: number;
  pageSize: number;
}

export interface WatchHistoryQueryResult extends PaginationResult<WatchHistoryListItem> {}

export interface WatchHistorySummary {
  totalResults: number;
  completeCount: number;
  rewatchedCount: number;
  totalWatchDuration: number;
  averageProgress: number;
}

export interface WatchHistoryPageState {
  loading: boolean;
  error?: string;
  keyword: string;
  creatorKeyword: string;
  tagKeyword: string;
  includeTagIds: ID[];
  excludeTagIds: ID[];
  durationMin: string;
  durationMax: string;
  watchDurationMin: string;
  watchDurationMax: string;
  progressMin: string;
  progressMax: string;
  publishDateStart: string;
  publishDateEnd: string;
  watchDateStart: string;
  watchDateEnd: string;
  completeFilter: "all" | "complete" | "incomplete";
  rewatchFilter: "all" | "rewatched" | "single";
  includeInvalid: boolean;
  sortBy: NonNullable<WatchHistoryQuery["sortBy"]>;
  sortOrder: NonNullable<WatchHistoryQuery["sortOrder"]>;
  currentPage: number;
  pageSize: number;
}
