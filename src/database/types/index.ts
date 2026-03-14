
/**
 * 核心类型定义
 */

// 平台类型
export type Platform = 'bilibili' | 'youtube';

// 通用时间戳类型
export type Timestamp = number;

// 通用ID类型
export type ID = string;

// 标签来源
export type TagSource = 'user' | 'system';

// 视频来源
export type VideoSource = 'recommend' | 'search' | 'subscription' | 'direct' | 'other';

// 互动类型
export type InteractionType = 'like' | 'comment' | 'favorite' | 'share';

// 笔记类型
export type NoteType = 'summary' | 'manual' | 'qa';

// 兴趣权重类型
export interface InterestScore {
  tag_id: ID;
  score: number;
  short_term_score: number;
  long_term_score: number;
  last_update: Timestamp;
}

// 分区类型
export interface Category {
  id: ID;
  name: string;
  tag_ids: ID[];
  created_at: Timestamp;
}

// 通用分页参数
export interface PaginationParams {
  page: number;
  page_size: number;
}

// 通用分页结果
export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// 数据库操作结果
export interface DBResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 向量表示
export interface Vector {
  dimensions: number;
  values: number[];
}
