/**
 * UP主交互数据结构定义
 * 定义用户与UP主的交互相关数据模型
 */

import { Platform, Timestamp, ID } from './base.js';

/**
 * 用户与UP主的交互统计
 * 记录用户对某个UP主的综合互动数据
 */
export interface UPInteraction {
  /**
   * 交互记录唯一ID
   */
  interactionId: ID;
  /**
   * 平台类型
   */
  platform: Platform;
  /**
   * UP主ID
   */
  creatorId: ID;
  /**
   * 总观看时长（秒）
   */
  totalWatchDuration: number;
  /**
   * 总观看视频次数
   */
  totalWatchCount: number;
  /**
   * 点赞次数
   */
  likeCount: number;
  /**
   * 投币次数
   */
  coinCount: number;
  /**
   * 收藏次数
   */
  favoriteCount: number;
  /**
   * 评论次数
   */
  commentCount: number;
  /**
   * 上次观看该UP视频的时间
   */
  lastWatchTime: Timestamp;
  /**
   * 首次观看该UP视频的时间
   */
  firstWatchTime: Timestamp;
  /**
   * 最后更新时间
   */
  updateTime: Timestamp;
}
