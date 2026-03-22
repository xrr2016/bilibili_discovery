/**
 * CollectionRepository 实现
 * 实现收藏夹相关的数据库操作
 */

import { ICollectionRepository } from '../interfaces/collection/collection-repository.interface.js';
import { Collection } from '../types/collection.js';
import { Platform, PaginationParams, PaginationResult } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';

/**
 * CollectionRepository 实现类
 */
export class CollectionRepository implements ICollectionRepository {
  /**
   * 创建收藏夹
   */
  async createCollection(collection: Omit<Collection, 'collectionId'>): Promise<string> {
    const collectionId = `collection_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newCollection: Collection = {
      collectionId,
      ...collection,
      createdAt: Date.now(),
      lastUpdate: Date.now()
    };
    await DBUtils.add(STORE_NAMES.COLLECTIONS, newCollection);
    return collectionId;
  }

  /**
   * 使用指定ID创建收藏夹
   */
  async createCollectionWithId(collectionId: string, collection: Omit<Collection, 'collectionId'>): Promise<void> {
    const newCollection: Collection = {
      collectionId,
      ...collection,
      createdAt: Date.now(),
      lastUpdate: Date.now()
    };
    await DBUtils.add(STORE_NAMES.COLLECTIONS, newCollection);
  }

  /**
   * 获取收藏夹
   */
  async getCollection(collectionId: string): Promise<Collection | null> {
    return DBUtils.get<Collection>(STORE_NAMES.COLLECTIONS, collectionId);
  }

  /**
   * 获取所有收藏夹
   */
  async getAllCollections(platform: Platform): Promise<Collection[]> {
    const allCollections = await DBUtils.getByIndex<Collection>(
      STORE_NAMES.COLLECTIONS,
      'platform',
      platform
    );
    return allCollections.sort((a, b) => b.lastUpdate - a.lastUpdate);
  }

  /**
   * 更新收藏夹
   */
  async updateCollection(
    collectionId: string,
    updates: Partial<Omit<Collection, 'collectionId' | 'createdAt'>>
  ): Promise<void> {
    const existing = await this.getCollection(collectionId);
    if (!existing) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    const updated: Collection = {
      ...existing,
      ...updates,
      lastUpdate: Date.now()
    };

    await DBUtils.put(STORE_NAMES.COLLECTIONS, updated);
  }

  /**
   * 删除收藏夹
   */
  async deleteCollection(collectionId: string): Promise<void> {
    await DBUtils.delete(STORE_NAMES.COLLECTIONS, collectionId);
  }

  /**
   * 搜索收藏夹
   */
  async searchCollections(platform: Platform, keyword: string): Promise<Collection[]> {
    const allCollections = await this.getAllCollections(platform);
    const lowerKeyword = keyword.toLowerCase();

    return allCollections.filter(collection =>
      collection.name.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 获取收藏夹统计信息
   */
  async getCollectionStats(collectionId: string): Promise<Collection | null> {
    // TODO: 实现统计计算逻辑
    return null;
  }

  /**
   * 增加收藏夹的视频数量
   */
  async incrementVideoCount(collectionId: string, count: number = 1): Promise<void> {
    try {
      const collection = await this.getCollection(collectionId);
      if (!collection) {
        console.warn(`[CollectionRepository] Collection not found: ${collectionId}`);
        return;
      }

      await this.updateCollection(collectionId, {
        videoCount: (collection.videoCount || 0) + count
      });
    } catch (error) {
      console.error('[CollectionRepository] Error incrementing video count:', error);
    }
  }

  /**
   * 减少收藏夹的视频数量
   */
  async decrementVideoCount(collectionId: string, count: number = 1): Promise<void> {
    try {
      const collection = await this.getCollection(collectionId);
      if (!collection) {
        console.warn(`[CollectionRepository] Collection not found: ${collectionId}`);
        return;
      }

      const newCount = Math.max(0, (collection.videoCount || 0) - count);
      await this.updateCollection(collectionId, {
        videoCount: newCount
      });
    } catch (error) {
      console.error('[CollectionRepository] Error decrementing video count:', error);
    }
  }

  /**
   * 重置收藏夹的统计信息
   */
  async resetCollectionStats(collectionId: string): Promise<void> {
    try {
      await this.updateCollection(collectionId, {
        videoCount: 0,
        totalWatchTime: 0,
        totalWatchCount: 0,
        lastAddedAt: undefined
      });
    } catch (error) {
      console.error('[CollectionRepository] Error resetting collection stats:', error);
    }
  }

  /**
   * 更新收藏夹的最后添加时间
   */
  async updateLastAddedAt(collectionId: string, addedAt: number): Promise<void> {
    try {
      const collection = await this.getCollection(collectionId);
      if (!collection) {
        console.warn(`[CollectionRepository] Collection not found: ${collectionId}`);
        return;
      }

      // 只有当新的添加时间比现有的时间更晚时才更新
      if (!collection.lastAddedAt || addedAt > collection.lastAddedAt) {
        await this.updateCollection(collectionId, {
          lastAddedAt: addedAt
        });
      }
    } catch (error) {
      console.error('[CollectionRepository] Error updating last added time:', error);
    }
  }

  /**
   * 检查收藏夹名称是否已存在
   */
  async collectionNameExists(
    platform: Platform,
    name: string,
    excludeId?: string
  ): Promise<boolean> {
    const allCollections = await this.getAllCollections(platform);
    const lowerName = name.toLowerCase();

    return allCollections.some(collection =>
      collection.collectionId !== excludeId &&
      collection.name.toLowerCase() === lowerName
    );
  }
}
