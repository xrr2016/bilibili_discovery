
/**
 * 内容层类型定义
 * 包含创作者(UP主/Channel)和视频的基础信息
 */

import type { Platform, Timestamp, ID, TagSource } from './index';

/**
 * 创作者标签权重
 */
export interface CreatorTagWeight {
  tag_id: ID;
  weight: number;
  source: TagSource;
  count: number;
  created_at: Timestamp;
}

/**
 * 创作者(UP主/Channel)信息
 */
export interface Creator {
  creator_id: ID;
  platform: Platform;
  name: string;
  avatar: string; // 头像URL
  is_logout: boolean;
  description: string;
  created_at: Timestamp;
  follow_time: Timestamp;
  is_following: boolean;
  tag_weights: CreatorTagWeight[];
}

/**
 * 视频标签关联
 */
export interface VideoTag {
  tag_id: ID;
  source: TagSource;
  confidence: number; // 置信度(0-1)
}

/**
 * 视频基础信息
 */
export interface Video {
  video_id: ID;
  platform: Platform;
  creator_id: ID;

  title: string;
  description: string;

  duration: number; // 视频时长(秒)
  publish_time: Timestamp;

  tags: VideoTag[];

  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * 收藏夹信息
 */
export interface Collection {
  collection_id: ID;
  platform: Platform;
  name: string;
  video_ids: ID[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * 创作者查询参数
 */
export interface CreatorQueryParams {
  platform?: Platform;
  is_following?: boolean;
  tag_id?: ID;
  name_contains?: string;
}

/**
 * 视频查询参数
 */
export interface VideoQueryParams {
  platform?: Platform;
  creator_id?: ID;
  tag_ids?: ID[];
  start_time?: Timestamp;
  end_time?: Timestamp;
  title_contains?: string;
  min_duration?: number;
  max_duration?: number;
}

/**
 * 收藏夹查询参数
 */
export interface CollectionQueryParams {
  platform?: Platform;
  name_contains?: string;
  has_video_id?: ID;
}
