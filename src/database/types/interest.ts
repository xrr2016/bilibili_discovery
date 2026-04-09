/**
 * 兴趣分析数据结构定义
 * 定义兴趣主题、映射、贡献事件和快照等数据模型
 */

import { Timestamp, ID, Platform } from './base.js';

/**
 * 兴趣主题（Interest Topic）
 * 定义用户兴趣的大类分组
 */
export interface InterestTopic {
  /**
   * 兴趣主题唯一ID
   */
  topicId: ID;
  /**
   * 主题名称
   */
  name: string;
  /**
   * 主题描述
   */
  description?: string;
  /**
   * 父兴趣主题ID，用于构建主题层级
   */
  parentTopicId?: ID;
  /**
   * 是否为活跃主题，1表示活跃，0表示已弃用
   */
  isActive: number;
  /**
   * 创建时间
   */
  createdAt: Timestamp;
  /**
   * 更新时间
   */
  updatedAt: Timestamp;
}

/**
 * 标签-兴趣主题映射（Tag Interest Mapping）
 * 将细粒度的标签映射到粗粒度的兴趣主题
 * 支持一对多映射关系
 */
export interface TagInterestMapping {
  /**
   * 映射记录ID
   */
  mappingId: ID;
  /**
   * 标签ID
   */
  tagId: ID;
  /**
   * 兴趣主题ID
   */
  topicId: ID;
  /**
   * 标签对该兴趣主题的归属强度 (0-1)
   */
  score: number;
  /**
   * 映射来源: rule(规则映射) | llm(模型映射) | manual(手动映射)
   */
  source: 'rule' | 'llm' | 'manual';
  /**
   * 映射结论的置信度 (0-1)
   */
  confidence: number;
  /**
   * 映射版本号，用于追踪映射结果变化
   */
  version: number;
  /**
   * 创建时间
   */
  createdAt: Timestamp;
  /**
   * 更新时间
   */
  updatedAt: Timestamp;
}

/**
 * 兴趣贡献事件（Interest Contribution Event）
 * 核心数据结构，记录某个时间点的某种行为对指定兴趣主题的贡献
 */
export interface InterestContributionEvent {
  /**
   * 贡献事件唯一ID
   */
  contributionEventId: ID;
  /**
   * 视频平台
   */
  platform: Platform;
  /**
   * 对应的兴趣主题ID
   */
  topicId: ID;
  /**
   * 贡献来源类型: watch(观看) | favorite(收藏) | like(点赞) | coin(投币) | manual(手动)
   */
  sourceType: 'watch' | 'favorite' | 'like' | 'coin' | 'manual';
  /**
   * 事件发生的时间戳
   */
  eventTime: Timestamp;
  /**
   * 日期键，格式 YYYY-MM-DD，用于快速按天查询
   */
  dateKey: string;

  /**
   * 该事件分摊到该主题的观看时长（秒）
   */
  watchDuration: number;
  /**
   * 经过权重计算后的最终贡献分数
   */
  contributionScore: number;

  /**
   * 观看进度 (0-1)，可选
   */
  progress?: number;
  /**
   * 是否完播，1表示完播，0表示未完播，可选
   */
  isComplete?: number;

  /**
   * 该事件涉及的标签ID列表
   */
  tagIds: ID[];
  /**
   * 标签名称列表（冗余字段，用于可解释性）
   */
  tagNames?: string[];

  /**
   * 源视频ID，可选字段，仅用于调试和追溯
   */
  videoId?: ID;
  /**
   * 创作者ID，可选字段，用于未来分析创作者偏好
   */
  creatorId?: ID;

  /**
   * 事件创建时间
   */
  createdAt: Timestamp;
}

/**
 * 兴趣快照（Interest Snapshot）
 * 针对指定时间窗口的兴趣统计聚合结果
 */
export interface InterestSnapshot {
  /**
   * 快照ID
   */
  snapshotId: ID;
  /**
   * 视频平台
   */
  platform: Platform;
  /**
   * 日期键，格式 YYYY-MM-DD
   */
  dateKey: string;
  /**
   * 时间窗口: 7d(近7天) | 30d(近30天)
   */
  window: '7d' | '30d';
  /**
   * 兴趣主题ID
   */
  topicId: ID;
  /**
   * 观看时长分数
   */
  watchDurationScore: number;
  /**
   * 事件数量分数
   */
  eventCountScore: number;
  /**
   * 收藏相关分数
   */
  favoriteScore: number;
  /**
   * 综合最终分数
   */
  finalScore: number;
  /**
   * 该兴趣在全部兴趣中的占比 (0-1)
   */
  ratio: number;
  /**
   * 这个快照基于的贡献事件数量
   */
  sourceEventCount: number;
  /**
   * 快照更新时间
   */
  updatedAt: Timestamp;
}
