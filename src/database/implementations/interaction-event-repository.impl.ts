/**
 * InteractionEventRepository 实现
 * 实现互动事件相关的数据库操作
 */

import { IInteractionEventRepository } from '../interfaces/behavior/interaction-event-repository.interface';
import { InteractionEvent } from '../types/behavior';
import { Platform, PaginationParams, PaginationResult, TimeRange } from '../types/base';
import { DBUtils, STORE_NAMES } from '../indexeddb';

/**
 * InteractionEventRepository 实现类
 */
export class InteractionEventRepository implements IInteractionEventRepository {
  /**
   * 记录互动事件
   */
  async recordInteractionEvent(event: Omit<InteractionEvent, 'eventId'>): Promise<void> {
    const eventId = `interaction_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const interactionEvent: InteractionEvent = {
      eventId,
      ...event
    };
    await DBUtils.add(STORE_NAMES.INTERACTION_EVENTS, interactionEvent);
  }

  /**
   * 批量记录互动事件
   */
  async recordInteractionEvents(events: Omit<InteractionEvent, 'eventId'>[]): Promise<void> {
    const interactionEvents: InteractionEvent[] = events.map(event => ({
      eventId: `interaction_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ...event
    }));
    await DBUtils.addBatch(STORE_NAMES.INTERACTION_EVENTS, interactionEvents);
  }

  /**
   * 获取互动事件
   */
  async getInteractionEvent(eventId: string): Promise<InteractionEvent | null> {
    return DBUtils.get<InteractionEvent>(STORE_NAMES.INTERACTION_EVENTS, eventId);
  }

  /**
   * 获取视频的互动记录
   */
  async getVideoInteractionEvents(
    videoId: string,
    platform: Platform,
    type?: InteractionEvent['type'],
    pagination?: PaginationParams
  ): Promise<PaginationResult<InteractionEvent>> {
    const allEvents = await DBUtils.getByIndex<InteractionEvent>(
      STORE_NAMES.INTERACTION_EVENTS,
      'videoId',
      videoId
    );

    let filtered = allEvents.filter(e => e.platform === platform);
    if (type !== undefined) {
      filtered = filtered.filter(e => e.type === type);
    }

    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (!pagination) {
      return {
        items: sorted,
        total: sorted.length,
        page: 0,
        pageSize: sorted.length,
        totalPages: 1
      };
    }

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
   * 获取创作者的互动记录
   */
  async getCreatorInteractionEvents(
    creatorId: string,
    platform: Platform,
    type?: InteractionEvent['type'],
    pagination?: PaginationParams
  ): Promise<PaginationResult<InteractionEvent>> {
    const allEvents = await DBUtils.getByIndex<InteractionEvent>(
      STORE_NAMES.INTERACTION_EVENTS,
      'creatorId',
      creatorId
    );

    let filtered = allEvents.filter(e => e.platform === platform);
    if (type !== undefined) {
      filtered = filtered.filter(e => e.type === type);
    }

    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (!pagination) {
      return {
        items: sorted,
        total: sorted.length,
        page: 0,
        pageSize: sorted.length,
        totalPages: 1
      };
    }

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
   * 按时间范围获取互动记录
   */
  async getInteractionEventsByTimeRange(
    timeRange: TimeRange,
    platform: Platform,
    type?: InteractionEvent['type'],
    pagination?: PaginationParams
  ): Promise<PaginationResult<InteractionEvent>> {
    const allEvents = await DBUtils.getByIndex<InteractionEvent>(
      STORE_NAMES.INTERACTION_EVENTS,
      'platform',
      platform
    );

    let filtered = allEvents.filter(e =>
      e.timestamp >= timeRange.startTime &&
      e.timestamp <= timeRange.endTime
    );

    if (type !== undefined) {
      filtered = filtered.filter(e => e.type === type);
    }

    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (!pagination) {
      return {
        items: sorted,
        total: sorted.length,
        page: 0,
        pageSize: sorted.length,
        totalPages: 1
      };
    }

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
   * 统计互动次数
   */
  async countInteractions(
    videoId: string,
    platform: Platform,
    type?: InteractionEvent['type']
  ): Promise<number> {
    const allEvents = await DBUtils.getByIndex<InteractionEvent>(
      STORE_NAMES.INTERACTION_EVENTS,
      'videoId',
      videoId
    );

    let filtered = allEvents.filter(e => e.platform === platform);
    if (type !== undefined) {
      filtered = filtered.filter(e => e.type === type);
    }

    return filtered.length;
  }

  /**
   * 统计创作者互动次数
   */
  async countCreatorInteractions(
    creatorId: string,
    platform: Platform,
    timeRange?: TimeRange
  ): Promise<number> {
    const allEvents = await DBUtils.getByIndex<InteractionEvent>(
      STORE_NAMES.INTERACTION_EVENTS,
      'creatorId',
      creatorId
    );

    let filtered = allEvents.filter(e => e.platform === platform);
    if (timeRange !== undefined) {
      filtered = filtered.filter(e =>
        e.timestamp >= timeRange.startTime &&
        e.timestamp <= timeRange.endTime
      );
    }

    return filtered.length;
  }
}
