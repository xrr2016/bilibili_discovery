
/**
 * 分析管理接口
 * 负责管理兴趣权重、兴趣星球、UP排名等分析结果数据
 */

import type {
  InterestScore,
  InterestNode,
  CreatorRank,
  WatchTimeStats,
  InterestTrend,
  InterestScoreQueryParams,
  InterestNodeQueryParams,
  CreatorRankQueryParams,
  WatchTimeStatsQueryParams,
  DBResult,
  PaginationParams,
  PaginationResult,
  ID
} from '../types';

/**
 * 兴趣权重管理接口
 */
export interface IInterestScoreManager {
  /**
   * 更新兴趣权重
   * @param tagId 标签ID
   * @param score 总分
   * @param shortTermScore 短期分数
   * @param longTermScore 长期分数
   * @returns 操作结果
   */
  updateInterestScore(
    tagId: ID,
    score: number,
    shortTermScore: number,
    longTermScore: number
  ): Promise<DBResult<InterestScore>>;

  /**
   * 获取兴趣权重
   * @param tagId 标签ID
   * @returns 兴趣权重
   */
  getInterestScore(tagId: ID): Promise<DBResult<InterestScore>>;

  /**
   * 批量获取兴趣权重
   * @param tagIds 标签ID列表
   * @returns 兴趣权重列表
   */
  getInterestScores(tagIds: ID[]): Promise<DBResult<InterestScore[]>>;

  /**
   * 查询兴趣权重列表
   * @param params 查询参数
   * @param pagination 分页参数
   * @returns 兴趣权重列表
   */
  queryInterestScores(
    params: InterestScoreQueryParams,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<InterestScore>>>;

  /**
   * 获取Top兴趣标签
   * @param limit 返回数量
   * @param type 权重类型('all' | 'short' | 'long')
   * @returns Top兴趣标签列表
   */
  getTopInterests(
    limit?: number,
    type?: 'all' | 'short' | 'long'
  ): Promise<DBResult<InterestScore[]>>;

  /**
   * 计算兴趣趋势
   * @param tagId 标签ID
   * @param days 天数
   * @returns 兴趣趋势
   */
  calculateInterestTrend(
    tagId: ID,
    days?: number
  ): Promise<DBResult<InterestTrend>>;
}

/**
 * 兴趣星球管理接口
 */
export interface IInterestNodeManager {
  /**
   * 创建兴趣节点
   * @param node 节点信息
   * @returns 操作结果
   */
  createInterestNode(node: Omit<InterestNode, 'node_id' | 'created_at' | 'updated_at'>): Promise<DBResult<InterestNode>>;

  /**
   * 获取兴趣节点
   * @param nodeId 节点ID
   * @returns 节点信息
   */
  getInterestNode(nodeId: ID): Promise<DBResult<InterestNode>>;

  /**
   * 查询兴趣节点列表
   * @param params 查询参数
   * @returns 节点列表
   */
  queryInterestNodes(params: InterestNodeQueryParams): Promise<DBResult<InterestNode[]>>;

  /**
   * 更新兴趣节点
   * @param nodeId 节点ID
   * @param updates 更新内容
   * @returns 操作结果
   */
  updateInterestNode(
    nodeId: ID,
    updates: Partial<Pick<InterestNode, 'name' | 'weight' | 'tag_ids'>>
  ): Promise<DBResult<InterestNode>>;

  /**
   * 删除兴趣节点
   * @param nodeId 节点ID
   * @returns 操作结果
   */
  deleteInterestNode(nodeId: ID): Promise<DBResult<void>>;

  /**
   * 获取兴趣树
   * @returns 完整的兴趣树结构
   */
  getInterestTree(): Promise<DBResult<InterestNode[]>>;
}

/**
 * 创作者排名管理接口
 */
export interface ICreatorRankManager {
  /**
   * 更新创作者排名
   * @param creatorId 创作者ID
   * @param totalWatchTime 总观看时长
   * @param recentWatchTime 近期观看时长
   * @param interactionScore 互动分数
   * @returns 操作结果
   */
  updateCreatorRank(
    creatorId: ID,
    totalWatchTime: number,
    recentWatchTime: number,
    interactionScore: number
  ): Promise<DBResult<CreatorRank>>;

  /**
   * 获取创作者排名
   * @param creatorId 创作者ID
   * @returns 创作者排名
   */
  getCreatorRank(creatorId: ID): Promise<DBResult<CreatorRank>>;

  /**
   * 查询创作者排名列表
   * @param params 查询参数
   * @returns 创作者排名列表
   */
  queryCreatorRanks(params: CreatorRankQueryParams): Promise<DBResult<CreatorRank[]>>;

  /**
   * 获取Top创作者
   * @param limit 返回数量
   * @returns Top创作者列表
   */
  getTopCreators(limit?: number): Promise<DBResult<CreatorRank[]>>;

  /**
   * 重新计算所有创作者排名
   * @returns 操作结果
   */
  recalculateAllRanks(): Promise<DBResult<void>>;
}

/**
 * 观看时间统计管理接口
 */
export interface IWatchTimeStatsManager {
  /**
   * 获取观看时间分布
   * @param params 查询参数
   * @returns 时间分布统计
   */
  getWatchTimeDistribution(params: WatchTimeStatsQueryParams): Promise<DBResult<WatchTimeStats[]>>;

  /**
   * 获取观看高峰时段
   * @param days 天数
   * @returns 高峰时段列表
   */
  getPeakWatchHours(days?: number): Promise<DBResult<Array<{hour: number, count: number}>>>;
}

/**
 * 分析管理统一接口
 */
export interface IAnalyticsManager extends 
  IInterestScoreManager,
  IInterestNodeManager,
  ICreatorRankManager,
  IWatchTimeStatsManager {}
