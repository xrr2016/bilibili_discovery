
/**
 * 笔记管理接口
 * 负责管理视频笔记、AI总结等知识管理相关数据
 */

import type {
  VideoNote,
  VideoNoteQueryParams,
  NoteSearchResult,
  NoteStats,
  DBResult,
  PaginationParams,
  PaginationResult,
  ID,
  Vector
} from '../types';

/**
 * 笔记管理接口
 */
export interface INotesManager {
  /**
   * 创建笔记
   * @param note 笔记信息
   * @returns 操作结果
   */
  createNote(note: Omit<VideoNote, 'note_id' | 'created_at' | 'updated_at'>): Promise<DBResult<VideoNote>>;

  /**
   * 获取笔记
   * @param noteId 笔记ID
   * @returns 笔记信息
   */
  getNote(noteId: ID): Promise<DBResult<VideoNote>>;

  /**
   * 批量获取笔记
   * @param noteIds 笔记ID列表
   * @returns 笔记信息列表
   */
  getNotes(noteIds: ID[]): Promise<DBResult<VideoNote[]>>;

  /**
   * 查询笔记列表
   * @param params 查询参数
   * @param pagination 分页参数
   * @returns 笔记列表
   */
  queryNotes(
    params: VideoNoteQueryParams,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<VideoNote>>>;

  /**
   * 更新笔记
   * @param noteId 笔记ID
   * @param updates 更新内容
   * @returns 操作结果
   */
  updateNote(
    noteId: ID,
    updates: Partial<Pick<VideoNote, 'content' | 'embedding' | 'metadata'>>
  ): Promise<DBResult<VideoNote>>;

  /**
   * 删除笔记
   * @param noteId 笔记ID
   * @returns 操作结果
   */
  deleteNote(noteId: ID): Promise<DBResult<void>>;

  /**
   * 获取视频的所有笔记
   * @param videoId 视频ID
   * @param pagination 分页参数
   * @returns 笔记列表
   */
  getVideoNotes(
    videoId: ID,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<VideoNote>>>;

  /**
   * 语义搜索笔记
   * @param query 查询文本或向量
   * @param limit 返回数量
   * @param filters 过滤条件
   * @returns 搜索结果
   */
  searchNotes(
    query: string | Vector,
    limit?: number,
    filters?: {
      platform?: string;
      type?: 'summary' | 'manual' | 'qa';
      tag_id?: ID;
    }
  ): Promise<DBResult<NoteSearchResult[]>>;

  /**
   * 更新笔记向量
   * @param noteId 笔记ID
   * @param embedding 向量
   * @returns 操作结果
   */
  updateNoteEmbedding(
    noteId: ID,
    embedding: Vector
  ): Promise<DBResult<void>>;

  /**
   * 获取笔记统计
   * @returns 笔记统计
   */
  getNoteStats(): Promise<DBResult<NoteStats>>;
}
