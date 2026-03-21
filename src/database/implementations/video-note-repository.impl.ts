/**
 * VideoNoteRepository 实现
 * 实现视频笔记相关的数据库操作
 */

import { IVideoNoteRepository } from '../interfaces/note/video-note-repository.interface.js';
import { VideoNote } from '../types/note.js';
import { Platform, PaginationParams, PaginationResult } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';

/**
 * VideoNoteRepository 实现类
 */
export class VideoNoteRepository implements IVideoNoteRepository {
  /**
   * 创建笔记
   */
  async createNote(note: Omit<VideoNote, 'noteId'>): Promise<string> {
    const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const videoNote: VideoNote = {
      noteId,
      ...note,
      createdAt: Date.now(),
      lastUpdate: Date.now()
    };
    await DBUtils.add(STORE_NAMES.VIDEO_NOTES, videoNote);
    return noteId;
  }

  /**
   * 批量创建笔记
   */
  async createNotes(notes: Omit<VideoNote, 'noteId'>[]): Promise<string[]> {
    const noteIds: string[] = [];
    const videoNotes: VideoNote[] = notes.map(note => {
      const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      noteIds.push(noteId);
      return {
        noteId,
        ...note,
        createdAt: Date.now(),
        lastUpdate: Date.now()
      };
    });
    await DBUtils.addBatch(STORE_NAMES.VIDEO_NOTES, videoNotes);
    return noteIds;
  }

  /**
   * 获取笔记
   */
  async getNote(noteId: string): Promise<VideoNote | null> {
    return DBUtils.get<VideoNote>(STORE_NAMES.VIDEO_NOTES, noteId);
  }

  /**
   * 获取视频的所有笔记
   */
  async getVideoNotes(
    videoId: string,
    platform: Platform,
    type?: VideoNote['type'],
    pagination?: PaginationParams
  ): Promise<PaginationResult<VideoNote>> {
    const allNotes = await DBUtils.getByIndex<VideoNote>(
      STORE_NAMES.VIDEO_NOTES,
      'videoId',
      videoId
    );

    let filtered = allNotes.filter(note => note.platform === platform);
    if (type !== undefined) {
      filtered = filtered.filter(note => note.type === type);
    }

    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);

    if (!pagination) {
      return {
        items: sorted,
        total: sorted.length,
        page: 0,
        pageSize: sorted.length,
        totalPages: 1
      };
    }

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
   * 按标签查询笔记
   */
  async getNotesByTags(
    tagIds: string[],
    platform: Platform,
    pagination: PaginationParams
  ): Promise<PaginationResult<VideoNote>> {
    const allNotes = await DBUtils.getByIndex<VideoNote>(
      STORE_NAMES.VIDEO_NOTES,
      'platform',
      platform
    );

    const filtered = allNotes.filter(note =>
      note.tagIds?.some(tagId => tagIds.includes(tagId))
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
   * 搜索笔记
   */
  async searchNotes(
    platform: Platform,
    keyword: string,
    pagination: PaginationParams
  ): Promise<PaginationResult<VideoNote>> {
    const allNotes = await DBUtils.getByIndex<VideoNote>(
      STORE_NAMES.VIDEO_NOTES,
      'platform',
      platform
    );

    const lowerKeyword = keyword.toLowerCase();
    const filtered = allNotes.filter(note =>
      note.title?.toLowerCase().includes(lowerKeyword) ||
      note.content.toLowerCase().includes(lowerKeyword)
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
   * 更新笔记
   */
  async updateNote(
    noteId: string,
    updates: Partial<Omit<VideoNote, 'noteId' | 'createdAt'>>
  ): Promise<void> {
    const existing = await this.getNote(noteId);
    if (!existing) {
      throw new Error(`Note not found: ${noteId}`);
    }

    const updated: VideoNote = {
      ...existing,
      ...updates,
      lastUpdate: Date.now()
    };

    await DBUtils.put(STORE_NAMES.VIDEO_NOTES, updated);
  }

  /**
   * 更新笔记embedding
   */
  async updateNoteEmbedding(noteId: string, embedding: number[]): Promise<void> {
    await this.updateNote(noteId, { embedding });
  }

  /**
   * 删除笔记
   */
  async deleteNote(noteId: string): Promise<void> {
    await DBUtils.delete(STORE_NAMES.VIDEO_NOTES, noteId);
  }

  /**
   * 批量删除笔记
   */
  async deleteNotes(noteIds: string[]): Promise<void> {
    await DBUtils.deleteBatch(STORE_NAMES.VIDEO_NOTES, noteIds);
  }

  /**
   * 获取笔记数量
   */
  async countNotes(
    videoId: string,
    platform: Platform,
    type?: VideoNote['type']
  ): Promise<number> {
    const result = await this.getVideoNotes(videoId, platform, type);
    return result.total;
  }
}
