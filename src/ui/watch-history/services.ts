import {
  bookManager,
  Platform,
  type BookType,
  type ID,
  type WatchHistoryEntry,
  WatchHistoryQueryService,
  WatchHistoryRepository
} from "../../database/index.js";
import type { WatchHistoryQueryCondition } from "../../database/query-server/query/types.js";
import type { IElementBuilder } from "../../renderer/types.js";
import { RenderBook } from "../../renderer/RenderBook.js";
import type {
  WatchHistoryListItem,
  WatchHistoryQuery,
  WatchHistoryQueryResult,
  WatchHistorySummary,
  WatchHistoryTagSummary
} from "./types.js";

export class WatchHistoryDataService {
  private readonly repository = new WatchHistoryRepository();
  private readonly queryService = new WatchHistoryQueryService(this.repository);
  private historyBook: BookType<WatchHistoryEntry> | null = null;
  private historyRenderBook: RenderBook<WatchHistoryEntry, HTMLElement> | null = null;

  async init(): Promise<void> {
    await this.queryService.loadIndexCache(Platform.BILIBILI);
  }

  async getTagSummaries(keyword: string): Promise<WatchHistoryTagSummary[]> {
    await this.queryService.loadIndexCache(Platform.BILIBILI);

    const tagCounter = new Map<ID, WatchHistoryTagSummary>();
    this.queryService.getWatchHistoryIndexCache().values().forEach((index) => {
      if (index.isInvalid) {
        return;
      }

      index.tags.forEach((tagId) => {
        const existing = tagCounter.get(tagId);
        if (existing) {
          existing.count += 1;
          return;
        }

        const tagIndex = this.queryService.getTagIndexCache().get(tagId);
        tagCounter.set(tagId, {
          tagId,
          name: tagIndex?.name ?? `Tag ${tagId}`,
          count: 1
        });
      });
    });

    const normalizedKeyword = keyword.trim().toLowerCase();
    return Array.from(tagCounter.values())
      .filter((tag) => !normalizedKeyword || tag.name.toLowerCase().includes(normalizedKeyword))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "zh-CN"));
  }

  async getTagsByIds(tagIds: ID[]): Promise<Map<ID, WatchHistoryTagSummary>> {
    const result = new Map<ID, WatchHistoryTagSummary>();
    tagIds.forEach((tagId) => {
      const tagIndex = this.queryService.getTagIndexCache().get(tagId);
      result.set(tagId, {
        tagId,
        name: tagIndex?.name ?? `Tag ${tagId}`,
        count: 0
      });
    });
    return result;
  }

  async queryHistory(query: WatchHistoryQuery): Promise<WatchHistoryQueryResult> {
    const condition = this.toQueryCondition(query);
    const page = await this.getQueryPage(condition, query.page, query.pageSize);

    return {
      items: page.items.map((item) => this.toListItem(item)),
      total: page.state.totalRecords,
      page: page.state.currentPage,
      pageSize: page.state.pageSize,
      totalPages: Math.max(1, page.state.totalPages || 1)
    };
  }

  async getSummary(query: WatchHistoryQuery): Promise<WatchHistorySummary> {
    const condition = this.toQueryCondition(query);
    const matchedIds = await this.queryService.queryIds(condition);
    const indexes = matchedIds
      .map((id) => this.queryService.getWatchHistoryIndexCache().get(id))
      .filter((index): index is NonNullable<typeof index> => Boolean(index));

    const totalWatchDuration = indexes.reduce((sum, item) => sum + item.watchDuration, 0);
    const completeCount = indexes.filter((item) => item.isComplete === 1).length;
    const rewatchedCount = indexes.filter((item) => item.progress > 1 || item.watchDuration > item.videoDuration).length;
    const averageProgress = indexes.length > 0
      ? indexes.reduce((sum, item) => sum + item.progress, 0) / indexes.length
      : 0;

    return {
      totalResults: indexes.length,
      completeCount,
      rewatchedCount,
      totalWatchDuration,
      averageProgress
    };
  }

  async getRenderBook(
    query: WatchHistoryQuery,
    elementBuilder: IElementBuilder<WatchHistoryEntry, HTMLElement>
  ): Promise<RenderBook<WatchHistoryEntry, HTMLElement>> {
    const condition = this.toQueryCondition(query);

    if (!this.historyBook) {
      this.historyBook = await bookManager.createBook(condition, {
        repository: this.repository,
        queryService: this.queryService,
        pageSize: query.pageSize
      });
    } else {
      await this.historyBook.updateIndex(condition);
    }

    if (!this.historyRenderBook) {
      this.historyRenderBook = new RenderBook<WatchHistoryEntry, HTMLElement>({
        book: this.historyBook,
        elementBuilder,
        maxCachePages: 3
      });
      return this.historyRenderBook;
    }

    this.historyRenderBook.setBook(this.historyBook);
    return this.historyRenderBook;
  }

  toQueryCondition(query: WatchHistoryQuery): WatchHistoryQueryCondition {
    const tagExpressions = [
      ...query.includeTagIds.map((tagId) => ({ tagId, operator: "AND" as const })),
      ...query.excludeTagIds.map((tagId) => ({ tagId, operator: "NOT" as const }))
    ];

    return {
      platform: Platform.BILIBILI,
      keyword: query.keyword || undefined,
      creatorKeyword: query.creatorKeyword || undefined,
      tagExpressions: tagExpressions.length > 0 ? tagExpressions : undefined,
      durationRange: this.normalizeRange(query.durationRange),
      publishTimeRange: this.normalizeRange(query.publishTimeRange),
      watchTimeRange: this.normalizeRange(query.watchTimeRange),
      endTimeRange: this.normalizeRange(query.endTimeRange),
      watchDurationRange: this.normalizeRange(query.watchDurationRange),
      progressRange: this.normalizeRange(query.progressRange),
      isComplete: query.isComplete,
      onlyRewatched: query.onlyRewatched,
      includeInvalid: query.includeInvalid,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    };
  }

  private async getQueryPage(condition: WatchHistoryQueryCondition, page: number, pageSize: number) {
    if (!this.historyBook) {
      this.historyBook = await bookManager.createBook(condition, {
        repository: this.repository,
        queryService: this.queryService,
        pageSize
      });
    } else {
      await this.historyBook.updateIndex(condition);
    }

    const totalPages = this.historyBook.state.totalPages;
    const safePage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
    return this.historyBook.getPage(safePage, { pageSize });
  }

  private toListItem(item: WatchHistoryEntry): WatchHistoryListItem {
    return item;
  }

  private normalizeRange<T extends { min?: number; max?: number }>(range: T | undefined): T | undefined {
    if (!range) {
      return undefined;
    }

    if (range.min === undefined && range.max === undefined) {
      return undefined;
    }

    return range;
  }
}
