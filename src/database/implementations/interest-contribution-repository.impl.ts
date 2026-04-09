/**
 * InterestContributionRepositoryImpl 实现
 * 实现兴趣贡献事件相关的数据库操作
 */

import { InterestContributionEvent } from '../types/interest.js';
import { ID, Timestamp, Platform } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';
import { generateId } from './id-generator.js';

/**
 * 兴趣贡献事件仓库实现类
 */
export class InterestContributionRepositoryImpl {
  /**
   * 添加单个贡献事件
   */
  async addContributionEvent(
    event: Omit<InterestContributionEvent, 'contributionEventId' | 'createdAt'>
  ): Promise<ID> {
    const eventId = generateId();
    const now = Date.now() as Timestamp;

    const fullEvent: InterestContributionEvent = {
      ...event,
      contributionEventId: eventId,
      createdAt: now
    };

    await DBUtils.put(STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS, fullEvent);
    return eventId;
  }

  /**
   * 批量添加贡献事件
   */
  async addContributionEventsBatch(
    events: Omit<InterestContributionEvent, 'contributionEventId' | 'createdAt'>[]
  ): Promise<ID[]> {
    if (events.length === 0) return [];

    const now = Date.now() as Timestamp;
    const fullEvents: InterestContributionEvent[] = events.map(event => ({
      ...event,
      contributionEventId: generateId(),
      createdAt: now
    }));

    await DBUtils.putBatch(STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS, fullEvents);
    return fullEvents.map(e => e.contributionEventId);
  }

  /**
   * 获取单个贡献事件
   */
  async getContributionEvent(eventId: ID): Promise<InterestContributionEvent | null> {
    return await DBUtils.get<InterestContributionEvent>(
      STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS,
      eventId
    );
  }

  /**
   * 批量获取贡献事件
   */
  async getContributionEvents(eventIds: ID[]): Promise<InterestContributionEvent[]> {
    return await DBUtils.getBatch<InterestContributionEvent>(
      STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS,
      eventIds
    );
  }

  /**
   * 按兴趣主题ID获取所有贡献事件
   */
  async getEventsByTopicId(topicId: ID): Promise<InterestContributionEvent[]> {
    return await DBUtils.getByIndex<InterestContributionEvent>(
      STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS,
      'topicId',
      topicId
    );
  }

  /**
   * 按日期键获取所有贡献事件
   */
  async getEventsByDateKey(dateKey: string): Promise<InterestContributionEvent[]> {
    return await DBUtils.getByIndex<InterestContributionEvent>(
      STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS,
      'dateKey',
      dateKey
    );
  }

  /**
   * 按日期范围获取贡献事件
   * @param startDate 开始日期（格式：YYYY-MM-DD）
   * @param endDate 结束日期（格式：YYYY-MM-DD）
   */
  async getEventsByDateRange(startDate: string, endDate: string): Promise<InterestContributionEvent[]> {
    const range = IDBKeyRange.bound(startDate, endDate);
    return await DBUtils.getByIndexRange<InterestContributionEvent>(
      STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS,
      'dateKey',
      range
    );
  }

  /**
   * 按时间戳范围获取贡献事件
   */
  async getEventsByTimeRange(startTime: Timestamp, endTime: Timestamp): Promise<InterestContributionEvent[]> {
    const range = IDBKeyRange.bound(startTime, endTime);
    return await DBUtils.getByIndexRange<InterestContributionEvent>(
      STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS,
      'eventTime',
      range
    );
  }

  /**
   * 按来源类型获取贡献事件
   */
  async getEventsBySourceType(sourceType: 'watch' | 'favorite' | 'like' | 'coin' | 'manual'): Promise<InterestContributionEvent[]> {
    return await DBUtils.getByIndex<InterestContributionEvent>(
      STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS,
      'sourceType',
      sourceType
    );
  }

  /**
   * 获取所有贡献事件
   */
  async getAllEvents(): Promise<InterestContributionEvent[]> {
    return await DBUtils.getAll<InterestContributionEvent>(STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS);
  }

  /**
   * 按主题+日期范围获取贡献事件
   */
  async getEventsByTopicAndDateRange(
    topicId: ID,
    startDate: string,
    endDate: string
  ): Promise<InterestContributionEvent[]> {
    // 先按 topicId 查询，再过滤日期范围
    const events = await this.getEventsByTopicId(topicId);
    return events.filter(e => e.dateKey >= startDate && e.dateKey <= endDate);
  }

  /**
   * 按平台获取贡献事件
   */
  async getEventsByPlatform(platform: Platform): Promise<InterestContributionEvent[]> {
    return await DBUtils.getByIndex<InterestContributionEvent>(
      STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS,
      'platform',
      platform
    );
  }

  /**
   * 获取贡献事件总数
   */
  async countEvents(): Promise<number> {
    return await DBUtils.count(STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS);
  }

  /**
   * 统计指定主题的贡献事件数量
   */
  async countEventsByTopicId(topicId: ID): Promise<number> {
    return await DBUtils.countByIndex(STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS, 'topicId', topicId);
  }

  /**
   * 统计指定日期的贡献事件数量
   */
  async countEventsByDateKey(dateKey: string): Promise<number> {
    return await DBUtils.countByIndex(STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS, 'dateKey', dateKey);
  }

  /**
   * 统计指定日期范围的贡献事件数量
   */
  async countEventsByDateRange(startDate: string, endDate: string): Promise<number> {
    const range = IDBKeyRange.bound(startDate, endDate);
    return await DBUtils.countByIndexRange(STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS, 'dateKey', range);
  }

  /**
   * 删除单个贡献事件
   */
  async deleteEvent(eventId: ID): Promise<void> {
    await DBUtils.delete(STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS, eventId);
  }

  /**
   * 批量删除贡献事件
   */
  async deleteEvents(eventIds: ID[]): Promise<void> {
    await DBUtils.deleteBatch(STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS, eventIds);
  }

  /**
   * 删除指定日期的所有贡献事件
   */
  async deleteEventsByDateKey(dateKey: string): Promise<void> {
    const events = await this.getEventsByDateKey(dateKey);
    const ids = events.map(e => e.contributionEventId);
    if (ids.length > 0) {
      await this.deleteEvents(ids);
    }
  }

  /**
   * 删除指定日期范围的贡献事件
   */
  async deleteEventsByDateRange(startDate: string, endDate: string): Promise<void> {
    const events = await this.getEventsByDateRange(startDate, endDate);
    const ids = events.map(e => e.contributionEventId);
    if (ids.length > 0) {
      await this.deleteEvents(ids);
    }
  }

  /**
   * 删除指定主题的所有贡献事件
   */
  async deleteEventsByTopicId(topicId: ID): Promise<void> {
    const events = await this.getEventsByTopicId(topicId);
    const ids = events.map(e => e.contributionEventId);
    if (ids.length > 0) {
      await this.deleteEvents(ids);
    }
  }

  /**
   * 清空所有贡献事件
   */
  async deleteAllEvents(): Promise<void> {
    await DBUtils.clear(STORE_NAMES.INTEREST_CONTRIBUTION_EVENTS);
  }

  /**
   * 计算指定主题在指定日期范围内的总贡献分数
   */
  async sumContributionScore(
    topicId: ID,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const events = await this.getEventsByTopicAndDateRange(topicId, startDate, endDate);
    return events.reduce((sum, e) => sum + (e.contributionScore ?? 0), 0);
  }

  /**
   * 计算指定主题在指定日期范围内的总观看时长
   */
  async sumWatchDuration(
    topicId: ID,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const events = await this.getEventsByTopicAndDateRange(topicId, startDate, endDate);
    return events.reduce((sum, e) => sum + (e.watchDuration ?? 0), 0);
  }
}
