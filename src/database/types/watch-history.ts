import type { ID, Platform, Timestamp } from "./base.js";

export interface WatchHistoryEntry {
  historyEntryId: ID;
  eventId: ID;
  videoId: ID;
  platform: Platform;
  bv: string;
  title: string;
  description: string;
  creatorId: ID;
  creatorName: string;
  duration: number;
  publishTime: Timestamp;
  tags: ID[];
  tagNames: string[];
  coverUrl?: string;
  picture?: ID;
  watchTime: Timestamp;
  endTime: Timestamp;
  watchDuration: number;
  videoDuration: number;
  progress: number;
  isComplete: number;
  isInvalid?: boolean;
}
