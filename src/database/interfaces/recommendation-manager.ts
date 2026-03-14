
/**
 * 推荐管理接口
 * 负责根据用户兴趣推荐视频
 */

import type {
  Video,
  InterestScore,
  CreatorRank,
  DBResult,
  PaginationParams,
  PaginationResult,
  ID
} from '../types';

/**
 * 推荐候选来源
 */
export type RecommendationSource = 'hot' | 'interest' | 'creator' | 'mixed';

/**
 * 推荐结果
 */
export interface RecommendationResult {
  video: Video;
  score: number;              // 推荐分数
  reasons: string[];          // 推荐原因
  source: RecommendationSource; // 推荐来源
}

/**
 * 推荐参数
 */
export interface RecommendationParams {
  limit?: number;             // 返回数量
  source?: RecommendationSource; // 推荐来源
  platform?: string;         // 平台过滤
  min_score?: number;         // 最小分数
}

/**
 * 推荐候选生成接口
 */
export interface IRecommendationCandidateManager {
  /**
   * 获取热门视频候选
   * @param limit 返回数量
   * @param platform 平台
   * @returns 热门视频列表
   */
  getHotVideoCandidates(
    limit?: number,
    platform?: string
  ): Promise<DBResult<Video[]>>;

  /**
   * 获取兴趣匹配视频候选
   * @param tagIds 兴趣标签ID列表
   * @param limit 返回数量
   * @returns 匹配视频列表
   */
  getInterestMatchCandidates(
    tagIds: ID[],
    limit?: number
  ): Promise<DBResult<Video[]>>;

  /**
   * 获取UP主视频候选
   * @param creatorIds 创作者ID列表
   * @param limit 返回数量
   * @returns 视频列表
   */
  getCreatorVideoCandidates(
    creatorIds: ID[],
    limit?: number
  ): Promise<DBResult<Video[]>>;

  /**
   * 更新推荐池
   * @param sources 推荐来源列表
   * @returns 操作结果
   */
  updateRecommendationPool(sources?: RecommendationSource[]): Promise<DBResult<void>>;
}

/**
 * 推荐评分接口
 */
export interface IRecommendationScoreManager {
  /**
   * 计算视频推荐分数
   * @param videoId 视频ID
   * @param interests 用户兴趣
   * @param creatorRanks UP排名
   * @returns 推荐分数
   */
  calculateVideoScore(
    videoId: ID,
    interests: InterestScore[],
    creatorRanks: CreatorRank[]
  ): Promise<DBResult<number>>;

  /**
   * 批量计算视频推荐分数
   * @param videoIds 视频ID列表
   * @param interests 用户兴趣
   * @param creatorRanks UP排名
   * @returns 推荐分数列表
   */
  calculateVideoScores(
    videoIds: ID[],
    interests: InterestScore[],
    creatorRanks: CreatorRank[]
  ): Promise<DBResult<Map<ID, number>>>;

  /**
   * 获取推荐原因
   * @param videoId 视频ID
   * @param score 推荐分数
   * @param interests 用户兴趣
   * @param creatorRanks UP排名
   * @returns 推荐原因列表
   */
  getRecommendationReasons(
    videoId: ID,
    score: number,
    interests: InterestScore[],
    creatorRanks: CreatorRank[]
  ): Promise<DBResult<string[]>>;
}

/**
 * 推荐列表生成接口
 */
export interface IRecommendationListManager {
  /**
   * 生成推荐列表
   * @param params 推荐参数
   * @returns 推荐结果列表
   */
  generateRecommendations(
    params?: RecommendationParams
  ): Promise<DBResult<RecommendationResult[]>>;

  /**
   * 获取推荐列表
   * @param pagination 分页参数
   * @returns 推荐结果列表
   */
  getRecommendations(
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<RecommendationResult>>>;

  /**
   * 更新推荐列表
   * @returns 操作结果
   */
  refreshRecommendations(): Promise<DBResult<void>>;

  /**
   * 记录推荐反馈
   * @param videoId 视频ID
   * @param feedback 反馈类型('click' | 'watch' | 'like' | 'dislike')
   * @returns 操作结果
   */
  recordRecommendationFeedback(
    videoId: ID,
    feedback: 'click' | 'watch' | 'like' | 'dislike'
  ): Promise<DBResult<void>>;
}

/**
 * 推荐管理统一接口
 */
export interface IRecommendationManager extends 
  IRecommendationCandidateManager,
  IRecommendationScoreManager,
  IRecommendationListManager {}
