
/**
 * 行为管理接口
 * 负责管理用户观看行为、互动行为和搜索行为
 */

import type {
  WatchEvent,
  InteractionEvent,
  SearchEvent,
  WatchEventQueryParams,
  InteractionEventQueryParams,
  SearchEventQueryParams,
  WatchStats,
  InteractionStats,
  DBResult,
  PaginationParams,
  PaginationResult,
  ID
} from '../types';

/**
 * 观看行为管理接口
 */
export interface IWatchEventManager {
  /**
   * 记录观看事件
   * @param event 观看事件
   * @returns 操作结果
   */
  recordWatchEvent(event: Omit<WatchEvent, 'event_id' | 'created_at'>): Promise<DBResult<WatchEvent>>;

  /**
   * 更新观看事件
   * @param eventId 事件ID
   * @param updates 更新内容
   * @returns 操作结果
   */
  updateWatchEvent(
    eventId: ID,
    updates: Partial<Pick<WatchEvent, 'watch_duration' | 'progress'>>
  ): Promise<DBResult<WatchEvent>>;

  /**
   * 获取观看事件
   * @param eventId 事件ID
   * @returns 观看事件
   */
  getWatchEvent(eventId: ID): Promise<DBResult<WatchEvent>>;

  /**
   * 查询观看事件列表
   * @param params 查询参数
   * @param pagination 分页参数
   * @returns 观看事件列表
   */
  queryWatchEvents(
    params: WatchEventQueryParams,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<WatchEvent>>>;

  /**
   * 获取视频观看统计
   * @param videoId 视频ID
   * @returns 观看统计
   */
  getVideoWatchStats(videoId: ID): Promise<DBResult<WatchStats>>;

  /**
   * 获取创作者观看统计
   * @param creatorId 创作者ID
   * @returns 观看统计
   */
  getCreatorWatchStats(creatorId: ID): Promise<DBResult<WatchStats>>;

  /**
   * 获取用户观看统计
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 观看统计
   */
  getUserWatchStats(
    startTime?: number,
    endTime?: number
  ): Promise<DBResult<WatchStats>>;

  /**
   * 获取观看时间分布
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 时间分布统计
   */
  getWatchTimeDistribution(
    startTime?: number,
    endTime?: number
  ): Promise<DBResult<Array<{hour: number, count: number}>>>;
}

/**
 * 互动行为管理接口
 */
export interface IInteractionEventManager {
  /**
   * 记录互动事件
   * @param event 互动事件
   * @returns 操作结果
   */
  recordInteractionEvent(event: Omit<InteractionEvent, 'event_id' | 'created_at'>): Promise<DBResult<InteractionEvent>>;

  /**
   * 获取互动事件
   * @param eventId 事件ID
   * @returns 互动事件
   */
  getInteractionEvent(eventId: ID): Promise<DBResult<InteractionEvent>>;

  /**
   * 查询互动事件列表
   * @param params 查询参数
   * @param pagination 分页参数
   * @returns 互动事件列表
   */
  queryInteractionEvents(
    params: InteractionEventQueryParams,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<InteractionEvent>>>;

  /**
   * 获取视频互动统计
   * @param videoId 视频ID
   * @returns 互动统计
   */
  getVideoInteractionStats(videoId: ID): Promise<DBResult<InteractionStats>>;

  /**
   * 获取创作者互动统计
   * @param creatorId 创作者ID
   * @returns 互动统计
   */
  getCreatorInteractionStats(creatorId: ID): Promise<DBResult<InteractionStats>>;

  /**
   * 获取用户互动统计
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 互动统计
   */
  getUserInteractionStats(
    startTime?: number,
    endTime?: number
  ): Promise<DBResult<InteractionStats>>;
}

/**
 * 搜索行为管理接口
 */
export interface ISearchEventManager {
  /**
   * 记录搜索事件
   * @param event 搜索事件
   * @returns 操作结果
   */
  recordSearchEvent(event: Omit<SearchEvent, 'event_id' | 'created_at'>): Promise<DBResult<SearchEvent>>;

  /**
   * 获取搜索事件
   * @param eventId 事件ID
   * @returns 搜索事件
   */
  getSearchEvent(eventId: ID): Promise<DBResult<SearchEvent>>;

  /**
   * 查询搜索事件列表
   * @param params 查询参数
   * @param pagination 分页参数
   * @returns 搜索事件列表
   */
  querySearchEvents(
    params: SearchEventQueryParams,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<SearchEvent>>>;

  /**
   * 获取热门搜索关键词
   * @param limit 返回数量
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 热门搜索关键词列表
   */
  getPopularSearchQueries(
    limit?: number,
    startTime?: number,
    endTime?: number
  ): Promise<DBResult<Array<{query: string, count: number}>>>;

  /**
   * 获取搜索历史
   * @param limit 返回数量
   * @returns 搜索历史
   */
  getSearchHistory(limit?: number): Promise<DBResult<SearchEvent[]>>;
}

/**
 * 行为管理统一接口
 */
export interface IBehaviorManager extends 
  IWatchEventManager,
  IInteractionEventManager,
  ISearchEventManager {}
