/**
 * 兴趣分析类型定义
 * 定义兴趣系统的核心类型和常量
 */

import { ID, Timestamp } from '../../database/types/base.js';

/**
 * 固定兴趣主题ID类型
 */
export type FixedTopicId = 
  | 'game'
  | 'animation'
  | 'music'
  | 'film_tv'
  | 'tech'
  | 'digital'
  | 'knowledge'
  | 'tutorial'
  | 'lifestyle'
  | 'food'
  | 'sports'
  | 'car'
  | 'finance'
  | 'emotional'
  | 'fashion'
  | 'comedy'
  | 'kichiku'
  | 'acg'
  | 'travel'
  | 'other';

/**
 * 兴趣主题定义
 */
export interface InterestTopicDef {
  topicId: FixedTopicId;
  name: string;
  description: string;
  priority: number;
  isBuiltIn: boolean;
}

/**
 * 固定兴趣主题集合
 * 第一阶段使用固定主题，不允许 LLM 自由创建
 */
export const FIXED_TOPICS: Record<FixedTopicId, InterestTopicDef> = {
  game: {
    topicId: 'game',
    name: '游戏',
    description: '游戏相关内容，包括游戏评测、实况、攻略等',
    priority: 1,
    isBuiltIn: true
  },
  animation: {
    topicId: 'animation',
    name: '动画',
    description: '动画、番剧、动画评论等内容',
    priority: 2,
    isBuiltIn: true
  },
  music: {
    topicId: 'music',
    name: '音乐',
    description: '音乐、歌曲、音乐人等内容',
    priority: 3,
    isBuiltIn: true
  },
  film_tv: {
    topicId: 'film_tv',
    name: '影视',
    description: '电影、电视剧、综艺等视频内容',
    priority: 4,
    isBuiltIn: true
  },
  tech: {
    topicId: 'tech',
    name: '科技',
    description: '科技新闻、科学知识、技术讨论',
    priority: 5,
    isBuiltIn: true
  },
  digital: {
    topicId: 'digital',
    name: '数码',
    description: '数码产品评测、开箱、使用体验',
    priority: 6,
    isBuiltIn: true
  },
  knowledge: {
    topicId: 'knowledge',
    name: '知识',
    description: '教育内容、学习资源、知识分享',
    priority: 7,
    isBuiltIn: true
  },
  tutorial: {
    topicId: 'tutorial',
    name: '教程',
    description: '各类教程、如何做、技能教学',
    priority: 8,
    isBuiltIn: true
  },
  lifestyle: {
    topicId: 'lifestyle',
    name: '生活',
    description: '生活相关内容、日常分享、宅文化',
    priority: 9,
    isBuiltIn: true
  },
  food: {
    topicId: 'food',
    name: '美食',
    description: '美食、烹饪、食品评测等内容',
    priority: 10,
    isBuiltIn: true
  },
  sports: {
    topicId: 'sports',
    name: '体育',
    description: '体育赛事、运动相关内容',
    priority: 11,
    isBuiltIn: true
  },
  car: {
    topicId: 'car',
    name: '汽车',
    description: '汽车评测、驾驶、汽车文化',
    priority: 12,
    isBuiltIn: true
  },
  finance: {
    topicId: 'finance',
    name: '财经',
    description: '财经新闻、投资、经济分析',
    priority: 13,
    isBuiltIn: true
  },
  emotional: {
    topicId: 'emotional',
    name: '情感',
    description: '情感、心理、人生经验分享',
    priority: 14,
    isBuiltIn: true
  },
  fashion: {
    topicId: 'fashion',
    name: '时尚',
    description: '服装、时尚、美妆、穿搭',
    priority: 15,
    isBuiltIn: true
  },
  comedy: {
    topicId: 'comedy',
    name: '搞笑',
    description: '喜剧、段子、搞笑视频',
    priority: 16,
    isBuiltIn: true
  },
  kichiku: {
    topicId: 'kichiku',
    name: '鬼畜',
    description: '鬼畜视频、音乐二创、音MAD',
    priority: 17,
    isBuiltIn: true
  },
  acg: {
    topicId: 'acg',
    name: '二次元',
    description: '二次元文化、Cosplay、同人创作',
    priority: 18,
    isBuiltIn: true
  },
  travel: {
    topicId: 'travel',
    name: '旅游',
    description: '旅游、地理、风景、旅行分享',
    priority: 19,
    isBuiltIn: true
  },
  other: {
    topicId: 'other',
    name: '其他',
    description: '不属于任何分类的内容',
    priority: 20,
    isBuiltIn: true
  }
};

/**
 * 获取所有兴趣主题
 */
export function getAllTopics(): InterestTopicDef[] {
  return Object.values(FIXED_TOPICS).sort((a, b) => a.priority - b.priority);
}

/**
 * 根据主题 ID 获取主题定义
 */
export function getTopicById(topicId: string): InterestTopicDef | null {
  return FIXED_TOPICS[topicId as FixedTopicId] || null;
}

/**
 * 根据主题名称获取主题定义
 */
export function getTopicByName(name: string): InterestTopicDef | null {
  return getAllTopics().find(t => t.name === name) || null;
}

/**
 * 验证主题ID是否有效
 */
export function isValidTopicId(topicId: string): boolean {
  return topicId in FIXED_TOPICS;
}

/**
 * 验证主题名称是否有效
 */
export function isValidTopicName(name: string): boolean {
  return getTopicByName(name) !== null;
}

/**
 * 获取所有有效的主题 ID
 */
export function getAllValidTopicIds(): FixedTopicId[] {
  return Object.keys(FIXED_TOPICS) as FixedTopicId[];
}

/**
 * 获取所有有效的主题名称
 */
export function getAllValidTopicNames(): string[] {
  return getAllTopics().map(t => t.name);
}

/**
 * 标签映射结果类型
 */
export interface TagMappingResult {
  topicId: FixedTopicId;
  score: number;
  confidence: number;
  source: 'rule' | 'llm' | 'manual';
}

/**
 * 单个标签的映射结果
 * 一个标签可能映射到多个主题
 */
export interface TagMappingResultMulti {
  tagId: string;
  tagName: string;
  mappings: TagMappingResult[];
  isMapped: boolean;
}

/**
 * 兴趣贡献数据
 */
export interface InterestContributionData {
  platform: 'bilibili' | 'youtube';
  topicId: FixedTopicId;
  sourceType: 'watch' | 'favorite' | 'like' | 'coin' | 'manual';
  watchDuration: number;
  isComplete: boolean;
  progress: number;
  tagIds: string[];
  tagNames: string[];
  videoId?: string;
  creatorId?: string;
  eventTime: Timestamp;
}

/**
 * 兴趣分数计算参数
 */
export interface InterestScoringParams {
  baseScore: number;        // 基础分数（通常来自观看时长）
  isComplete: boolean;      // 是否完播
  progress: number;         // 观看进度（0-1）
  sourceType: 'watch' | 'favorite' | 'like' | 'coin' | 'manual'; // 来源类型
  recencyDays: number;      // 事件距离今天的天数
}

/**
 * 兴趣分析聚合结果
 */
export interface InterestSummary {
  dateKey: string;
  window: '7d' | '30d';
  topicScores: {
    topicId: FixedTopicId;
    topicName: string;
    finalScore: number;
    ratio: number;
    watchDuration: number;
    eventCount: number;
    sourceBreakdown: {
      watch: number;
      favorite: number;
      like: number;
      coin: number;
    };
  }[];
  totalScore: number;
  topN: number;
}

/**
 * 兴趣趋势比较
 */
export interface InterestTrend {
  topicId: FixedTopicId;
  topicName: string;
  currentScore: number;
  previousScore: number;
  changeAmount: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}
