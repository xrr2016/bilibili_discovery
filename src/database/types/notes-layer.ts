
/**
 * 笔记层类型定义
 * 包含视频笔记、AI总结等知识管理相关数据
 */

import type { Platform, Timestamp, ID, NoteType, Vector } from './index';

/**
 * 视频笔记
 */
export interface VideoNote {
  note_id: ID;
  platform: Platform;
  video_id: ID;

  type: NoteType;
  content: string;
  embedding?: Vector;

  // 笔记元数据
  metadata?: {
    title?: string;
    timestamp?: number;       // 笔记对应的视频时间点(秒)
    tags?: ID[];              // 笔记标签
  };

  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * 笔记查询参数
 */
export interface VideoNoteQueryParams {
  platform?: Platform;
  video_id?: ID;
  type?: NoteType;
  tag_id?: ID;
  content_contains?: string;
  start_time?: Timestamp;
  end_time?: Timestamp;
}

/**
 * 笔记搜索结果
 */
export interface NoteSearchResult {
  note: VideoNote;
  score: number;              // 相关性分数
  highlights?: string[];      // 高亮片段
}

/**
 * 笔记统计信息
 */
export interface NoteStats {
  total_notes: number;
  summary_count: number;
  manual_count: number;
  qa_count: number;
  videos_with_notes: number;
}
