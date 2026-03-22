/**
 * TagRepository 实现
 * 实现标签相关的数据库操作
 */

import { ITagRepository } from '../interfaces/semantic/tag-repository.interface.js';
import { Tag, TagStats } from '../types/semantic.js';
import { TagSource, PaginationParams, PaginationResult } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';

/**
 * TagRepository 实现类
 */
export class TagRepository implements ITagRepository {
  /**
   * 创建标签
   */
  async createTag(tag: Omit<Tag, 'tagId'>): Promise<string> {
    const tagId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newTag: Tag = {
      tagId,
      ...tag
    };
    await DBUtils.add(STORE_NAMES.TAGS, newTag);
    return tagId;
  }

  /**
   * 使用指定ID创建标签
   */
  async createTagWithId(tag: Tag): Promise<void> {
    await DBUtils.add(STORE_NAMES.TAGS, tag);
  }

  /**
   * 批量创建标签
   */
  async createTags(tags: Omit<Tag, 'tagId'>[]): Promise<string[]> {
    const tagIds: string[] = [];
    const newTags: Tag[] = tags.map(tag => {
      const tagId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      tagIds.push(tagId);
      return { tagId, ...tag };
    });
    await DBUtils.addBatch(STORE_NAMES.TAGS, newTags);
    return tagIds;
  }

  /**
   * 获取标签
   */
  async getTag(tagId: string): Promise<Tag | null> {
    return DBUtils.get<Tag>(STORE_NAMES.TAGS, tagId);
  }

  /**
   * 批量获取标签
   */
  async getTags(tagIds: string[]): Promise<Tag[]> {
    return DBUtils.getBatch<Tag>(STORE_NAMES.TAGS, tagIds);
  }

  /**
   * 搜索标签
   */
  async searchTags(keyword: string, pagination: PaginationParams): Promise<PaginationResult<Tag>> {
    const allTags = await DBUtils.getAll<Tag>(STORE_NAMES.TAGS);
    const filtered = allTags.filter(tag => 
      tag.name.toLowerCase().includes(keyword.toLowerCase())
    );

    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const items = filtered.slice(start, end);

    return {
      items,
      total: filtered.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(filtered.length / pagination.pageSize)
    };
  }

  /**
   * 获取所有标签
   */
  async getAllTags(source?: TagSource): Promise<Tag[]> {
    const allTags = await DBUtils.getAll<Tag>(STORE_NAMES.TAGS);
    if (source !== undefined) {
      return allTags.filter(tag => tag.source === source);
    }
    return allTags;
  }

  /**
   * 通过名称查找标签
   */
  async findTagByName(name: string): Promise<Tag | null> {
    const normalized = name.trim().toLowerCase();
    const allTags = await DBUtils.getAll<Tag>(STORE_NAMES.TAGS);
    return allTags.find(tag => tag.name.trim().toLowerCase() === normalized) ?? null;
  }

  /**
   * 更新标签
   */
  async updateTag(tagId: string, updates: Partial<Omit<Tag, 'tagId' | 'createdAt'>>): Promise<void> {
    const existing = await this.getTag(tagId);
    if (!existing) {
      throw new Error(`Tag not found: ${tagId}`);
    }
    const updated: Tag = {
      ...existing,
      ...updates
    };
    await DBUtils.put(STORE_NAMES.TAGS, updated);
  }

  /**
   * 删除标签
   */
  async deleteTag(tagId: string): Promise<void> {
    await DBUtils.delete(STORE_NAMES.TAGS, tagId);
  }

  /**
   * 获取标签统计信息
   */
  async getTagStats(tagId: string): Promise<TagStats | null> {
    // TODO: 实现统计计算逻辑
    return null;
  }

  /**
   * 批量获取标签统计信息
   */
  async getTagsStats(tagIds: string[]): Promise<TagStats[]> {
    // TODO: 实现批量统计计算逻辑
    return [];
  }

  /**
   * 获取热门标签
   */
  async getHotTags(limit: number = 100, source?: TagSource): Promise<Tag[]> {
    const allTags = await this.getAllTags(source);
    // TODO: 实现热门标签计算逻辑
    return allTags.slice(0, limit);
  }
}
