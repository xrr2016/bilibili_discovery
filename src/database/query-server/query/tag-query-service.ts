/**
 * 标签查询服务模块 - 调度层
 * 协调标签查询流程，调用纯函数执行查询
 */

import type { TagIndex, TagQueryCondition } from '../cache/types.js';
import type { Tag } from '../../types/semantic.js';
import { IndexCache } from '../cache/index-cache.js';
import { TagRepository } from '../../repositories/tag-repository.js';
import { CacheManager } from '../cache/cache-manager.js';
import { ID } from '../../types/base.js';

/**
 * 标签查询服务类 - 调度层
 * 负责协调查询流程，调用纯函数执行查询
 * 与Book和页面无关，是通用工具
 */
export class TagQueryService {
  private indexCache: IndexCache<TagIndex>;
  private repository: TagRepository;
  private cacheManager: CacheManager;

  constructor(
    repository?: TagRepository
  ) {
    this.cacheManager = CacheManager.getInstance();
    // 从CacheManager获取缓存单例
    this.indexCache = this.cacheManager.getTagIndexCache();
    this.repository = repository || new TagRepository();
  }

  /**
   * 查询结果ID列表
   * @param queryCondition 查询条件
   * @returns 结果ID列表
   */
  async queryResultIds(queryCondition: TagQueryCondition): Promise<ID[]> {
    try {
      // 确保索引缓存已加载
      if (this.indexCache.size() === 0) {
        await this.loadIndexCache();
      }

      const allIndexes = this.indexCache.values();
      return this.filterTags(allIndexes, queryCondition);
    } catch (error) {
      console.error('[TagQueryService] queryResultIds error:', error);
      throw error;
    }
  }

  /**
   * 过滤标签
   * @param indexes 标签索引列表
   * @param condition 查询条件
   * @returns 匹配的标签ID列表
   */
  private filterTags(
    indexes: TagIndex[],
    condition: TagQueryCondition
  ): ID[] {
    let result = indexes;

    // 按关键词过滤
    if (condition.keyword && condition.keyword.trim()) {
      const keyword = condition.keyword.trim().toLowerCase();
      result = result.filter(index => 
        index.name.toLowerCase().includes(keyword)
      );
    }

    // 按来源过滤
    if (condition.source) {
      result = result.filter(index => index.source === condition.source);
    }

    return result.map(index => index.tagId);
  }

  /**
   * 加载索引缓存
   */
  async loadIndexCache(): Promise<void> {
    try {
      const allTags = await this.repository.getAllTags();
      const indexes: TagIndex[] = allTags.items.map(tag => ({
        tagId: tag.tagId,
        name: tag.name,
        source: tag.source
      }));
      // 将数组转换为Map
      const entries = new Map<ID, TagIndex>();
      indexes.forEach(index => entries.set(index.tagId, index));
      this.indexCache.setBatch(entries);
      console.log(`[TagQueryService] Index cache loaded: ${indexes.length} tags`);
    } catch (error) {
      console.error('[TagQueryService] Failed to load index cache:', error);
      throw error;
    }
  }

  /**
   * 获取索引缓存实例
   */
  getIndexCache(): IndexCache<TagIndex> {
    return this.indexCache;
  }

  /**
   * 清空索引缓存
   */
  clearIndexCache(): void {
    this.indexCache.clear();
  }

  /**
   * 获取索引缓存大小
   */
  getIndexCacheSize(): number {
    return this.indexCache.size();
  }
}
