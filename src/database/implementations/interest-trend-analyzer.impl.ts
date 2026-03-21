/**
 * InterestTrendAnalyzer 实现
 * 实现兴趣趋势分析
 */

import { InterestHistory } from '../types/analytics.js';
import { InterestScore } from '../types/analytics.js';
import { InterestHistoryRepository } from './interest-history-repository.impl.js';
import { InterestScoreRepository } from './interest-score-repository.impl.js';

/**
 * 趋势类型
 */
export type TrendType = 'rising' | 'stable' | 'declining';

/**
 * 趋势分析结果
 */
export interface TrendAnalysisResult {
  /**
   * 趋势类型
   */
  trend: TrendType;
  /**
   * 变化率
   */
  changeRate: number;
  /**
   * 置信度
   */
  confidence: number;
  /**
   * 预测值（未来N天的分数）
   */
  prediction?: number;
}

/**
 * 趋势分析配置
 */
export interface TrendAnalyzerConfig {
  /**
   * 分析时间窗口（天）
   */
  windowDays: number;

  /**
   * 移动平均窗口大小
   */
  movingAverageWindow: number;

  /**
   * 趋势判断阈值
   */
  trendThreshold: {
    /**
     * 上升阈值（变化率超过此值视为上升）
     */
    rising: number;
    /**
     * 下降阈值（变化率低于此值视为下降）
     */
    declining: number;
  };

  /**
   * 预测天数
   */
  predictionDays: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: TrendAnalyzerConfig = {
  windowDays: 30,
  movingAverageWindow: 7,
  trendThreshold: {
    rising: 0.1,
    declining: -0.1
  },
  predictionDays: 7
};

/**
 * InterestTrendAnalyzer 实现类
 */
export class InterestTrendAnalyzer {
  private config: TrendAnalyzerConfig;
  private historyRepo: InterestHistoryRepository;
  private scoreRepo: InterestScoreRepository;

  constructor(
    config?: Partial<TrendAnalyzerConfig>,
    historyRepo?: InterestHistoryRepository,
    scoreRepo?: InterestScoreRepository
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.historyRepo = historyRepo || new InterestHistoryRepository();
    this.scoreRepo = scoreRepo || new InterestScoreRepository();
  }

  /**
   * 分析单个标签的兴趣趋势
   */
  async analyzeTrend(tagId: string): Promise<TrendAnalysisResult> {
    const now = Date.now();
    const startTime = now - this.config.windowDays * 24 * 60 * 60 * 1000;

    // 获取历史数据
    const history = await this.historyRepo.getInterestHistory(tagId, {
      startTime,
      endTime: now
    });

    if (history.length < 2) {
      return {
        trend: 'stable',
        changeRate: 0,
        confidence: 0
      };
    }

    // 计算移动平均
    const movingAverages = this.calculateMovingAverage(
      history.map(h => h.score),
      this.config.movingAverageWindow
    );

    // 计算变化率
    const changeRate = this.calculateChangeRate(movingAverages);

    // 判断趋势
    const trend = this.determineTrend(changeRate);

    // 计算置信度
    const confidence = this.calculateConfidence(history, changeRate);

    // 预测未来趋势
    const prediction = this.predictFuture(movingAverages, this.config.predictionDays);

    return {
      trend,
      changeRate,
      confidence,
      prediction
    };
  }

  /**
   * 批量分析多个标签的趋势
   */
  async analyzeTrends(tagIds: string[]): Promise<Map<string, TrendAnalysisResult>> {
    const results = new Map<string, TrendAnalysisResult>();

    for (const tagId of tagIds) {
      const result = await this.analyzeTrend(tagId);
      results.set(tagId, result);
    }

    return results;
  }

  /**
   * 分析所有标签的趋势
   */
  async analyzeAllTrends(): Promise<Map<string, TrendAnalysisResult>> {
    const allScores = await this.scoreRepo.getAllInterestScores();
    const tagIds = allScores.map(s => s.tagId);
    return this.analyzeTrends(tagIds);
  }

  /**
   * 计算移动平均
   */
  private calculateMovingAverage(values: number[], window: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - window + 1);
      const windowValues = values.slice(start, i + 1);
      const avg = windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;
      result.push(avg);
    }

    return result;
  }

  /**
   * 计算变化率
   */
  private calculateChangeRate(values: number[]): number {
    if (values.length < 2) return 0;

    const first = values[0];
    const last = values[values.length - 1];

    if (first === 0) return 0;

    return (last - first) / first;
  }

  /**
   * 判断趋势类型
   */
  private determineTrend(changeRate: number): TrendType {
    if (changeRate >= this.config.trendThreshold.rising) {
      return 'rising';
    } else if (changeRate <= this.config.trendThreshold.declining) {
      return 'declining';
    }
    return 'stable';
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    history: InterestHistory[],
    changeRate: number
  ): number {
    if (history.length < 2) return 0;

    // 计算标准差
    const values = history.map(h => h.score);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // 变化率越大且标准差越小，置信度越高
    const normalizedChangeRate = Math.abs(changeRate);
    const normalizedStdDev = stdDev / (mean || 1);

    const confidence = Math.min(1, normalizedChangeRate / (normalizedStdDev + 0.01));

    return confidence;
  }

  /**
   * 预测未来值
   */
  private predictFuture(values: number[], days: number): number {
    if (values.length < 2) return values[values.length - 1] || 0;

    // 使用简单的线性回归预测
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 预测未来days天的值
    const futureX = n + days - 1;
    return slope * futureX + intercept;
  }

  /**
   * 获取趋势摘要
   */
  async getTrendSummary(): Promise<{
    rising: string[];
    stable: string[];
    declining: string[];
    topRising: Array<{tagId: string; changeRate: number}>;
    topDeclining: Array<{tagId: string; changeRate: number}>;
  }> {
    const allTrends = await this.analyzeAllTrends();

    const rising: string[] = [];
    const stable: string[] = [];
    const declining: string[] = [];
    const topRising: Array<{tagId: string; changeRate: number}> = [];
    const topDeclining: Array<{tagId: string; changeRate: number}> = [];

    for (const [tagId, result] of allTrends.entries()) {
      switch (result.trend) {
        case 'rising':
          rising.push(tagId);
          topRising.push({ tagId, changeRate: result.changeRate });
          break;
        case 'stable':
          stable.push(tagId);
          break;
        case 'declining':
          declining.push(tagId);
          topDeclining.push({ tagId, changeRate: result.changeRate });
          break;
      }
    }

    // 排序并取Top 10
    topRising.sort((a, b) => b.changeRate - a.changeRate);
    topDeclining.sort((a, b) => a.changeRate - b.changeRate);

    return {
      rising,
      stable,
      declining,
      topRising: topRising.slice(0, 10),
      topDeclining: topDeclining.slice(0, 10)
    };
  }

  /**
   * 获取趋势对比数据
   */
  async compareTrends(tagIds: string[]): Promise<Map<string, {
    currentScore: number;
    trend: TrendAnalysisResult;
    history: Array<{timestamp: number; score: number}>;
  }>> {
    const result = new Map();
    const now = Date.now();
    const startTime = now - this.config.windowDays * 24 * 60 * 60 * 1000;

    for (const tagId of tagIds) {
      const score = await this.scoreRepo.getInterestScore(tagId);
      const trend = await this.analyzeTrend(tagId);
      const history = await this.historyRepo.getInterestHistory(tagId, {
        startTime,
        endTime: now
      });

      result.set(tagId, {
        currentScore: score?.score || 0,
        trend,
        history: history.map(h => ({
          timestamp: h.timestamp,
          score: h.score
        }))
      });
    }

    return result;
  }
}
