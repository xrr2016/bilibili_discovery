/**
 * WatchEventRepositoryImpl 实现
 * 实现观看事件相关的数据库操作
 */

// 接口已移除，直接实现功能
import { WatchEvent } from '../types/behavior.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';
import { generateId } from './id-generator.js';
import {ID} from '../types/base.js';
import { VideoRepositoryImpl } from './video-repository.impl.js';

/**
 * WatchEventRepositoryImpl 实现类
 */
export class WatchEventRepositoryImpl {
  private videoRepository: VideoRepositoryImpl;

  constructor() {
    this.videoRepository = new VideoRepositoryImpl();
  }

  /**
   * 记录观看事件
   * 根据视频的bv号来锁定唯一事件并更新
   * 如果该视频已有观看事件，则更新该事件；否则创建新事件
   */
  async recordWatchEvent(event: Omit<WatchEvent, 'eventId'>): Promise<void> {
    // 根据videoId查找视频
    const video = await this.videoRepository.getVideo(event.videoId);
    if (!video) {
      throw new Error(`Video not found: ${event.videoId}`);
    }

    // 查找该视频的现有观看事件
    const existingEvent = await this.getWatchEventByVideoId(event.videoId);

    if (existingEvent) {
      // 更新现有事件
      const updatedEvent: WatchEvent = {
        ...existingEvent,
        watchDuration: event.watchDuration,
        progress: event.progress,
        isComplete: event.isComplete,
        endTime: event.endTime
      };
      await DBUtils.put(STORE_NAMES.WATCH_EVENTS, updatedEvent);
    } else {
      // 创建新事件
      const eventId = generateId();
      const watchEvent: WatchEvent = {
        eventId,
        ...event
      };
      await DBUtils.add(STORE_NAMES.WATCH_EVENTS, watchEvent);
    }
  }

  /**
   * 根据视频ID获取观看事件
   * @param videoId 视频ID
   * @returns 观看事件，不存在返回null
   */
  async getWatchEventByVideoId(videoId: ID): Promise<WatchEvent | null> {
    const allEvents = await DBUtils.getAll<WatchEvent>(STORE_NAMES.WATCH_EVENTS);
    const videoEvents = allEvents.filter(event => event.videoId === videoId);
    return videoEvents.length > 0 ? videoEvents[0] : null;
  }

  /**
   * 批量记录观看事件
   */
  async recordWatchEvents(events: Omit<WatchEvent, 'eventId'>[]): Promise<void> {
    const watchEvents: WatchEvent[] = events.map(event => ({
      eventId: generateId(),
      ...event
    }));
    await DBUtils.addBatch(STORE_NAMES.WATCH_EVENTS, watchEvents);
  }

  /**
   * 获取观看事件
   */
  async getWatchEvent(eventId: ID): Promise<WatchEvent | null> {
    return DBUtils.get<WatchEvent>(STORE_NAMES.WATCH_EVENTS, eventId);
  }

  /**
   * 获取视频最近的观看事件
   * @param videoId 视频ID
   * @param maxInterval 最大间隔时间（毫秒），超过此时间则认为不是连续观看
   * @returns 最近的观看事件，如果不存在或超过最大间隔时间则返回null
   */
  async getRecentWatchEvent(videoId: ID, maxInterval: number = 30 * 60 * 1000): Promise<WatchEvent | null> {
    const allEvents = await DBUtils.getAll<WatchEvent>(STORE_NAMES.WATCH_EVENTS);
    const videoEvents = allEvents
      .filter(event => event.videoId === videoId)
      .sort((a, b) => b.endTime - a.endTime);

    if (videoEvents.length === 0) {
      return null;
    }

    const recentEvent = videoEvents[0];
    const now = Date.now();
    const interval = now - recentEvent.endTime;

    // 如果间隔时间小于最大间隔时间，返回最近的观看事件
    return interval < maxInterval ? recentEvent : null;
  }

  /**
   * 更新观看事件
   */
  async updateWatchEvent(eventId: ID, updates: Partial<Omit<WatchEvent, 'eventId' | 'videoId' | 'creatorId' | 'watchTime'>>): Promise<void> {
    const event = await this.getWatchEvent(eventId);
    if (!event) {
      throw new Error(`WatchEvent not found: ${eventId}`);
    }

    const updatedEvent: WatchEvent = {
      ...event,
      ...updates
    };

    await DBUtils.put(STORE_NAMES.WATCH_EVENTS, updatedEvent);
  }










}
