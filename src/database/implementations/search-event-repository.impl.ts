/**
 * SearchEventRepository 实现
 * 实现搜索事件相关的数据库操作
 */

import { ISearchEventRepository } from '../interfaces/behavior/search-event-repository.interface.js';
import { SearchEvent } from '../types/behavior.js';
import { Platform, PaginationParams, PaginationResult, TimeRange } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';

/**
 * SearchEventRepository 实现类
 */
export class SearchEventRepository implements ISearchEventRepository {
  /**
   * 记录搜索事件
   */
  async recordSearchEvent(event: Omit<SearchEvent, 'eventId'>): Promise<void> {
    const eventId = `search_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const searchEvent: SearchEvent = {
      eventId,
      ...event
    };
    await DBUtils.add(STORE_NAMES.SEARCH_EVENTS, searchEvent);
  }

  /**
   * 批量记录搜索事件
   */
  async recordSearchEvents(events: Omit<SearchEvent, 'eventId'>[]): Promise<void> {
    const searchEvents: SearchEvent[] = events.map(event => ({
      eventId: `search_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ...event
    }));
    await DBUtils.addBatch(STORE_NAMES.SEARCH_EVENTS, searchEvents);
  }

  /**
   * 获取搜索事件
   */
  async getSearchEvent(eventId: string): Promise<SearchEvent | null> {
    return DBUtils.get<SearchEvent>(STORE_NAMES.SEARCH_EVENTS, eventId);
  }

  /**
   * 获取搜索历史
   */
  async getSearchHistory(
    platform: Platform,
    pagination: PaginationParams
  ): Promise<PaginationResult<SearchEvent>> {
    const allEvents = await DBUtils.getByIndex<SearchEvent>(
      STORE_NAMES.SEARCH_EVENTS,
      'platform',
      platform
    );

    const sorted = allEvents.sort((a, b) => b.timestamp - a.timestamp);

    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const items = sorted.slice(start, end);

    return {
      items,
      total: sorted.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(sorted.length / pagination.pageSize)
    };
  }

  /**
   * 按时间范围获取搜索记录
   */
  async getSearchEventsByTimeRange(
    timeRange: TimeRange,
    platform: Platform,
    pagination: PaginationParams
  ): Promise<PaginationResult<SearchEvent>> {
    const allEvents = await DBUtils.getByIndex<SearchEvent>(
      STORE_NAMES.SEARCH_EVENTS,
      'platform',
      platform
    );

    const filtered = allEvents.filter(e =>
      e.timestamp >= timeRange.startTime &&
      e.timestamp <= timeRange.endTime
    );

    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);

    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const items = sorted.slice(start, end);

    return {
      items,
      total: sorted.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(sorted.length / pagination.pageSize)
    };
  }

  /**
   * 获取热门搜索关键词
   */
  async getHotSearchQueries(
    platform: Platform,
    timeRange: TimeRange,
    limit: number = 100
  ): Promise<{query: string, count: number}[]> {
    const allEvents = await DBUtils.getByIndex<SearchEvent>(
      STORE_NAMES.SEARCH_EVENTS,
      'platform',
      platform
    );

    const filtered = allEvents.filter(e =>
      e.timestamp >= timeRange.startTime &&
      e.timestamp <= timeRange.endTime
    );

    // 统计每个关键词的出现次数
    const queryCountMap = new Map<string, number>();
    filtered.forEach(event => {
      const count = queryCountMap.get(event.query) ?? 0;
      queryCountMap.set(event.query, count + 1);
    });

    // 转换为数组并按次数降序排序
    const result = Array.from(queryCountMap.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return result;
  }

  /**
   * 获取搜索统计
   */
  async getSearchStats(
    platform: Platform,
    timeRange: TimeRange
  ): Promise<{
    total: number;
    uniqueQueries: number;
    avgResults: number;
  }> {
    const allEvents = await DBUtils.getByIndex<SearchEvent>(
      STORE_NAMES.SEARCH_EVENTS,
      'platform',
      platform
    );

    const filtered = allEvents.filter(e =>
      e.timestamp >= timeRange.startTime &&
      e.timestamp <= timeRange.endTime
    );

    const total = filtered.length;
    const uniqueQueries = new Set(filtered.map(e => e.query)).size;

    // 计算平均结果数
    const totalResults = filtered.reduce((sum, e) => sum + (e.resultCount ?? 0), 0);
    const avgResults = total > 0 ? totalResults / total : 0;

    return {
      total,
      uniqueQueries,
      avgResults
    };
  }

  /**
   * 获取搜索建议
   */
  async getSearchSuggestions(
    platform: Platform,
    prefix: string,
    limit: number = 20
  ): Promise<string[]> {
    const allEvents = await DBUtils.getByIndex<SearchEvent>(
      STORE_NAMES.SEARCH_EVENTS,
      'platform',
      platform
    );

    const lowerPrefix = prefix.toLowerCase();
    const uniqueQueries = new Set(allEvents.map(e => e.query));

    // 筛选匹配前缀的查询
    const matched = Array.from(uniqueQueries).filter(query =>
      query.toLowerCase().startsWith(lowerPrefix)
    );

    // 统计每个查询的出现次数
    const queryCountMap = new Map<string, number>();
    allEvents.forEach(event => {
      const count = queryCountMap.get(event.query) ?? 0;
      queryCountMap.set(event.query, count + 1);
    });

    // 按出现次数排序并返回前N个
    return matched
      .sort((a, b) => (queryCountMap.get(b) ?? 0) - (queryCountMap.get(a) ?? 0))
      .slice(0, limit);
  }
}
