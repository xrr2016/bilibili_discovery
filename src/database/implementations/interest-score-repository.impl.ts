/**
 * InterestScoreRepository 实现
 * 实现用户兴趣权重相关的数据库操作
 */

import { IInterestScoreRepository } from '../interfaces/analytics/interest-score-repository.interface';
import { InterestScore } from '../types/analytics';
import { DBUtils, STORE_NAMES } from '../indexeddb';

/**
 * InterestScoreRepository 实现类
 */
export class InterestScoreRepository implements IInterestScoreRepository {
  /**
   * 更新兴趣分数
   */
  async updateInterestScore(score: Omit<InterestScore, 'lastUpdate'>): Promise<void> {
    const updated: InterestScore = {
      ...score,
      lastUpdate: Date.now()
    };
    await DBUtils.put(STORE_NAMES.INTEREST_SCORES, updated);
  }

  /**
   * 批量更新兴趣分数
   */
  async updateInterestScores(scores: Omit<InterestScore, 'lastUpdate'>[]): Promise<void> {
    const updatedScores = scores.map(score => ({
      ...score,
      lastUpdate: Date.now()
    }));
    await DBUtils.putBatch(STORE_NAMES.INTEREST_SCORES, updatedScores);
  }

  /**
   * 获取兴趣分数
   */
  async getInterestScore(tagId: string): Promise<InterestScore | null> {
    return DBUtils.get<InterestScore>(STORE_NAMES.INTEREST_SCORES, tagId);
  }

  /**
   * 批量获取兴趣分数
   */
  async getInterestScores(tagIds: string[]): Promise<InterestScore[]> {
    return DBUtils.getBatch<InterestScore>(STORE_NAMES.INTEREST_SCORES, tagIds);
  }

  /**
   * 获取所有兴趣分数
   */
  async getAllInterestScores(minScore?: number): Promise<InterestScore[]> {
    const allScores = await DBUtils.getAll<InterestScore>(STORE_NAMES.INTEREST_SCORES);
    const filtered = minScore !== undefined
      ? allScores.filter(score => score.score >= minScore)
      : allScores;
    return filtered.sort((a, b) => b.score - a.score);
  }

  /**
   * 获取Top兴趣标签
   */
  async getTopInterests(
    limit: number = 100,
    scoreType: 'score' | 'shortTermScore' | 'longTermScore' = 'score'
  ): Promise<InterestScore[]> {
    const allScores = await DBUtils.getAll<InterestScore>(STORE_NAMES.INTEREST_SCORES);
    return allScores
      .sort((a, b) => b[scoreType] - a[scoreType])
      .slice(0, limit);
  }

  /**
   * 删除兴趣分数
   */
  async deleteInterestScore(tagId: string): Promise<void> {
    await DBUtils.delete(STORE_NAMES.INTEREST_SCORES, tagId);
  }

  /**
   * 批量删除兴趣分数
   */
  async deleteInterestScores(tagIds: string[]): Promise<void> {
    await DBUtils.deleteBatch(STORE_NAMES.INTEREST_SCORES, tagIds);
  }

  /**
   * 清空所有兴趣分数
   */
  async clearAllInterestScores(): Promise<void> {
    await DBUtils.clear(STORE_NAMES.INTEREST_SCORES);
  }

  /**
   * 获取兴趣分数统计
   */
  async getInterestScoreStats(): Promise<{
    total: number;
    avgScore: number;
    maxScore: number;
  }> {
    const allScores = await DBUtils.getAll<InterestScore>(STORE_NAMES.INTEREST_SCORES);

    if (allScores.length === 0) {
      return {
        total: 0,
        avgScore: 0,
        maxScore: 0
      };
    }

    const total = allScores.length;
    const sum = allScores.reduce((acc, score) => acc + score.score, 0);
    const avgScore = sum / total;
    const maxScore = Math.max(...allScores.map(score => score.score));

    return {
      total,
      avgScore,
      maxScore
    };
  }
}
