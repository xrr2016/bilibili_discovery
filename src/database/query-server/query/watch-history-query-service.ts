import type { ID, Platform } from "../../types/base.js";
import type { CreatorIndex, TagExpression, WatchHistoryIndex, WatchHistoryQueryCondition } from "../cache/types.js";
import type { QueryOutput } from "./types.js";

import { CreatorRepository } from "../../repositories/creator-repository.js";
import { WatchHistoryRepository } from "../../repositories/watch-history-repository.js";
import { CacheManager } from "../cache/cache-manager.js";
import { IndexCache } from "../cache/index-cache.js";
import { TagFilterEngine } from "./tag-filter-engine.js";

export class WatchHistoryQueryService {
  private readonly cacheManager = CacheManager.getInstance();
  private readonly watchHistoryIndexCache = this.cacheManager.getWatchHistoryIndexCache();
  private readonly creatorIndexCache: IndexCache<CreatorIndex> = this.cacheManager.getIndexCache();
  private readonly watchHistoryRepository: WatchHistoryRepository;
  private readonly creatorRepository: CreatorRepository;

  constructor(
    watchHistoryRepository?: WatchHistoryRepository,
    creatorRepository?: CreatorRepository
  ) {
    this.watchHistoryRepository = watchHistoryRepository ?? new WatchHistoryRepository();
    this.creatorRepository = creatorRepository ?? new CreatorRepository();
  }

  async queryIds(condition: WatchHistoryQueryCondition): Promise<ID[]> {
    const result = await this.query(condition);
    return result.matchedIds;
  }

  async query(condition: WatchHistoryQueryCondition): Promise<QueryOutput> {
    await this.ensureIndexCaches(condition.platform);

    const indexes = this.watchHistoryIndexCache
      .values()
      .filter((index) => index.platform === condition.platform);

    const filters: Array<(index: WatchHistoryIndex) => boolean> = [];

    if (!condition.includeInvalid) {
      filters.push((index) => !index.isInvalid);
    }

    if (condition.keyword) {
      const terms = this.normalizeSearchTerms(condition.keyword);
      filters.push((index) => this.matchesAllTerms(`${index.title} ${index.bv}`, terms));
    }

    if (condition.creatorKeyword) {
      const creatorTerms = this.normalizeSearchTerms(condition.creatorKeyword);
      const creatorIds = new Set(
        this.creatorIndexCache
          .values()
          .filter((creator) => this.matchesAllTerms(creator.name, creatorTerms))
          .map((creator) => creator.creatorId)
      );
      filters.push((index) => creatorIds.has(index.creatorId));
    }

    if (condition.tagExpressions && condition.tagExpressions.length > 0) {
      const matchedIds = this.filterByTags(indexes, condition.tagExpressions);
      filters.push((index) => matchedIds.has(index.historyEntryId));
    }

    if (condition.durationRange) {
      const range = condition.durationRange;
      filters.push((index) => this.matchesRange(index.duration, range));
    }

    if (condition.publishTimeRange) {
      const range = condition.publishTimeRange;
      filters.push((index) => this.matchesRange(index.publishTime, range));
    }

    if (condition.watchTimeRange) {
      const range = condition.watchTimeRange;
      filters.push((index) => this.matchesRange(index.watchTime, range));
    }

    if (condition.endTimeRange) {
      const range = condition.endTimeRange;
      filters.push((index) => this.matchesRange(index.endTime, range));
    }

    if (condition.watchDurationRange) {
      const range = condition.watchDurationRange;
      filters.push((index) => this.matchesRange(index.watchDuration, range));
    }

    if (condition.progressRange) {
      const range = condition.progressRange;
      filters.push((index) => this.matchesRange(index.progress, range));
    }

    if (typeof condition.isComplete === "number") {
      filters.push((index) => index.isComplete === condition.isComplete);
    }

    if (condition.onlyRewatched) {
      filters.push((index) => index.progress > 1 || index.watchDuration > index.videoDuration);
    }

    const results = indexes.filter((index) => filters.every((filter) => filter(index)));
    results.sort((left, right) => this.compareIndexes(left, right, condition));

    return {
      matchedIds: results.map((index) => index.historyEntryId),
      stats: {
        initialCount: indexes.length,
        stageCounts: {}
      }
    };
  }

  async loadIndexCache(platform: Platform): Promise<void> {
    await this.watchHistoryRepository.getAll();
    await this.ensureCreatorIndexCache(platform);
  }

  getWatchHistoryIndexCache(): IndexCache<WatchHistoryIndex> {
    return this.watchHistoryIndexCache;
  }

  getTagIndexCache() {
    return this.cacheManager.getTagIndexCache();
  }

  private async ensureIndexCaches(platform: Platform): Promise<void> {
    if (this.watchHistoryIndexCache.size() === 0) {
      await this.watchHistoryRepository.getAll();
    }

    await this.ensureCreatorIndexCache(platform);
  }

  private async ensureCreatorIndexCache(platform: Platform): Promise<void> {
    if (this.creatorIndexCache.size() > 0) {
      return;
    }

    const creators = await this.creatorRepository.getAllCreators(platform);
    const entries = new Map<ID, CreatorIndex>();
    creators.forEach((creator) => {
      entries.set(creator.creatorId, {
        creatorId: creator.creatorId,
        name: creator.name,
        tags: creator.tagWeights.map((tag) => tag.tagId),
        isFollowing: creator.isFollowing === 1
      });
    });

    this.creatorIndexCache.setBatch(entries);
  }

  private filterByTags(indexes: WatchHistoryIndex[], expressions: TagExpression[]): Set<ID> {
    const tagToIds = TagFilterEngine.buildTagIndexMap(
      indexes.map((index) => ({ id: index.historyEntryId, tags: index.tags }))
    );

    return TagFilterEngine.filter(tagToIds, expressions).matchedIds;
  }

  private compareIndexes(
    left: WatchHistoryIndex,
    right: WatchHistoryIndex,
    condition: WatchHistoryQueryCondition
  ): number {
    const sortBy = condition.sortBy ?? "endTime";
    const sortOrder = condition.sortOrder ?? "desc";
    const direction = sortOrder === "asc" ? 1 : -1;

    const valueOf = (index: WatchHistoryIndex): number | string => {
      switch (sortBy) {
        case "publishTime":
          return index.publishTime;
        case "watchTime":
          return index.watchTime;
        case "watchDuration":
          return index.watchDuration;
        case "progress":
          return index.progress;
        case "duration":
          return index.duration;
        case "title":
          return index.title;
        case "endTime":
        default:
          return index.endTime;
      }
    };

    const leftValue = valueOf(left);
    const rightValue = valueOf(right);

    if (typeof leftValue === "string" && typeof rightValue === "string") {
      const diff = leftValue.localeCompare(rightValue, "zh-CN");
      if (diff !== 0) {
        return diff * direction;
      }
      return (right.endTime - left.endTime) * direction;
    }

    const diff = Number(leftValue) - Number(rightValue);
    if (diff !== 0) {
      return diff * direction;
    }

    return (right.endTime - left.endTime) * direction;
  }

  private matchesRange(value: number, range: { min?: number; max?: number }): boolean {
    if (typeof range.min === "number" && value < range.min) {
      return false;
    }

    if (typeof range.max === "number" && value > range.max) {
      return false;
    }

    return true;
  }

  private normalizeSearchTerms(keyword: string): string[] {
    return keyword
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);
  }

  private matchesAllTerms(value: string, terms: string[]): boolean {
    if (terms.length === 0) {
      return true;
    }

    const normalizedValue = value.toLowerCase();
    return terms.every((term) => normalizedValue.includes(term));
  }
}
