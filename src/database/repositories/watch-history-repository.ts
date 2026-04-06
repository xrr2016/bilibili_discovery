import type { Creator } from "../types/creator.js";
import type { Tag } from "../types/semantic.js";
import type { Video } from "../types/video.js";
import type { WatchEvent } from "../types/behavior.js";
import type { WatchHistoryEntry } from "../types/watch-history.js";
import type { ID } from "../types/base.js";
import type { TagIndex, WatchHistoryIndex } from "../query-server/cache/types.js";
import type { IDataRepository } from "../query-server/book/base-book-manager.js";

import { CacheManager } from "../query-server/cache/cache-manager.js";
import { CreatorRepository } from "./creator-repository.js";
import { TagRepository } from "./tag-repository.js";
import { VideoRepository } from "./video-repository.js";
import { WatchEventRepositoryImpl } from "../implementations/watch-event-repository.impl.js";

export class WatchHistoryRepository implements IDataRepository<WatchHistoryEntry> {
  private readonly cacheManager = CacheManager.getInstance();
  private readonly dataCache = this.cacheManager.getWatchHistoryDataCache();
  private readonly indexCache = this.cacheManager.getWatchHistoryIndexCache();
  private readonly tagIndexCache = this.cacheManager.getTagIndexCache();
  private readonly watchEventRepo = new WatchEventRepositoryImpl();
  private readonly videoRepo = new VideoRepository();
  private readonly creatorRepo = new CreatorRepository();
  private readonly tagRepo = new TagRepository();

  async getById(id: number): Promise<WatchHistoryEntry | null> {
    const cached = this.dataCache.get(id);
    if (cached) {
      return cached;
    }

    const watchEvent = await this.watchEventRepo.getWatchEventByVideoId(id);
    if (!watchEvent) {
      return null;
    }

    const entry = await this.buildEntry(watchEvent);
    if (entry) {
      this.cacheEntry(entry);
    }

    return entry;
  }

  async getByIds(ids: number[]): Promise<WatchHistoryEntry[]> {
    if (ids.length === 0) {
      return [];
    }

    const result = new Map<ID, WatchHistoryEntry>();
    const missingIds: ID[] = [];

    ids.forEach((id) => {
      const cached = this.dataCache.get(id);
      if (cached) {
        result.set(id, cached);
      } else {
        missingIds.push(id);
      }
    });

    if (missingIds.length > 0) {
      const watchEvents = await this.watchEventRepo.getWatchEventsByVideoIds(missingIds);
      const entries = await this.buildEntries(watchEvents);
      entries.forEach((entry) => {
        result.set(entry.historyEntryId, entry);
        this.cacheEntry(entry);
      });
    }

    return ids
      .map((id) => result.get(id))
      .filter((entry): entry is WatchHistoryEntry => Boolean(entry));
  }

  async getAll(): Promise<WatchHistoryEntry[]> {
    if (this.indexCache.size() > 0 && this.dataCache.size() > 0) {
      return this.dataCache.values();
    }

    const watchEvents = await this.watchEventRepo.getAllWatchEvents();
    const entries = await this.buildEntries(watchEvents);
    const dataEntries = new Map<ID, WatchHistoryEntry>();
    const indexEntries = new Map<ID, WatchHistoryIndex>();

    entries.forEach((entry) => {
      dataEntries.set(entry.historyEntryId, entry);
      indexEntries.set(entry.historyEntryId, this.toIndex(entry));
    });

    this.dataCache.setBatch(dataEntries);
    this.indexCache.setBatch(indexEntries);

    return entries;
  }

  private async buildEntries(watchEvents: WatchEvent[]): Promise<WatchHistoryEntry[]> {
    if (watchEvents.length === 0) {
      return [];
    }

    const videoIds = Array.from(new Set(watchEvents.map((event) => event.videoId)));
    const videos = await this.videoRepo.getVideos(videoIds);
    const creatorIds = Array.from(new Set(Array.from(videos.values()).map((video) => video.creatorId)));
    const creators = await this.creatorRepo.getCreators(creatorIds);
    const tagIds = Array.from(new Set(Array.from(videos.values()).flatMap((video) => video.tags)));
    const tags = await this.tagRepo.getTags(tagIds);

    this.ensureTagIndexCache(tags);

    return watchEvents
      .map((watchEvent) => this.toEntry(watchEvent, videos, creators, tags))
      .filter((entry): entry is WatchHistoryEntry => entry !== null);
  }

  private async buildEntry(watchEvent: WatchEvent): Promise<WatchHistoryEntry | null> {
    const entries = await this.buildEntries([watchEvent]);
    return entries[0] ?? null;
  }

  private toEntry(
    watchEvent: WatchEvent,
    videos: Map<ID, Video>,
    creators: Map<ID, Creator>,
    tags: Map<ID, Tag>
  ): WatchHistoryEntry | null {
    const video = videos.get(watchEvent.videoId);
    if (!video) {
      return null;
    }

    const creator = creators.get(video.creatorId);
    const resolvedTags = video.tags.map((tagId) => ({
      tagId,
      tagName: tags.get(tagId)?.name ?? `Tag ${tagId}`
    }));

    return {
      historyEntryId: watchEvent.videoId,
      eventId: watchEvent.eventId,
      videoId: watchEvent.videoId,
      platform: watchEvent.platform,
      bv: video.bv,
      title: video.title,
      description: video.description,
      creatorId: video.creatorId,
      creatorName: creator?.name ?? `UP ${video.creatorId}`,
      duration: video.duration,
      publishTime: video.publishTime,
      tags: resolvedTags.map((item) => item.tagId),
      tagNames: resolvedTags.map((item) => item.tagName),
      coverUrl: video.coverUrl,
      picture: video.picture,
      watchTime: watchEvent.watchTime,
      endTime: watchEvent.endTime,
      watchDuration: watchEvent.watchDuration,
      videoDuration: watchEvent.videoDuration,
      progress: watchEvent.progress,
      isComplete: watchEvent.isComplete,
      isInvalid: video.isInvalid
    };
  }

  private toIndex(entry: WatchHistoryEntry): WatchHistoryIndex {
    return {
      historyEntryId: entry.historyEntryId,
      videoId: entry.videoId,
      platform: entry.platform,
      bv: entry.bv,
      title: entry.title,
      creatorId: entry.creatorId,
      tags: entry.tags,
      duration: entry.duration,
      publishTime: entry.publishTime,
      watchTime: entry.watchTime,
      endTime: entry.endTime,
      watchDuration: entry.watchDuration,
      videoDuration: entry.videoDuration,
      progress: entry.progress,
      isComplete: entry.isComplete,
      isInvalid: entry.isInvalid
    };
  }

  private cacheEntry(entry: WatchHistoryEntry): void {
    this.dataCache.set(entry.historyEntryId, entry);
    this.indexCache.set(entry.historyEntryId, this.toIndex(entry));
  }

  private ensureTagIndexCache(tags: Map<ID, Tag>): void {
    const missingEntries = new Map<ID, TagIndex>();
    tags.forEach((tag, tagId) => {
      if (!this.tagIndexCache.get(tagId)) {
        missingEntries.set(tagId, {
          tagId,
          name: tag.name,
          source: tag.source
        });
      }
    });

    if (missingEntries.size > 0) {
      this.tagIndexCache.setBatch(missingEntries);
    }
  }
}
