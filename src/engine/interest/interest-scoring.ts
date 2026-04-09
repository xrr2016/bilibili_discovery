/**
 * 兴趣分数计算器
 * 纯函数实现，根据多个因素计算兴趣贡献分数
 */

import { InterestScoringParams } from './interest-types.js';

/**
 * 分数计算权重配置
 */
export interface ScoringWeights {
  /** 观看来源的基础权重 */
  sourceWeights: {
    watch: number;      // 普通观看
    favorite: number;   // 收藏
    like: number;       // 点赞
    coin: number;       // 投币
    manual: number;     // 手动标记
  };

  /** 完播加权因子 */
  completionFactor: number;

  /** 进度权重阈值和对应的加权因子 */
  progressFactors: {
    threshold: number;  // 进度阈值
    factor: number;     // 加权因子
  }[];

  /** 时间衰减配置 */
  recencyFactors: {
    daysRange: [number, number];  // 天数范围 [min, max]
    factor: number;               // 加权因子
  }[];
}

/**
 * 默认分数计算权重
 * 来源权重：收藏 > 投币 > 点赞 > 普通观看
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  sourceWeights: {
    watch: 1.0,    // 基础权重
    favorite: 1.5, // 收藏强化
    like: 1.2,     // 点赞加强
    coin: 1.3,     // 投币加强
    manual: 1.0    // 手动标记不加权
  },

  // 完播加权：看完了加 1.2 倍
  completionFactor: 1.2,

  // 进度权重：进度超过 90% 时加权
  progressFactors: [
    { threshold: 0.9, factor: 1.1 },
    { threshold: 0.7, factor: 1.05 },
    { threshold: 0.5, factor: 1.0 }
  ],

  // 时间衰减：最近 7 天权重最高
  recencyFactors: [
    { daysRange: [0, 1], factor: 1.2 },    // 今天
    { daysRange: [1, 3], factor: 1.1 },    // 昨天至 3 天前
    { daysRange: [3, 7], factor: 1.0 },    // 3-7 天前
    { daysRange: [7, 30], factor: 0.9 },   // 7-30 天前
    { daysRange: [30, Infinity], factor: 0.8 }  // 30 天以上
  ]
};

/**
 * 兴趣分数计算器类
 */
export class InterestScorer {
  private weights: ScoringWeights;

  constructor(weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * 获取来源权重
   */
  private getSourceWeight(sourceType: 'watch' | 'favorite' | 'like' | 'coin' | 'manual'): number {
    return this.weights.sourceWeights[sourceType] ?? 1.0;
  }

  /**
   * 获取进度权重
   */
  private getProgressFactor(progress: number): number {
    for (const pf of this.weights.progressFactors) {
      if (progress >= pf.threshold) {
        return pf.factor;
      }
    }
    return 1.0;
  }

  /**
   * 获取时间衰减权重
   */
  private getRecencyFactor(daysAgo: number): number {
    for (const rf of this.weights.recencyFactors) {
      if (daysAgo >= rf.daysRange[0] && daysAgo < rf.daysRange[1]) {
        return rf.factor;
      }
    }
    return 0.8; // 默认衰减系数
  }

  /**
   * 计算单个事件的兴趣分数
   * 
   * 公式: score = baseScore * sourceWeight * completionFactor * progressFactor * recencyFactor
   */
  calculateScore(params: InterestScoringParams): number {
    const {
      baseScore,
      isComplete,
      progress,
      sourceType,
      recencyDays
    } = params;

    // 基础分数
    let score = baseScore || 1.0;

    // 应用来源权重
    score *= this.getSourceWeight(sourceType);

    // 应用完播加权
    if (isComplete) {
      score *= this.weights.completionFactor;
    }

    // 应用进度权重
    score *= this.getProgressFactor(progress);

    // 应用时间衰减权重
    score *= this.getRecencyFactor(recencyDays);

    // 返回四舍五入到两位小数的结果
    return Math.round(score * 100) / 100;
  }

  /**
   * 根据观看时长计算基础分数
   * 观看时长（秒）转换为基础分数
   * 约定：1 分钟观看时长 = 1 分基础分值
   */
  static calculateBaseScoreFromDuration(watchDuration: number): number {
    // 将秒数转换为分钟数作为基础分数
    const baseScore = watchDuration / 60;
    return Math.max(0.1, Math.min(100, baseScore)); // 限制在 0.1-100 之间
  }

  /**
   * 根据多个来源的分数汇总兴趣分数
   * 用于聚合多个观看行为
   */
  static aggregateScores(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    // 简单求和
    const sum = scores.reduce((a, b) => a + b, 0);
    
    // 可选：使用加权平均
    // const weighted = scores.reduce((a, b) => a + b * weight, 0) / scores.length;
    
    return Math.round(sum * 100) / 100;
  }

  /**
   * 计算观看时长在兴趣中的占比
   */
  static calculateRatio(watchDuration: number, totalDuration: number): number {
    if (totalDuration === 0) return 0;
    const ratio = watchDuration / totalDuration;
    return Math.round(ratio * 10000) / 10000; // 保留 4 位小数
  }

  /**
   * 标准化分数到 0-1 范围（百分位）
   */
  static normalizeScore(score: number, maxScore: number): number {
    if (maxScore === 0) return 0;
    const normalized = score / maxScore;
    return Math.round(normalized * 10000) / 10000;
  }

  /**
   * 将分数转换为百分比（0-100）
   */
  static scoreToPercentage(score: number, maxScore: number): number {
    return Math.round(this.normalizeScore(score, maxScore) * 10000) / 100;
  }
}

/**
 * 计算两个分数的差异和趋势
 */
export function calculateTrend(
  currentScore: number,
  previousScore: number,
  threshold: number = 0.1
): 'up' | 'down' | 'stable' {
  if (previousScore === 0) {
    return currentScore > 0 ? 'up' : 'stable';
  }

  const changePercent = Math.abs(currentScore - previousScore) / previousScore;

  if (changePercent < threshold) {
    return 'stable';
  } else if (currentScore > previousScore) {
    return 'up';
  } else {
    return 'down';
  }
}

/**
 * 计算分数变化量
 */
export function calculateScoreChange(
  currentScore: number,
  previousScore: number
): { changeAmount: number; changePercent: number } {
  const changeAmount = currentScore - previousScore;
  const changePercent = previousScore === 0
    ? (currentScore > 0 ? 100 : 0)
    : (changeAmount / previousScore) * 100;

  return {
    changeAmount: Math.round(changeAmount * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100
  };
}

/**
 * 全局评分器实例
 */
let globalScorer: InterestScorer | null = null;

/**
 * 获取全局评分器
 */
export function getScorer(weights?: ScoringWeights): InterestScorer {
  if (!globalScorer) {
    globalScorer = new InterestScorer(weights);
  }
  return globalScorer;
}

/**
 * 重置全局评分器
 */
export function resetScorer(): void {
  globalScorer = null;
}

/**
 * 快速计算分数（使用默认权重）
 */
export function quickScore(params: InterestScoringParams): number {
  return getScorer().calculateScore(params);
}
