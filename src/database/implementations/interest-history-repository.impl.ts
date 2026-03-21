/**
 * InterestHistoryRepository 实现
 * 实现兴趣历史记录相关的数据库操作
 */

import { IInterestHistoryRepository } from '../interfaces/analytics/interest-history-repository.interface.js';
import { InterestHistory } from '../types/analytics.js';
import { TimeRange } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';

/**
 * InterestHistoryRepository 实现类
 */
export class InterestHistoryRepository implements IInterestHistoryRepository {
  /**
   * 记录兴趣历史
   */
  async recordInterestHistory(history: Omit<InterestHistory, 'recordId'>): Promise<void> {
    const record: InterestHistory = {
      ...history,
      recordId: `${history.tagId}_${history.timestamp}`
    };
    await DBUtils.put(STORE_NAMES.INTEREST_HISTORIES, record);
  }

  /**
   * 批量记录兴趣历史
   */
  async recordInterestHistories(histories: Omit<InterestHistory, 'recordId'>[]): Promise<void> {
    const records = histories.map(history => ({
      ...history,
      recordId: `${history.tagId}_${history.timestamp}`
    }));
    await DBUtils.putBatch(STORE_NAMES.INTEREST_HISTORIES, records);
  }

  /**
   * 获取标签的兴趣历史
   */
  async getInterestHistory(tagId: string, timeRange?: TimeRange): Promise<InterestHistory[]> {
    const allHistory = await DBUtils.getAll<InterestHistory>(STORE_NAMES.INTEREST_HISTORIES);
    let filtered = allHistory.filter(h => h.tagId === tagId);

    if (timeRange) {
      filtered = filtered.filter(h => 
        h.timestamp >= timeRange.startTime && h.timestamp <= timeRange.endTime
      );
    }

    return filtered.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 批量获取多个标签的兴趣历史
   */
  async getInterestHistories(tagIds: string[], timeRange?: TimeRange): Promise<Map<string, InterestHistory[]>> {
    const allHistory = await DBUtils.getAll<InterestHistory>(STORE_NAMES.INTEREST_HISTORIES);
    const result = new Map<string, InterestHistory[]>();

    tagIds.forEach(tagId => {
      let history = allHistory.filter(h => h.tagId === tagId);

      if (timeRange) {
        history = history.filter(h => 
          h.timestamp >= timeRange.startTime && h.timestamp <= timeRange.endTime
        );
      }

      result.set(tagId, history.sort((a, b) => a.timestamp - b.timestamp));
    });

    return result;
  }

  /**
   * 删除兴趣历史
   */
  async deleteInterestHistory(recordId: string): Promise<void> {
    await DBUtils.delete(STORE_NAMES.INTEREST_HISTORIES, recordId);
  }

  /**
   * 删除标签的所有历史记录
   */
  async deleteTagInterestHistory(tagId: string): Promise<void> {
    const allHistory = await DBUtils.getAll<InterestHistory>(STORE_NAMES.INTEREST_HISTORIES);
    const toDelete = allHistory
      .filter(h => h.tagId === tagId)
      .map(h => h.recordId);

    if (toDelete.length > 0) {
      await DBUtils.deleteBatch(STORE_NAMES.INTEREST_HISTORIES, toDelete);
    }
  }

  /**
   * 批量删除标签的历史记录
   */
  async deleteTagsInterestHistory(tagIds: string[]): Promise<void> {
    const allHistory = await DBUtils.getAll<InterestHistory>(STORE_NAMES.INTEREST_HISTORIES);
    const toDelete = allHistory
      .filter(h => tagIds.includes(h.tagId))
      .map(h => h.recordId);

    if (toDelete.length > 0) {
      await DBUtils.deleteBatch(STORE_NAMES.INTEREST_HISTORIES, toDelete);
    }
  }

  /**
   * 清空所有兴趣历史
   */
  async clearAllInterestHistory(): Promise<void> {
    await DBUtils.clear(STORE_NAMES.INTEREST_HISTORIES);
  }

  /**
   * 按时间范围删除历史记录
   */
  async deleteInterestHistoryByTimeRange(timeRange: TimeRange): Promise<void> {
    const allHistory = await DBUtils.getAll<InterestHistory>(STORE_NAMES.INTEREST_HISTORIES);
    const toDelete = allHistory
      .filter(h => h.timestamp >= timeRange.startTime && h.timestamp <= timeRange.endTime)
      .map(h => h.recordId);

    if (toDelete.length > 0) {
      await DBUtils.deleteBatch(STORE_NAMES.INTEREST_HISTORIES, toDelete);
    }
  }

  /**
   * 获取兴趣历史统计
   */
  async getInterestHistoryStats(
    tagId: string, 
    timeRange?: TimeRange
  ): Promise<{
    count: number;
    avgScore: number;
    maxScore: number;
    minScore: number;
  }> {
    const history = await this.getInterestHistory(tagId, timeRange);

    if (history.length === 0) {
      return {
        count: 0,
        avgScore: 0,
        maxScore: 0,
        minScore: 0
      };
    }

    const scores = history.map(h => h.score);
    return {
      count: history.length,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores)
    };
  }

  /**
   * 获取兴趣变化趋势
   */
  async getInterestTrend(
    tagId: string, 
    timeRange: TimeRange, 
    interval: number
  ): Promise<{
    timestamp: number;
    score: number;
  }[]> {
    const history = await this.getInterestHistory(tagId, timeRange);
    const result: Array<{timestamp: number; score: number}> = [];

    if (history.length === 0) {
      return result;
    }

    // 按时间间隔聚合数据
    const intervalMs = interval * 24 * 60 * 60 * 1000; // 转换为毫秒
    const startTime = Math.floor(timeRange.startTime / intervalMs) * intervalMs;
    const endTime = timeRange.endTime;

    for (let t = startTime; t <= endTime; t += intervalMs) {
      const intervalEnd = t + intervalMs;
      const intervalHistory = history.filter(h => 
        h.timestamp >= t && h.timestamp < intervalEnd
      );

      if (intervalHistory.length > 0) {
        const avgScore = intervalHistory.reduce((sum, h) => sum + h.score, 0) / intervalHistory.length;
        result.push({
          timestamp: t,
          score: avgScore
        });
      }
    }

    return result;
  }
}
