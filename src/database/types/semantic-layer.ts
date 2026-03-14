
/**
 * 语义层类型定义
 * 包含标签、标签映射、标签向量等语义相关数据
 */

import type { Timestamp, ID, TagSource, Vector } from './index';

/**
 * 标签信息
 */
export interface Tag {
  tag_id: ID;
  name: string;
  source: TagSource;
  embedding?: Vector;          // 标签向量
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * 标签映射
 */
export interface TagAlias {
  alias_id: ID;
  alias_name: string;          // 别名
  target_tag_id: ID;           // 目标标签ID
  similarity: number;          // 相似度(0-1)
  source: 'manual' | 'auto';   // 来源
  created_at: Timestamp;
}

/**
 * 标签统计信息
 */
export interface TagStats {
  tag_id: ID;
  video_count: number;         // 关联视频数
  creator_count: number;       // 关联创作者数
  watch_count: number;         // 观看次数
  total_watch_time: number;    // 总观看时长
  last_used: Timestamp;        // 最后使用时间
}

/**
 * 标签相似度结果
 */
export interface TagSimilarity {
  tag_id: ID;
  similarity: number;          // 相似度(0-1)
}

/**
 * 标签查询参数
 */
export interface TagQueryParams {
  source?: TagSource;
  name_contains?: string;
  has_embedding?: boolean;
}

/**
 * 标签映射查询参数
 */
export interface TagAliasQueryParams {
  target_tag_id?: ID;
  alias_name_contains?: string;
  source?: 'manual' | 'auto';
  min_similarity?: number;
}
