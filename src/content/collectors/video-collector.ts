
/**
 * 视频数据收集器
 * 负责从页面中提取视频相关数据
 */

import { VideoCollectData, WatchEventCollectData } from '../types.js';

/**
 * 视频元数据接口
 */
interface VideoMeta {
  title: string;
  upMid?: number;
  upName?: string;
  upFace?: string;
  tags: string[];
  description?: string;
  publishTime?: number;
  coverUrl?: string;
}

/**
 * 视频数据收集器
 */
export class VideoDataCollector {
  /**
   * 从页面提取视频元数据
   */
  extractVideoMeta(): VideoMeta {
    const title = this.extractTitle();
    const upMid = this.extractUpMid();
    const upName = this.extractUpName();
    const upFace = this.extractUpFace();
    const tags = this.extractTags();
    const description = this.extractDescription();
    const publishTime = this.extractPublishTime();
    const coverUrl = this.extractCoverUrl();

    return { title, upMid, upName, upFace, tags, description, publishTime, coverUrl };
  }

  /**
   * 收集视频数据
   */
  collectVideoData(bv: string, duration: number): VideoCollectData | null {
    const meta = this.extractVideoMeta();
    if (!meta.title) {
      return null;
    }

    return {
      bv,
      title: meta.title,
      description: meta.description,
      duration,
      publishTime: meta.publishTime,
      tags: meta.tags,
      coverUrl: meta.coverUrl,
      creatorId: meta.upMid || 0,
      creatorName: meta.upName,
      creatorAvatarUrl: meta.upFace
    };
  }

  /**
   * 收集观看事件数据
   */
  collectWatchEventData(
    bv: string,
    watchDuration: number,
    videoDuration: number,
    progress: number,
    isComplete: number
  ): WatchEventCollectData {
    const now = Date.now();
    const meta = this.extractVideoMeta();

    return {
      bv,
      watchTime: now - watchDuration * 1000,
      watchDuration,
      videoDuration,
      progress,
      isComplete,
      endTime: now,
      creatorId: meta.upMid
    };
  }

  /**
   * 提取视频标题
   */
  private extractTitle(): string {
    // 新版页面选择器
    const titleSelectors = [
      ".video-info-container .video-title",
      ".video-info-title .video-title",
      "h1.video-title",
      ".video-title"
    ];

    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      const text = el?.textContent?.trim();
      if (text) {
        return text;
      }
    }

    // 回退到页面标题
    const docTitle = document.title || "";
    return docTitle.split("_")[0].split("-")[0].trim();
  }

  /**
   * 提取UP主ID
   */
  private extractUpMid(): number | undefined {
    const ownerSelectors = [
      ".up-name[href*='space.bilibili.com']",
      ".author-name[href*='space.bilibili.com']",
      ".staff-name[href*='space.bilibili.com']",
      ".up-detail-top a[href*='space.bilibili.com']",
      ".video-info-author a[href*='space.bilibili.com']"
    ];

    for (const selector of ownerSelectors) {
      const upLink = document.querySelector(selector) as HTMLAnchorElement | null;
      const mid = this.extractMidFromSpaceLink(upLink?.href);
      if (mid) {
        return mid;
      }
    }

    return undefined;
  }

  /**
   * 从链接中提取UP主ID
   */
  private extractMidFromSpaceLink(link: string | null | undefined): number | undefined {
    if (!link) {
      return undefined;
    }
    const match = link.match(/space\.bilibili\.com\/(\d+)/);
    if (!match) {
      return undefined;
    }
    const mid = Number(match[1]);
    return Number.isFinite(mid) && mid > 0 ? mid : undefined;
  }

  /**
   * 提取UP主名称
   */
  private extractUpName(): string | undefined {
    const upNameElement = document.querySelector(
      '.up-name, .author-name, [class*="author"], [class*="up-name"], [class*="uploader"]'
    );
    return upNameElement?.textContent?.trim();
  }

  /**
   * 提取UP主头像
   */
  private extractUpFace(): string | undefined {
    console.log("[VideoCollector] Extracting UP face from DOM");

    // 尝试多个选择器来查找头像元素
    const selectors = [
      '.bili-avatar',
      'bili-avatar-img bili-avatar-face bili-avatar-img-radius'
    ];

    // 首先尝试使用XPath查找头像
    console.log("[VideoCollector] Trying to find avatar with XPath");
    try {
      const xpathResult = document.evaluate(
        '/html/body/div[2]/div[2]/div[2]/div/div[1]/div[1]/div[1]/div/a/div/img',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const imgElement = xpathResult.singleNodeValue as HTMLImageElement | null;
      if (imgElement) {
        let upFace = imgElement.src;
        console.log("[VideoCollector] UP face from XPath:", upFace);
        if (upFace && upFace.startsWith('//')) {
          upFace = 'https:' + upFace;
          console.log("[VideoCollector] UP face after adding protocol:", upFace);
        }
        return upFace;
      }
    } catch (error) {
      console.error("[VideoCollector] Error finding avatar with XPath:", error);
    }

    // 如果XPath没有找到，尝试CSS选择器
    console.log("[VideoCollector] XPath failed, trying CSS selectors");
    for (const selector of selectors) {
      console.log("[VideoCollector] Trying selector:", selector);
      const element = document.querySelector(selector) as HTMLImageElement | null;
      if (element) {
        console.log("[VideoCollector] Found element with selector:", selector, "Tag:", element.tagName);

        let upFace = "";
        if (element.tagName === 'IMG') {
          upFace = element.src;
          console.log("[VideoCollector] UP face from img element:", upFace);
        } else {
          const img = element.querySelector('img') as HTMLImageElement | null;
          if (img) {
            upFace = img.src;
            console.log("[VideoCollector] UP face from container img:", upFace);
          }
        }

        if (upFace && upFace.startsWith('//')) {
          upFace = 'https:' + upFace;
          console.log("[VideoCollector] UP face after adding protocol:", upFace);
        }

        if (upFace) {
          return upFace;
        }
      }
    }

    console.log("[VideoCollector] Final UP face value: undefined");
    return undefined;
  }

  /**
   * 提取视频标签
   */
  private extractTags(): string[] {
    const tags = new Set<string>();

    // 新版页面标签选择器
    const tagPanel = document.querySelector('.tag-panel');
    if (tagPanel) {
      // 从tag-panel中提取所有标签
      const tagElements = tagPanel.querySelectorAll('.tag-link .tag-txt');
      for (const el of Array.from(tagElements)) {
        const text = el.textContent?.trim();
        if (text) {
          tags.add(text);
        }
      }
    }

    // 如果新版选择器没有找到，尝试旧版选择器
    if (tags.size === 0) {
      const oldTagElements = document.querySelectorAll(
        'a[href*="/tag/"], a[href*="search?keyword="], .tag-link, .tag-item'
      );

      for (const el of Array.from(oldTagElements)) {
        const text = el.textContent?.trim();
        if (text) {
          tags.add(text);
        }
      }
    }

    return Array.from(tags);
  }

  /**
   * 提取视频描述
   */
  private extractDescription(): string | undefined {
    // 从准确的描述容器中提取
    const descContainer = document.querySelector('#v_desc .desc-info-text');
    if (descContainer) {
      const text = descContainer.textContent?.trim();
      if (text && text.length > 0) {
        return text;
      }
    }

    // 回退到其他可能的位置
    const fallbackSelectors = [
      '.video-info-container .video-desc',
      '.video-desc',
      '.desc-info-text',
      '.video-info-detail-list'
    ];

    for (const selector of fallbackSelectors) {
      const el = document.querySelector(selector);
      const text = el?.textContent?.trim();
      if (text && text.length > 0) {
        return text;
      }
    }

    return undefined;
  }

  /**
   * 提取视频发布时间
   */
  private extractPublishTime(): number | undefined {
    // 从准确的发布时间元素中提取
    const pubdateElement = document.querySelector('.pubdate-ip .pubdate-ip-text');
    if (pubdateElement) {
      const text = pubdateElement.textContent?.trim();
      if (text) {
        // 尝试解析时间字符串
        const date = new Date(text);
        if (!isNaN(date.getTime())) {
          return date.getTime();
        }
      }
    }

    // 回退到其他可能的位置
    const fallbackSelectors = [
      '.pubdate-ip-text',
      '.pubdate-text',
      '.video-info-detail-list .pubdate'
    ];

    for (const selector of fallbackSelectors) {
      const el = document.querySelector(selector);
      const text = el?.textContent?.trim();
      if (text) {
        // 尝试解析时间字符串
        const date = new Date(text);
        if (!isNaN(date.getTime())) {
          return date.getTime();
        }
      }
    }

    return undefined;
  }

  /**
   * 提取视频封面URL
   */
  private extractCoverUrl(): string | undefined {
    // 尝试从多个可能的位置提取封面
    const coverSelectors = [
      '.video-info-container .video-cover img',
      '.video-cover img',
      '.bili-video-card__cover img',
      'video.poster'
    ];

    for (const selector of coverSelectors) {
      const img = document.querySelector(selector) as HTMLImageElement | null;
      if (img) {
        return img.src || img.dataset.src;
      }
    }

    return undefined;
  }
}
