
/**
 * 搜索管理接口
 * 负责视频搜索、收藏搜索、LLM对话搜索等功能
 */

import type {
  Video,
  Collection,
  VideoNote,
  InterestScore,
  CreatorRank,
  VideoQueryParams,
  CollectionQueryParams,
  DBResult,
  PaginationParams,
  PaginationResult,
  Vector
} from '../types';

/**
 * 视频搜索结果
 */
export interface VideoSearchResult {
  video: Video;
  score: number;              // 相关性分数
  match_reasons: string[];    // 匹配原因
}

/**
 * 收藏搜索结果
 */
export interface CollectionSearchResult {
  collection: Collection;
  matched_videos: Video[];     // 匹配的视频
  match_count: number;         // 匹配数量
}

/**
 * LLM查询结果
 */
export interface LLMQueryResult {
  type: 'video' | 'note' | 'interest' | 'creator';
  data: any;
  explanation: string;        // 结果说明
}

/**
 * 视频搜索接口
 */
export interface IVideoSearchManager {
  /**
   * 关键词搜索视频
   * @param keyword 关键词
   * @param pagination 分页参数
   * @returns 搜索结果
   */
  searchVideosByKeyword(
    keyword: string,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<VideoSearchResult>>>;

  /**
   * 按标签搜索视频
   * @param tagIds 标签ID列表
   * @param matchType 匹配类型('and' | 'or')
   * @param pagination 分页参数
   * @returns 搜索结果
   */
  searchVideosByTags(
    tagIds: string[],
    matchType?: 'and' | 'or',
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<VideoSearchResult>>>;

  /**
   * 按UP主搜索视频
   * @param creatorId 创作者ID
   * @param pagination 分页参数
   * @returns 搜索结果
   */
  searchVideosByCreator(
    creatorId: string,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<Video>>>;

  /**
   * 按兴趣搜索视频
   * @param tagIds 兴趣标签ID列表
   * @param pagination 分页参数
   * @returns 搜索结果
   */
  searchVideosByInterest(
    tagIds: string[],
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<VideoSearchResult>>>;

  /**
   * 语义搜索视频
   * @param query 查询文本或向量
   * @param limit 返回数量
   * @param filters 过滤条件
   * @returns 搜索结果
   */
  semanticSearchVideos(
    query: string | Vector,
    limit?: number,
    filters?: {
      platform?: string;
      creator_id?: string;
      min_duration?: number;
      max_duration?: number;
    }
  ): Promise<DBResult<VideoSearchResult[]>>;
}

/**
 * 收藏搜索接口
 */
export interface ICollectionSearchManager {
  /**
   * 搜索收藏夹
   * @param keyword 关键词
   * @param pagination 分页参数
   * @returns 搜索结果
   */
  searchCollections(
    keyword: string,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<CollectionSearchResult>>>;

  /**
   * 按标签搜索收藏视频
   * @param tagIds 标签ID列表
   * @param matchType 匹配类型('and' | 'or')
   * @param pagination 分页参数
   * @returns 搜索结果
   */
  searchCollectionsByTags(
    tagIds: string[],
    matchType?: 'and' | 'or',
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<CollectionSearchResult>>>;

  /**
   * 按UP主搜索收藏视频
   * @param creatorId 创作者ID
   * @param pagination 分页参数
   * @returns 搜索结果
   */
  searchCollectionsByCreator(
    creatorId: string,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<CollectionSearchResult>>>;
}

/**
 * LLM对话搜索接口
 */
export interface ILLMSearchManager {
  /**
   * 执行LLM查询
   * @param query 自然语言查询
   * @returns 查询结果
   */
  executeLLMQuery(query: string): Promise<DBResult<LLMQueryResult[]>>;

  /**
   * 获取用户兴趣摘要
   * @param limit 返回数量
   * @returns 兴趣摘要
   */
  getUserInterestSummary(limit?: number): Promise<DBResult<InterestScore[]>>;

  /**
   * 获取用户观看记录摘要
   * @param days 天数
   * @returns 观看记录摘要
   */
  getWatchHistorySummary(days?: number): Promise<DBResult<{
    total_watch_time: number;
    top_videos: Video[];
    top_creators: CreatorRank[];
  }>>;
}

/**
 * 搜索管理统一接口
 */
export interface ISearchManager extends 
  IVideoSearchManager,
  ICollectionSearchManager,
  ILLMSearchManager {}
