/**
 * KnowledgeEntryRepository 实现
 * 实现知识条目相关的数据库操作
 */

import { IKnowledgeEntryRepository } from '../interfaces/note/knowledge-entry-repository.interface';
import { KnowledgeEntry } from '../types/note';
import { PaginationParams, PaginationResult } from '../types/base';
import { DBUtils, STORE_NAMES } from '../indexeddb';

/**
 * KnowledgeEntryRepository 实现类
 */
export class KnowledgeEntryRepository implements IKnowledgeEntryRepository {
  /**
   * 创建知识条目
   */
  async createEntry(entry: Omit<KnowledgeEntry, 'entryId'>): Promise<string> {
    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const knowledgeEntry: KnowledgeEntry = {
      entryId,
      ...entry,
      createdAt: Date.now(),
      lastUpdate: Date.now()
    };
    await DBUtils.add(STORE_NAMES.KNOWLEDGE_ENTRIES, knowledgeEntry);
    return entryId;
  }

  /**
   * 批量创建知识条目
   */
  async createEntries(entries: Omit<KnowledgeEntry, 'entryId'>[]): Promise<string[]> {
    const entryIds: string[] = [];
    const knowledgeEntries: KnowledgeEntry[] = entries.map(entry => {
      const entryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      entryIds.push(entryId);
      return {
        entryId,
        ...entry,
        createdAt: Date.now(),
        lastUpdate: Date.now()
      };
    });
    await DBUtils.addBatch(STORE_NAMES.KNOWLEDGE_ENTRIES, knowledgeEntries);
    return entryIds;
  }

  /**
   * 获取知识条目
   */
  async getEntry(entryId: string): Promise<KnowledgeEntry | null> {
    return DBUtils.get<KnowledgeEntry>(STORE_NAMES.KNOWLEDGE_ENTRIES, entryId);
  }

  /**
   * 获取笔记的知识条目
   */
  async getNoteEntries(
    noteId: string,
    pagination: PaginationParams
  ): Promise<PaginationResult<KnowledgeEntry>> {
    const allEntries = await DBUtils.getByIndex<KnowledgeEntry>(
      STORE_NAMES.KNOWLEDGE_ENTRIES,
      'noteId',
      noteId
    );

    const sorted = allEntries.sort((a, b) => b.createdAt - a.createdAt);

    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const items = sorted.slice(start, end);

    return {
      items,
      total: sorted.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(sorted.length / pagination.pageSize)
    };
  }

  /**
   * 按标签查询知识条目
   */
  async getEntriesByTags(
    tagIds: string[],
    pagination: PaginationParams
  ): Promise<PaginationResult<KnowledgeEntry>> {
    const allEntries = await DBUtils.getAll<KnowledgeEntry>(STORE_NAMES.KNOWLEDGE_ENTRIES);

    const filtered = allEntries.filter(entry =>
      entry.tagIds.some(tagId => tagIds.includes(tagId))
    );

    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);

    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const items = sorted.slice(start, end);

    return {
      items,
      total: sorted.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(sorted.length / pagination.pageSize)
    };
  }

  /**
   * 搜索知识条目
   */
  async searchEntries(
    keyword: string,
    pagination: PaginationParams
  ): Promise<PaginationResult<KnowledgeEntry>> {
    const allEntries = await DBUtils.getAll<KnowledgeEntry>(STORE_NAMES.KNOWLEDGE_ENTRIES);

    const lowerKeyword = keyword.toLowerCase();
    const filtered = allEntries.filter(entry =>
      entry.title.toLowerCase().includes(lowerKeyword) ||
      entry.content.toLowerCase().includes(lowerKeyword)
    );

    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);

    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const items = sorted.slice(start, end);

    return {
      items,
      total: sorted.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(sorted.length / pagination.pageSize)
    };
  }

  /**
   * 更新知识条目
   */
  async updateEntry(
    entryId: string,
    updates: Partial<Omit<KnowledgeEntry, 'entryId' | 'createdAt'>>
  ): Promise<void> {
    const existing = await this.getEntry(entryId);
    if (!existing) {
      throw new Error(`Knowledge entry not found: ${entryId}`);
    }

    const updated: KnowledgeEntry = {
      ...existing,
      ...updates,
      lastUpdate: Date.now()
    };

    await DBUtils.put(STORE_NAMES.KNOWLEDGE_ENTRIES, updated);
  }

  /**
   * 更新知识条目embedding
   */
  async updateEntryEmbedding(entryId: string, embedding: number[]): Promise<void> {
    await this.updateEntry(entryId, { embedding });
  }

  /**
   * 删除知识条目
   */
  async deleteEntry(entryId: string): Promise<void> {
    await DBUtils.delete(STORE_NAMES.KNOWLEDGE_ENTRIES, entryId);
  }

  /**
   * 删除笔记的所有知识条目
   */
  async deleteNoteEntries(noteId: string): Promise<void> {
    const allEntries = await DBUtils.getByIndex<KnowledgeEntry>(
      STORE_NAMES.KNOWLEDGE_ENTRIES,
      'noteId',
      noteId
    );

    const entryIds = allEntries.map(entry => entry.entryId);
    if (entryIds.length > 0) {
      await DBUtils.deleteBatch(STORE_NAMES.KNOWLEDGE_ENTRIES, entryIds);
    }
  }

  /**
   * 批量删除知识条目
   */
  async deleteEntries(entryIds: string[]): Promise<void> {
    await DBUtils.deleteBatch(STORE_NAMES.KNOWLEDGE_ENTRIES, entryIds);
  }

  /**
   * 获取知识条目数量
   */
  async countEntries(noteId: string): Promise<number> {
    const result = await this.getNoteEntries(noteId, { page: 0, pageSize: 1 });
    return result.total;
  }

  /**
   * 获取所有知识条目
   */
  async getAllEntries(
    pagination: PaginationParams,
    type?: KnowledgeEntry['type']
  ): Promise<PaginationResult<KnowledgeEntry>> {
    const allEntries = await DBUtils.getAll<KnowledgeEntry>(STORE_NAMES.KNOWLEDGE_ENTRIES);

    let filtered = allEntries;
    if (type !== undefined) {
      filtered = allEntries.filter(entry => entry.type === type);
    }

    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);

    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const items = sorted.slice(start, end);

    return {
      items,
      total: sorted.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(sorted.length / pagination.pageSize)
    };
  }

  /**
   * 按标签获取相关知识条目
   */
  async getRelatedEntries(
    tagIds: string[],
    excludeEntryId?: string,
    limit: number = 50
  ): Promise<KnowledgeEntry[]> {
    const allEntries = await DBUtils.getAll<KnowledgeEntry>(STORE_NAMES.KNOWLEDGE_ENTRIES);

    const filtered = allEntries.filter(entry =>
      entry.tagIds.some(tagId => tagIds.includes(tagId)) &&
      entry.entryId !== excludeEntryId
    );

    // TODO: 实现基于相关性的排序
    return filtered.slice(0, limit);
  }
}
