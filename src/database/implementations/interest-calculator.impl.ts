/**
 * InterestCalculator 实现
 * 实现兴趣计算核心算法
 */

import { InterestScore } from '../types/analytics.js';
import { WatchEvent } from '../types/behavior.js';
import { InteractionEvent } from '../types/behavior.js';
import { Video } from '../types/video.js';
import { Tag } from '../types/semantic.js';
import { InterestScoreRepository } from './interest-score-repository.impl.js';
import { InterestHistoryRepository } from './interest-history-repository.impl.js';
import { WatchEventRepository } from './watch-event-repository.impl.js';
import { InteractionEventRepository } from './interaction-event-repository.impl.js';
import { VideoRepository } from './video-repository.impl.js';
import { TagRepository } from './tag-repository.impl.js';

/**
 * 兴趣计算配置
 */
export interface InterestCalculatorConfig {
  /**
   * 短期兴趣时间窗口（天）
   */
  shortTermWindowDays: number;

  /**
   * 时间衰减系数
   */
  decayRate: number;

  /**
   * 行为权重配置
   */
  behaviorWeights: {
    /**
     * 观看时长权重
     */
    watchDuration: number;
    /**
     * 完整观看权重
     */
    completeWatch: number;
    /**
     * 互动权重（点赞、评论、分享等）
     */
    interaction: number;
  };

  /**
   * 短期和长期兴趣的权重
   */
  scoreWeights: {
    shortTerm: number;
    longTerm: number;
  };
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: InterestCalculatorConfig = {
  shortTermWindowDays: 7,
  decayRate: 0.1,
  behaviorWeights: {
    watchDuration: 0.4,
    completeWatch: 0.3,
    interaction: 0.3
  },
  scoreWeights: {
    shortTerm: 0.6,
    longTerm: 0.4
  }
};

/**
 * InterestCalculator 实现类
 */
export class InterestCalculator {
  private config: InterestCalculatorConfig;
  private interestScoreRepo: InterestScoreRepository;
  private interestHistoryRepo: InterestHistoryRepository;
  private watchEventRepo: WatchEventRepository;
  private interactionEventRepo: InteractionEventRepository;
  private videoRepo: VideoRepository;
  private tagRepo: TagRepository;

  constructor(
    config?: Partial<InterestCalculatorConfig>,
    interestScoreRepo?: InterestScoreRepository,
    interestHistoryRepo?: InterestHistoryRepository,
    watchEventRepo?: WatchEventRepository,
    interactionEventRepo?: InteractionEventRepository,
    videoRepo?: VideoRepository,
    tagRepo?: TagRepository
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.interestScoreRepo = interestScoreRepo || new InterestScoreRepository();
    this.interestHistoryRepo = interestHistoryRepo || new InterestHistoryRepository();
    this.watchEventRepo = watchEventRepo || new WatchEventRepository();
    this.interactionEventRepo = interactionEventRepo || new InteractionEventRepository();
    this.videoRepo = videoRepo || new VideoRepository();
    this.tagRepo = tagRepo || new TagRepository();
  }

  /**
   * 计算单个标签的兴趣分数
   */
  async calculateInterestScore(tagId: string): Promise<InterestScore> {
    const now = Date.now();
    const shortTermStartTime = now - this.config.shortTermWindowDays * 24 * 60 * 60 * 1000;

    // 获取短期和长期观看事件
    const shortTermWatchEvents = await this.getWatchEventsByTag(tagId, shortTermStartTime, now);
    const longTermWatchEvents = await this.getWatchEventsByTag(tagId);

    // 获取短期和长期互动事件
    const shortTermInteractionEvents = await this.getInteractionEventsByTag(tagId, shortTermStartTime, now);
    const longTermInteractionEvents = await this.getInteractionEventsByTag(tagId);

    // 计算短期兴趣分数
    const shortTermScore = this.calculateScoreFromEvents(
      shortTermWatchEvents,
      shortTermInteractionEvents
    );

    // 计算长期兴趣分数（应用时间衰减）
    const longTermScore = this.calculateScoreFromEvents(
      longTermWatchEvents,
      longTermInteractionEvents,
      now
    );

    // 计算综合分数
    const score = 
      shortTermScore * this.config.scoreWeights.shortTerm +
      longTermScore * this.config.scoreWeights.longTerm;

    // 获取历史分数计算趋势
    const history = await this.interestHistoryRepo.getInterestHistory(tagId, {
      startTime: shortTermStartTime,
      endTime: now
    });
    const trend = this.calculateTrend(history, score);

    const interestScore: InterestScore = {
      tagId,
      score,
      shortTermScore,
      longTermScore,
      lastUpdate: now,
      trend
    };

    // 更新兴趣分数
    await this.interestScoreRepo.updateInterestScore(interestScore);

    // 记录历史
    await this.interestHistoryRepo.recordInterestHistory({
      tagId,
      timestamp: now,
      score,
      shortTermScore,
      longTermScore
    });

    return interestScore;
  }

  /**
   * 批量计算标签兴趣分数
   */
  async calculateInterestScores(tagIds: string[]): Promise<InterestScore[]> {
    const scores: InterestScore[] = [];
    for (const tagId of tagIds) {
      const score = await this.calculateInterestScore(tagId);
      scores.push(score);
    }
    return scores;
  }

  /**
   * 重新计算所有标签的兴趣分数
   */
  async recalculateAllInterestScores(): Promise<InterestScore[]> {
    const allTags = await this.tagRepo.getAllTags();
    const tagIds = allTags.map(tag => tag.tagId);
    return this.calculateInterestScores(tagIds);
  }

  /**
   * 从事件计算兴趣分数
   */
  private calculateScoreFromEvents(
    watchEvents: WatchEvent[],
    interactionEvents: InteractionEvent[],
    currentTime?: number
  ): number {
    let score = 0;

    // 观看时长贡献
    const totalWatchDuration = watchEvents.reduce((sum, event) => {
      const duration = event.watchDuration || 0;
      // 应用时间衰减
      if (currentTime) {
        const timeDiff = (currentTime - event.watchTime) / (24 * 60 * 60 * 1000);
        return sum + duration * Math.exp(-this.config.decayRate * timeDiff);
      }
      return sum + duration;
    }, 0);
    score += totalWatchDuration * this.config.behaviorWeights.watchDuration;

    // 完整观看贡献
    const completeWatchCount = watchEvents.filter(e => e.isComplete === 1).length;
    score += completeWatchCount * this.config.behaviorWeights.completeWatch;

    // 互动贡献
    const interactionCount = interactionEvents.length;
    score += interactionCount * this.config.behaviorWeights.interaction;

    // 归一化到0-100范围
    return Math.min(100, score / 10);
  }

  /**
   * 计算趋势
   */
  private calculateTrend(history: Array<{score: number}>, currentScore: number): number {
    if (history.length === 0) {
      return 0;
    }

    const recentScores = history.slice(-5).map(h => h.score);
    const avgScore = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;

    if (currentScore > avgScore * 1.1) {
      return 1; // 上升
    } else if (currentScore < avgScore * 0.9) {
      return -1; // 下降
    }
    return 0; // 平稳
  }

  /**
   * 获取标签相关的观看事件
   */
  private async getWatchEventsByTag(
    tagId: string,
    startTime?: number,
    endTime?: number
  ): Promise<WatchEvent[]> {
    const allWatchEvents = await this.watchEventRepo.getAllWatchEvents();

    // 获取包含该标签的视频ID
    const allVideos = await this.videoRepo.getAllVideos();
    const videoIds = allVideos
      .filter(v => v.tags.includes(tagId))
      .map(v => v.videoId);

    // 过滤观看事件
    let events = allWatchEvents.filter(e => videoIds.includes(e.videoId));

    if (startTime !== undefined) {
      events = events.filter(e => e.watchTime >= startTime);
    }
    if (endTime !== undefined) {
      events = events.filter(e => e.watchTime <= endTime);
    }

    return events;
  }

  /**
   * 获取标签相关的互动事件
   */
  private async getInteractionEventsByTag(
    tagId: string,
    startTime?: number,
    endTime?: number
  ): Promise<InteractionEvent[]> {
    const allInteractionEvents = await this.interactionEventRepo.getAllInteractionEvents();

    // 获取包含该标签的视频ID
    const allVideos = await this.videoRepo.getAllVideos();
    const videoIds = allVideos
      .filter(v => v.tags.includes(tagId))
      .map(v => v.videoId);

    // 过滤互动事件
    let events = allInteractionEvents.filter(e => videoIds.includes(e.videoId));

    if (startTime !== undefined) {
      events = events.filter(e => e.timestamp >= startTime);
    }
    if (endTime !== undefined) {
      events = events.filter(e => e.timestamp <= endTime);
    }

    return events;
  }
}
