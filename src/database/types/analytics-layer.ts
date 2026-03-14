
/**
 * 分析层类型定义
 * 包含兴趣权重、兴趣星球、UP排名等分析结果数据
 */

import type { Timestamp, ID, InterestScore } from './index';

/**
 * 兴趣权重
 */
export interface InterestScore extends InterestScore {
  tag_name: string;           // 标签名称(冗余字段,便于查询)
  category_id?: ID;           // 所属分区ID
}

/**
 * 兴趣节点
 */
export interface InterestNode {
  node_id: ID;
  parent_id?: ID;             // 父节点ID
  name: string;
  weight: number;             // 权重
  level: number;              // 层级(0为根节点)
  tag_ids: ID[];              // 包含的标签ID
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * 创作者排名
 */
export interface CreatorRank {
  creator_id: ID;
  creator_name: string;       // 创作者名称(冗余字段,便于查询)

  total_watch_time: number;   // 总观看时长
  recent_watch_time: number;  // 近期观看时长(最近7天)

  interaction_score: number;  // 互动分数
  score: number;              // 综合分数

  rank: number;               // 排名
  last_update: Timestamp;
}

/**
 * 观看时间统计
 */
export interface WatchTimeStats {
  hour: number;               // 小时(0-23)
  watch_count: number;        // 观看次数
  total_duration: number;     // 总观看时长
}

/**
 * 兴趣变化趋势
 */
export interface InterestTrend {
  tag_id: ID;
  tag_name: string;

  // 时间序列数据
  data_points: {
    timestamp: Timestamp;
    score: number;
  }[];

  trend: 'rising' | 'falling' | 'stable';  // 趋势
  change_rate: number;                      // 变化率
}

/**
 * 兴趣权重查询参数
 */
export interface InterestScoreQueryParams {
  tag_id?: ID;
  category_id?: ID;
  min_score?: number;
  min_short_term?: number;
  min_long_term?: number;
}

/**
 * 兴趣节点查询参数
 */
export interface InterestNodeQueryParams {
  parent_id?: ID;
  level?: number;
  name_contains?: string;
  has_tag_id?: ID;
}

/**
 * 创作者排名查询参数
 */
export interface CreatorRankQueryParams {
  min_score?: number;
  min_total_watch_time?: number;
  min_recent_watch_time?: number;
  limit?: number;
}

/**
 * 观看时间统计查询参数
 */
export interface WatchTimeStatsQueryParams {
  start_hour?: number;
  end_hour?: number;
  start_date?: Timestamp;
  end_date?: Timestamp;
}
