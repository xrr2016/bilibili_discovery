/**
 * TagInterestMappingRepositoryImpl 实现
 * 实现标签-兴趣主题映射相关的数据库操作
 */

import { TagInterestMapping } from '../types/interest.js';
import { ID, Timestamp } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';
import { generateId } from './id-generator.js';

/**
 * 标签-兴趣主题映射仓库实现类
 */
export class TagInterestMappingRepositoryImpl {
  /**
   * 创建单个映射关系
   */
  async createMapping(
    tagId: ID,
    topicId: ID,
    score: number,
    source: 'rule' | 'llm' | 'manual',
    confidence: number = 1.0
  ): Promise<ID> {
    const mappingId = generateId();
    const now = Date.now() as Timestamp;

    const mapping: TagInterestMapping = {
      mappingId,
      tagId,
      topicId,
      score,
      source,
      confidence,
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    await DBUtils.put(STORE_NAMES.TAG_INTEREST_MAPPINGS, mapping);
    return mappingId;
  }

  /**
   * 创建或更新单个映射关系
   */
  async upsertMapping(
    mapping: Partial<TagInterestMapping> & { tagId: ID; topicId: ID }
  ): Promise<ID> {
    const now = Date.now() as Timestamp;

    // 尝试找到现有的映射
    const existing = await this.getMappingByTagAndTopic(mapping.tagId, mapping.topicId);

    if (existing) {
      // 更新现有映射
      existing.score = mapping.score ?? existing.score;
      existing.source = mapping.source ?? existing.source;
      existing.confidence = mapping.confidence ?? existing.confidence;
      existing.version = (existing.version ?? 0) + 1;
      existing.updatedAt = now;

      await DBUtils.put(STORE_NAMES.TAG_INTEREST_MAPPINGS, existing);
      return existing.mappingId;
    } else {
      // 创建新映射
      return await this.createMapping(
        mapping.tagId,
        mapping.topicId,
        mapping.score ?? 1.0,
        mapping.source ?? 'manual',
        mapping.confidence ?? 1.0
      );
    }
  }

  /**
   * 批量创建或更新映射关系
   */
  async upsertMappings(mappings: Partial<TagInterestMapping>[]): Promise<void> {
    const now = Date.now() as Timestamp;

    const fullMappings: TagInterestMapping[] = mappings.map(m => ({
      ...m,
      mappingId: m.mappingId ?? generateId(),
      tagId: m.tagId ?? '',
      topicId: m.topicId ?? '',
      score: m.score ?? 1.0,
      source: m.source ?? 'manual',
      confidence: m.confidence ?? 1.0,
      version: m.version ?? 1,
      createdAt: m.createdAt ?? now,
      updatedAt: now
    } as TagInterestMapping));

    await DBUtils.putBatch(STORE_NAMES.TAG_INTEREST_MAPPINGS, fullMappings);
  }

  /**
   * 获取单个映射关系（按ID）
   */
  async getMapping(mappingId: ID): Promise<TagInterestMapping | null> {
    return await DBUtils.get<TagInterestMapping>(STORE_NAMES.TAG_INTEREST_MAPPINGS, mappingId);
  }

  /**
   * 批量获取多个映射关系
   */
  async getMappings(mappingIds: ID[]): Promise<TagInterestMapping[]> {
    return await DBUtils.getBatch<TagInterestMapping>(STORE_NAMES.TAG_INTEREST_MAPPINGS, mappingIds);
  }

  /**
   * 按标签ID获取所有映射关系
   */
  async getMappingsByTagId(tagId: ID): Promise<TagInterestMapping[]> {
    return await DBUtils.getByIndex<TagInterestMapping>(
      STORE_NAMES.TAG_INTEREST_MAPPINGS,
      'tagId',
      tagId
    );
  }

  /**
   * 按兴趣主题ID获取所有映射关系
   */
  async getMappingsByTopicId(topicId: ID): Promise<TagInterestMapping[]> {
    return await DBUtils.getByIndex<TagInterestMapping>(
      STORE_NAMES.TAG_INTEREST_MAPPINGS,
      'topicId',
      topicId
    );
  }

  /**
   * 获取指定标签和主题的映射关系
   */
  async getMappingByTagAndTopic(tagId: ID, topicId: ID): Promise<TagInterestMapping | null> {
    // 先按 tagId 查询，然后过滤 topicId
    const mappings = await this.getMappingsByTagId(tagId);
    return mappings.find(m => m.topicId === topicId) || null;
  }

  /**
   * 获取指定来源的所有映射关系
   */
  async getMappingsBySource(source: 'rule' | 'llm' | 'manual'): Promise<TagInterestMapping[]> {
    return await DBUtils.getByIndex<TagInterestMapping>(
      STORE_NAMES.TAG_INTEREST_MAPPINGS,
      'source',
      source
    );
  }

  /**
   * 获取所有映射关系
   */
  async getAllMappings(): Promise<TagInterestMapping[]> {
    return await DBUtils.getAll<TagInterestMapping>(STORE_NAMES.TAG_INTEREST_MAPPINGS);
  }

  /**
   * 删除单个映射关系
   */
  async deleteMapping(mappingId: ID): Promise<void> {
    await DBUtils.delete(STORE_NAMES.TAG_INTEREST_MAPPINGS, mappingId);
  }

  /**
   * 批量删除映射关系
   */
  async deleteMappings(mappingIds: ID[]): Promise<void> {
    await DBUtils.deleteBatch(STORE_NAMES.TAG_INTEREST_MAPPINGS, mappingIds);
  }

  /**
   * 删除指定标签的所有映射关系
   */
  async deleteMappingsByTagId(tagId: ID): Promise<void> {
    const mappings = await this.getMappingsByTagId(tagId);
    const ids = mappings.map(m => m.mappingId);
    if (ids.length > 0) {
      await this.deleteMappings(ids);
    }
  }

  /**
   * 删除指定主题的所有映射关系
   */
  async deleteMappingsByTopicId(topicId: ID): Promise<void> {
    const mappings = await this.getMappingsByTopicId(topicId);
    const ids = mappings.map(m => m.mappingId);
    if (ids.length > 0) {
      await this.deleteMappings(ids);
    }
  }

  /**
   * 批量删除指定标签的映射关系
   */
  async deleteMappingsByTagIds(tagIds: ID[]): Promise<void> {
    for (const tagId of tagIds) {
      await this.deleteMappingsByTagId(tagId);
    }
  }

  /**
   * 获取映射关系总数
   */
  async countMappings(): Promise<number> {
    return await DBUtils.count(STORE_NAMES.TAG_INTEREST_MAPPINGS);
  }

  /**
   * 获取指定标签的映射数量
   */
  async countMappingsByTagId(tagId: ID): Promise<number> {
    return await DBUtils.countByIndex(STORE_NAMES.TAG_INTEREST_MAPPINGS, 'tagId', tagId);
  }

  /**
   * 获取指定主题的映射数量
   */
  async countMappingsByTopicId(topicId: ID): Promise<number> {
    return await DBUtils.countByIndex(STORE_NAMES.TAG_INTEREST_MAPPINGS, 'topicId', topicId);
  }

  /**
   * 清空所有映射关系
   */
  async clearMappings(): Promise<void> {
    await DBUtils.clear(STORE_NAMES.TAG_INTEREST_MAPPINGS);
  }
}
