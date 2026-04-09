/**
 * InterestSnapshotRepositoryImpl 实现
 * 实现兴趣快照相关的数据库操作
 */

import { InterestSnapshot } from '../types/interest.js';
import { ID, Timestamp, Platform } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';
import { generateId } from './id-generator.js';

/**
 * 兴趣快照仓库实现类
 */
export class InterestSnapshotRepositoryImpl {
  /**
   * 创建或更新单个快照
   */
  async upsertSnapshot(snapshot: Omit<InterestSnapshot, 'snapshotId'>): Promise<ID> {
    const snapshotId = generateId();
    const now = Date.now() as Timestamp;

    const fullSnapshot: InterestSnapshot = {
      ...snapshot,
      snapshotId,
      updatedAt: now
    };

    await DBUtils.put(STORE_NAMES.INTEREST_SNAPSHOTS, fullSnapshot);
    return snapshotId;
  }

  /**
   * 批量创建或更新快照
   */
  async upsertSnapshotsBatch(snapshots: Omit<InterestSnapshot, 'snapshotId'>[]): Promise<ID[]> {
    if (snapshots.length === 0) return [];

    const now = Date.now() as Timestamp;
    const fullSnapshots: InterestSnapshot[] = snapshots.map(snapshot => ({
      ...snapshot,
      snapshotId: generateId(),
      updatedAt: now
    } as InterestSnapshot));

    await DBUtils.putBatch(STORE_NAMES.INTEREST_SNAPSHOTS, fullSnapshots);
    return fullSnapshots.map(s => s.snapshotId);
  }

  /**
   * 获取单个快照
   */
  async getSnapshot(snapshotId: ID): Promise<InterestSnapshot | null> {
    return await DBUtils.get<InterestSnapshot>(STORE_NAMES.INTEREST_SNAPSHOTS, snapshotId);
  }

  /**
   * 批量获取多个快照
   */
  async getSnapshots(snapshotIds: ID[]): Promise<InterestSnapshot[]> {
    return await DBUtils.getBatch<InterestSnapshot>(STORE_NAMES.INTEREST_SNAPSHOTS, snapshotIds);
  }

  /**
   * 按日期键获取所有快照
   */
  async getSnapshotsByDateKey(dateKey: string): Promise<InterestSnapshot[]> {
    return await DBUtils.getByIndex<InterestSnapshot>(
      STORE_NAMES.INTEREST_SNAPSHOTS,
      'dateKey',
      dateKey
    );
  }

  /**
   * 按时间窗口获取所有快照
   */
  async getSnapshotsByWindow(window: '7d' | '30d'): Promise<InterestSnapshot[]> {
    return await DBUtils.getByIndex<InterestSnapshot>(
      STORE_NAMES.INTEREST_SNAPSHOTS,
      'window',
      window
    );
  }

  /**
   * 按兴趣主题获取所有快照
   */
  async getSnapshotsByTopicId(topicId: ID): Promise<InterestSnapshot[]> {
    return await DBUtils.getByIndex<InterestSnapshot>(
      STORE_NAMES.INTEREST_SNAPSHOTS,
      'topicId',
      topicId
    );
  }

  /**
   * 按平台获取所有快照
   */
  async getSnapshotsByPlatform(platform: Platform): Promise<InterestSnapshot[]> {
    return await DBUtils.getByIndex<InterestSnapshot>(
      STORE_NAMES.INTEREST_SNAPSHOTS,
      'platform',
      platform
    );
  }

  /**
   * 按日期键和时间窗口获取快照
   */
  async getSnapshotsByDateKeyAndWindow(dateKey: string, window: '7d' | '30d'): Promise<InterestSnapshot[]> {
    const snapshots = await this.getSnapshotsByDateKey(dateKey);
    return snapshots.filter(s => s.window === window);
  }

  /**
   * 按日期键、平台和时间窗口获取快照
   */
  async getSnapshotsByDateKeyPlatformAndWindow(
    dateKey: string,
    platform: Platform,
    window: '7d' | '30d'
  ): Promise<InterestSnapshot[]> {
    const snapshots = await this.getSnapshotsByDateKey(dateKey);
    return snapshots.filter(s => s.platform === platform && s.window === window);
  }

  /**
   * 按日期范围获取快照
   */
  async getSnapshotsByDateRange(startDate: string, endDate: string): Promise<InterestSnapshot[]> {
    const range = IDBKeyRange.bound(startDate, endDate);
    return await DBUtils.getByIndexRange<InterestSnapshot>(
      STORE_NAMES.INTEREST_SNAPSHOTS,
      'dateKey',
      range
    );
  }

  /**
   * 按日期范围和时间窗口获取快照
   */
  async getSnapshotsByDateRangeAndWindow(
    startDate: string,
    endDate: string,
    window: '7d' | '30d'
  ): Promise<InterestSnapshot[]> {
    const snapshots = await this.getSnapshotsByDateRange(startDate, endDate);
    return snapshots.filter(s => s.window === window);
  }

  /**
   * 获取指定日期和时间窗口的最新快照
   */
  async getLatestSnapshotByDateKeyAndWindow(
    dateKey: string,
    window: '7d' | '30d'
  ): Promise<InterestSnapshot[]> {
    return await this.getSnapshotsByDateKeyAndWindow(dateKey, window);
  }

  /**
   * 获取所有快照
   */
  async getAllSnapshots(): Promise<InterestSnapshot[]> {
    return await DBUtils.getAll<InterestSnapshot>(STORE_NAMES.INTEREST_SNAPSHOTS);
  }

  /**
   * 删除单个快照
   */
  async deleteSnapshot(snapshotId: ID): Promise<void> {
    await DBUtils.delete(STORE_NAMES.INTEREST_SNAPSHOTS, snapshotId);
  }

  /**
   * 批量删除快照
   */
  async deleteSnapshots(snapshotIds: ID[]): Promise<void> {
    await DBUtils.deleteBatch(STORE_NAMES.INTEREST_SNAPSHOTS, snapshotIds);
  }

  /**
   * 删除指定日期的所有快照
   */
  async deleteSnapshotsByDateKey(dateKey: string): Promise<void> {
    const snapshots = await this.getSnapshotsByDateKey(dateKey);
    const ids = snapshots.map(s => s.snapshotId);
    if (ids.length > 0) {
      await this.deleteSnapshots(ids);
    }
  }

  /**
   * 删除指定日期范围的所有快照
   */
  async deleteSnapshotsByDateRange(startDate: string, endDate: string): Promise<void> {
    const snapshots = await this.getSnapshotsByDateRange(startDate, endDate);
    const ids = snapshots.map(s => s.snapshotId);
    if (ids.length > 0) {
      await this.deleteSnapshots(ids);
    }
  }

  /**
   * 删除指定时间窗口的所有快照
   */
  async deleteSnapshotsByWindow(window: '7d' | '30d'): Promise<void> {
    const snapshots = await this.getSnapshotsByWindow(window);
    const ids = snapshots.map(s => s.snapshotId);
    if (ids.length > 0) {
      await this.deleteSnapshots(ids);
    }
  }

  /**
   * 删除指定主题的所有快照
   */
  async deleteSnapshotsByTopicId(topicId: ID): Promise<void> {
    const snapshots = await this.getSnapshotsByTopicId(topicId);
    const ids = snapshots.map(s => s.snapshotId);
    if (ids.length > 0) {
      await this.deleteSnapshots(ids);
    }
  }

  /**
   * 清空所有快照
   */
  async deleteAllSnapshots(): Promise<void> {
    await DBUtils.clear(STORE_NAMES.INTEREST_SNAPSHOTS);
  }

  /**
   * 获取快照总数
   */
  async countSnapshots(): Promise<number> {
    return await DBUtils.count(STORE_NAMES.INTEREST_SNAPSHOTS);
  }

  /**
   * 统计指定日期的快照数量
   */
  async countSnapshotsByDateKey(dateKey: string): Promise<number> {
    return await DBUtils.countByIndex(STORE_NAMES.INTEREST_SNAPSHOTS, 'dateKey', dateKey);
  }

  /**
   * 统计指定时间窗口的快照数量
   */
  async countSnapshotsByWindow(window: '7d' | '30d'): Promise<number> {
    return await DBUtils.countByIndex(STORE_NAMES.INTEREST_SNAPSHOTS, 'window', window);
  }

  /**
   * 统计指定主题的快照数量
   */
  async countSnapshotsByTopicId(topicId: ID): Promise<number> {
    return await DBUtils.countByIndex(STORE_NAMES.INTEREST_SNAPSHOTS, 'topicId', topicId);
  }

  /**
   * 统计指定日期范围的快照数量
   */
  async countSnapshotsByDateRange(startDate: string, endDate: string): Promise<number> {
    const range = IDBKeyRange.bound(startDate, endDate);
    return await DBUtils.countByIndexRange(STORE_NAMES.INTEREST_SNAPSHOTS, 'dateKey', range);
  }

  /**
   * 获取指定窗口和日期的最高分数快照
   */
  async getTopSnapshotsByWindow(
    window: '7d' | '30d',
    limit: number = 10
  ): Promise<InterestSnapshot[]> {
    const all = await this.getSnapshotsByWindow(window);
    // 按 finalScore 降序排列，取前 limit 个
    return all.sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0)).slice(0, limit);
  }

  /**
   * 计算指定日期和窗口的总兴趣分
   */
  async sumFinalScore(dateKey: string, window: '7d' | '30d'): Promise<number> {
    const snapshots = await this.getSnapshotsByDateKeyAndWindow(dateKey, window);
    return snapshots.reduce((sum, s) => sum + (s.finalScore ?? 0), 0);
  }
}
