/**
 * NoteSegmentRepository 实现
 * 实现笔记分段相关的数据库操作
 */

import { INoteSegmentRepository } from '../interfaces/note/note-segment-repository.interface.js';
import { NoteSegment } from '../types/note.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';

/**
 * NoteSegmentRepository 实现类
 */
export class NoteSegmentRepository implements INoteSegmentRepository {
  /**
   * 创建分段
   */
  async createSegment(segment: Omit<NoteSegment, 'segmentId'>): Promise<string> {
    const segmentId = `segment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const noteSegment: NoteSegment = {
      segmentId,
      ...segment,
      createdAt: Date.now()
    };
    await DBUtils.add(STORE_NAMES.NOTE_SEGMENTS, noteSegment);
    return segmentId;
  }

  /**
   * 批量创建分段
   */
  async createSegments(segments: Omit<NoteSegment, 'segmentId'>[]): Promise<string[]> {
    const segmentIds: string[] = [];
    const noteSegments: NoteSegment[] = segments.map(segment => {
      const segmentId = `segment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      segmentIds.push(segmentId);
      return {
        segmentId,
        ...segment,
        createdAt: Date.now()
      };
    });
    await DBUtils.addBatch(STORE_NAMES.NOTE_SEGMENTS, noteSegments);
    return segmentIds;
  }

  /**
   * 获取分段
   */
  async getSegment(segmentId: string): Promise<NoteSegment | null> {
    return DBUtils.get<NoteSegment>(STORE_NAMES.NOTE_SEGMENTS, segmentId);
  }

  /**
   * 获取笔记的所有分段
   */
  async getNoteSegments(noteId: string): Promise<NoteSegment[]> {
    const allSegments = await DBUtils.getByIndex<NoteSegment>(
      STORE_NAMES.NOTE_SEGMENTS,
      'noteId',
      noteId
    );

    return allSegments.sort((a, b) => a.order - b.order);
  }

  /**
   * 更新分段
   */
  async updateSegment(
    segmentId: string,
    updates: Partial<Omit<NoteSegment, 'segmentId' | 'createdAt'>>
  ): Promise<void> {
    const existing = await this.getSegment(segmentId);
    if (!existing) {
      throw new Error(`Segment not found: ${segmentId}`);
    }

    const updated: NoteSegment = {
      ...existing,
      ...updates
    };

    await DBUtils.put(STORE_NAMES.NOTE_SEGMENTS, updated);
  }

  /**
   * 更新分段embedding
   */
  async updateSegmentEmbedding(segmentId: string, embedding: number[]): Promise<void> {
    await this.updateSegment(segmentId, { embedding });
  }

  /**
   * 删除分段
   */
  async deleteSegment(segmentId: string): Promise<void> {
    await DBUtils.delete(STORE_NAMES.NOTE_SEGMENTS, segmentId);
  }

  /**
   * 删除笔记的所有分段
   */
  async deleteNoteSegments(noteId: string): Promise<void> {
    const allSegments = await DBUtils.getByIndex<NoteSegment>(
      STORE_NAMES.NOTE_SEGMENTS,
      'noteId',
      noteId
    );

    const segmentIds = allSegments.map(segment => segment.segmentId);
    if (segmentIds.length > 0) {
      await DBUtils.deleteBatch(STORE_NAMES.NOTE_SEGMENTS, segmentIds);
    }
  }

  /**
   * 批量删除分段
   */
  async deleteSegments(segmentIds: string[]): Promise<void> {
    await DBUtils.deleteBatch(STORE_NAMES.NOTE_SEGMENTS, segmentIds);
  }

  /**
   * 获取分段数量
   */
  async countSegments(noteId: string): Promise<number> {
    const segments = await this.getNoteSegments(noteId);
    return segments.length;
  }

  /**
   * 重新排序分段
   */
  async reorderSegments(noteId: string, segmentOrders: Map<string, number>): Promise<void> {
    const allSegments = await this.getNoteSegments(noteId);

    const updatedSegments = allSegments.map(segment => ({
      ...segment,
      order: segmentOrders.get(segment.segmentId) ?? segment.order
    }));

    // 确保顺序连续
    updatedSegments.sort((a, b) => a.order - b.order);
    updatedSegments.forEach((segment, index) => {
      segment.order = index;
    });

    await DBUtils.putBatch(STORE_NAMES.NOTE_SEGMENTS, updatedSegments);
  }
}
