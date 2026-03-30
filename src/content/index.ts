
/**
 * Content Script 主入口
 * 整合触发器、收集器、转发器和数据处理器
 */

import { 
  VideoCollectData, 
  WatchEventCollectData, 
  FollowStatusEvent, 
  FavoriteStatusEvent, 
  UPPageData 
} from './types.js';
import { VideoPlaybackTrigger, VideoMetadataTrigger } from './triggers/video-trigger.js';
import { FollowButtonTrigger } from './triggers/follow-trigger.js';
import { FavoriteButtonTrigger } from './triggers/favorite-trigger.js';
import { VideoDataCollector } from './collectors/video-collector.ts';
import { UpDataCollector } from './collectors/up-collector.ts';
import { createDataForwarder } from './forwarder/data-forwarder.js';
import { DataProcessor } from './processors/data-processor.js';

/**
 * 视频追踪器管理器
 */
class VideoTrackerManager {
  private playbackTrigger: VideoPlaybackTrigger | null = null;
  private metadataTrigger: VideoMetadataTrigger | null = null;
  private videoCollector = new VideoDataCollector();
  private upCollector = new UpDataCollector();
  private dataProcessor = new DataProcessor();
  private forwarder = createDataForwarder();
  private bvid: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    this.bvid = this.extractBvidFromUrl(window.location.href);
    if (!this.bvid) {
      return;
    }

    console.log(`[VideoTracker] Video detected: ${this.bvid}`);

    // 等待视频元素加载
    this.waitForVideoElement();
  }

  private waitForVideoElement(): void {
    const video = this.detectVideoElement();
    if (!video) {
      console.log("[VideoTracker] Video element not found, retrying...");
      setTimeout(() => {
        const retryVideo = this.detectVideoElement();
        if (retryVideo) {
          console.log("[VideoTracker] Video element found on retry");
          this.setupTriggers(retryVideo);
        } else {
          console.log("[VideoTracker] Video element still not found, will try again later");
          setTimeout(() => this.waitForVideoElement(), 2000);
        }
      }, 1000);
      return;
    }

    this.setupTriggers(video);
  }

  private setupTriggers(video: HTMLVideoElement): void {
    if (!this.bvid) return;

    // 创建播放触发器
    this.playbackTrigger = new VideoPlaybackTrigger(video, this.bvid);
    this.playbackTrigger.onCollect((data: WatchEventCollectData) => {
      // 处理观看事件数据
      this.dataProcessor.processWatchEventData(data);
    });
    this.playbackTrigger.start();

    // 创建元数据触发器
    this.metadataTrigger = new VideoMetadataTrigger(video, this.bvid);
    this.metadataTrigger.onCollect(async (data: WatchEventCollectData) => {
      // 收集视频数据
      const videoData = this.videoCollector.collectVideoData(
        this.bvid!,
        data.videoDuration
      );

      if (videoData) {
        // 处理视频数据
        await this.dataProcessor.processVideoData(videoData);
      }
    });
    this.metadataTrigger.start();

    // 监听URL变化
    this.setupUrlWatcher();
  }

  private setupUrlWatcher(): void {
    let lastBvid = this.bvid;

    setInterval(() => {
      const currentBvid = this.extractBvidFromUrl(window.location.href);
      if (currentBvid && currentBvid !== lastBvid) {
        console.log("[VideoTracker] BVID changed, reinitializing...");
        console.log("[VideoTracker] Old BVID:", lastBvid);
        console.log("[VideoTracker] New BVID:", currentBvid);

        lastBvid = currentBvid;
        this.bvid = currentBvid;

        // 重置触发器
        if (this.playbackTrigger) {
          this.playbackTrigger.stop();
        }
        if (this.metadataTrigger) {
          this.metadataTrigger.stop();
        }

        // 重新初始化
        setTimeout(() => {
          console.log("[VideoTracker] Page should have loaded new content, reinitializing...");
          this.waitForVideoElement();
        }, 3000);
      }
    }, 4000);
  }

  private extractBvidFromUrl(url: string): string | null {
    const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  private detectVideoElement(): HTMLVideoElement | null {
    return document.querySelector("video");
  }
}

/**
 * 关注追踪器管理器
 */
class FollowTrackerManager {
  private trigger: FollowButtonTrigger;
  private collector = new UpDataCollector();
  private dataProcessor = new DataProcessor();

  constructor() {
    this.trigger = new FollowButtonTrigger();
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // 检查是否在B站页面
    if (!window.location.href.includes("bilibili.com")) {
      return;
    }

    // 检查是否在视频页面或UP主页
    const url = window.location.href;
    if (!url.includes('/video/') && !url.includes('space.bilibili.com')) {
      return;
    }

    // 设置触发器回调
    this.trigger.onCollect(async (data: FollowStatusEvent) => {
      const creatorData = this.collector.collectCreatorData();
      if (creatorData) {
        // 更新关注状态
        creatorData.isFollowing = data.isFollowing ? 1 : 0;
        creatorData.followTime = data.isFollowing ? Date.now() : 0;

        console.log("[FollowTracker] Follow status changed:", creatorData);

        // 处理UP主数据
        await this.dataProcessor.processCreatorData(creatorData);

        // 触发自定义事件，供外部监听
        window.dispatchEvent(new CustomEvent('followStatusChanged', { detail: creatorData }));
      }
    });

    // 开始监听
    this.trigger.start();
  }
}

/**
 * 收藏追踪器管理器
 */
class FavoriteTrackerManager {
  private trigger: FavoriteButtonTrigger;
  private dataProcessor = new DataProcessor();

  constructor() {
    this.trigger = new FavoriteButtonTrigger();
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // 检查是否在B站页面
    if (!window.location.href.includes("bilibili.com")) {
      return;
    }

    // 检查是否在视频页面
    const url = window.location.href;
    if (!url.includes("/video/")) {
      return;
    }

    // 设置触发器回调
    this.trigger.onCollect(async (data: FavoriteStatusEvent) => {
      console.log("[FavoriteTracker] Favorite status changed:", data);

      // 处理收藏事件数据
      await this.dataProcessor.processFavoriteEventData(data);

      // 触发自定义事件，供外部监听
      window.dispatchEvent(new CustomEvent('favoriteStatusChanged', { detail: data }));
    });

    // 开始监听
    this.trigger.start();
  }
}

/**
 * UP页面数据收集管理器
 */
class UPPageCollectorManager {
  private collector = new UpDataCollector();
  private dataProcessor = new DataProcessor();
  private mid: number | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const midMatch = window.location.href.match(/space\.bilibili\.com\/(\d+)/);
    if (!midMatch) {
      console.log("[UPPageCollector] Not a UP page, skipping");
      return;
    }

    this.mid = parseInt(midMatch[1], 10);
    console.log("[UPPageCollector] UP page detected, mid:", this.mid);

    // 延迟收集数据
    setTimeout(() => this.collectData(), 2000);
  }

  private async collectData(): Promise<void> {
    if (!this.mid) return;

    console.log("[UPPageCollector] Attempting to collect data for mid:", this.mid);

    const creatorData = this.collector.collectCreatorData();

    if (creatorData) {
      console.log("[UPPageCollector] Data collected successfully:", {
        creatorId: creatorData.creatorId,
        name: creatorData.name,
        description: creatorData.description
      });

      // 处理UP主数据
      await this.dataProcessor.processCreatorData(creatorData);

      // 同时也发送UP页面数据（用于视频列表等）
      const upPageData = this.collector.extractUPPageData();
      if (upPageData) {
        await this.dataProcessor.processUPPageData(upPageData);
      }
    } else {
      // 检查UP是否无效
      const pageTitle = document.title;
      const pageContent = document.body.innerText;

      const isInvalidUP = pageTitle.includes("啥都木有") ||
                         pageTitle.includes("UP不存在") ||
                         pageTitle.includes("账号已注销") ||
                         pageTitle.includes("账号已封禁") ||
                         pageTitle.startsWith("的个人空间-个人主页-哔哩哔哩视频") ||
                         pageContent.includes("啥都木有") ||
                         pageContent.includes("UP不存在") ||
                         pageContent.includes("账号已注销") ||
                         pageContent.includes("账号已封禁");

      if (isInvalidUP) {
        console.log("[UPPageCollector] UP appears to be invalid, sending invalid UP message");
        await this.dataProcessor.processCreatorData({
          creatorId: this.mid,
          platform: Platform.BILIBILI,
          name: "",
          avatarUrl: "",
          description: "",
          isFollowing: 0,
          followTime: 0
        });
      } else {
        console.log("[UPPageCollector] Data collection failed, retrying in 1 second...");
        setTimeout(() => this.collectData(), 1000);
      }
    }
  }
}

/**
 * 初始化所有追踪器
 */
function initializeTrackers(): void {
  try {
    // 初始化视频追踪器
    new VideoTrackerManager();

    // 初始化关注追踪器
    new FollowTrackerManager();

    // 初始化收藏追踪器
    new FavoriteTrackerManager();

    // 初始化UP页面收集器
    new UPPageCollectorManager();

    console.log("[ContentScript] All trackers initialized successfully");
  } catch (error) {
    console.error("[ContentScript] Error during initialization:", error);
    // 如果初始化出错，延迟重试
    setTimeout(initializeTrackers, 2000);
  }
}

// 确保页面完全加载后再初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTrackers);
} else {
  initializeTrackers();
}
