
/**
 * 行为层类型定义
 * 包含用户观看行为、互动行为和搜索行为
 */

import type { Platform, Timestamp, ID, VideoSource, InteractionType } from './index';

/**
 * 观看事件
 */
export interface WatchEvent {
  event_id: ID;
  platform: Platform;
  video_id: ID;
  creator_id: ID;

  watch_time: Timestamp;      // 观看开始时间
  watch_duration: number;     // 实际观看时长(秒)
  video_duration: number;     // 视频总时长(秒)
  progress: number;           // 观看比例(0-1)
  source: VideoSource;        // 观看来源

  created_at: Timestamp;
}

/**
 * 互动事件
 */
export interface InteractionEvent {
  event_id: ID;
  platform: Platform;
  video_id: ID;

  type: InteractionType;      // 互动类型
  timestamp: Timestamp;       // 互动时间

  // 可选的互动详情
  details?: {
    comment_id?: ID;          // 评论ID(如果是评论)
    comment_content?: string; // 评论内容
  };

  created_at: Timestamp;
}

/**
 * 搜索事件
 */
export interface SearchEvent {
  event_id: ID;

  query: string;              // 搜索关键词
  timestamp: Timestamp;       // 搜索时间
  result_click_video?: ID;    // 点击的视频ID
  platform?: Platform;        // 搜索平台

  // 搜索结果统计
  result_stats?: {
    total_results: number;
    clicked_position?: number;
  };

  created_at: Timestamp;
}

/**
 * 观看事件查询参数
 */
export interface WatchEventQueryParams {
  platform?: Platform;
  video_id?: ID;
  creator_id?: ID;
  source?: VideoSource;
  start_time?: Timestamp;
  end_time?: Timestamp;
  min_progress?: number;
  max_progress?: number;
}

/**
 * 互动事件查询参数
 */
export interface InteractionEventQueryParams {
  platform?: Platform;
  video_id?: ID;
  type?: InteractionType;
  start_time?: Timestamp;
  end_time?: Timestamp;
}

/**
 * 搜索事件查询参数
 */
export interface SearchEventQueryParams {
  platform?: Platform;
  query_contains?: string;
  start_time?: Timestamp;
  end_time?: Timestamp;
  has_result_click?: boolean;
}

/**
 * 观看统计结果
 */
export interface WatchStats {
  total_watch_time: number;       // 总观看时长
  total_watch_count: number;      // 总观看次数
  unique_videos: number;          // 唯一视频数
  average_progress: number;       // 平均观看进度
  time_distribution: {             // 时间分布
    hour: number;
    count: number;
  }[];
}

/**
 * 互动统计结果
 */
export interface InteractionStats {
  like_count: number;
  comment_count: number;
  favorite_count: number;
  share_count: number;
  total_interactions: number;
}
