
/**
 * Content Script 类型定义
 * 定义所有收集器、触发器和转发器使用的通用类型
 * 这些类型与数据库类型保持一致
 */

import { 
  Video, 
  VideoStats, 
  WatchEvent as DBWatchEvent,
  Creator,
  Platform,
  Timestamp,
  ID
} from '../database/types/index.js';

/**
 * 视频收集数据
 * 从页面收集的视频基础信息
 */
export interface VideoCollectData {
  /** 视频BV号 */
  bv: string;
  /** 视频标题 */
  title: string;
  /** 视频描述 */
  description?: string;
  /** 视频时长（秒） */
  duration: number;
  /** 视频发布时间 */
  publishTime?: Timestamp;
  /** 视频标签列表（标签名称） */
  tags: string[];
  /** 封面图片URL */
  coverUrl?: string;
  /** UP主ID */
  creatorId: number;
  /** UP主名称 */
  creatorName?: string;
  /** UP主头像URL */
  creatorAvatarUrl?: string;
}

/**
 * 观看事件收集数据
 * 从页面收集的观看行为数据
 */
export interface WatchEventCollectData {
  /** 视频BV号 */
  bv: string;
  /** 观看开始时间 */
  watchTime: Timestamp;
  /** 实际观看时长（秒） */
  watchDuration: number;
  /** 视频总时长（秒） */
  videoDuration: number;
  /** 观看进度（0-1之间的数值） */
  progress: number;
  /** 是否完整观看 */
  isComplete: number;
  /** 最近一次观看结束时间 */
  endTime: Timestamp;
  /** UP主ID */
  creatorId?: number;
}

/**
 * UP主收集数据
 * 从页面收集的UP主信息
 */
export interface CreatorCollectData {
  /** UP主ID */
  creatorId: number;
  /** 平台类型 */
  platform: Platform;
  /** UP主名称 */
  name: string;
  /** 头像URL */
  avatarUrl: string;
  /** UP主简介 */
  description: string;
  /** 是否关注 */
  isFollowing: number;
  /** 关注时间 */
  followTime?: Timestamp;
}

/**
 * 关注状态事件
 */
export interface FollowStatusEvent {
  /** UP主信息 */
  creator: Partial<CreatorCollectData>;
  /** 是否已关注 */
  isFollowing: boolean;
  /** 事件时间戳 */
  timestamp: Timestamp;
}

/**
 * 收藏状态事件
 */
export interface FavoriteStatusEvent {
  /** 视频BV号 */
  bv: string;
  /** 视频标题 */
  title: string;
  /** 操作类型 */
  action: "add" | "remove";
  /** 事件时间戳 */
  timestamp: Timestamp;
}

/**
 * UP页面数据
 */
export interface UPPageData {
  /** UP主ID */
  mid: number;
  /** UP主名称 */
  name: string;
  /** UP主简介 */
  sign: string;
  /** 头像URL */
  face: string;
  /** 视频列表 */
  videos: Array<{
    bvid: string;
    title: string;
    play: number;
    duration: number;
  }>;
  /** 页面文本内容 */
  pageText: string;
}

/**
 * 数据转发接口
 */
export interface DataForwarder {
  /** 发送数据到后台 */
  send(type: string, data: any): void;
}
