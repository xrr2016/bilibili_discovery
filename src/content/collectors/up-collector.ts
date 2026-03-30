
/**
 * UP主数据收集器
 * 负责从页面中提取UP主相关信息
 */

import { FollowStatusEvent, UPPageData, CreatorCollectData, Platform } from '../types.js';

/**
 * UP主信息接口
 */
interface UpInfo {
  creatorId: number;
  name: string;
  avatarUrl: string;
  description: string;
  isFollowing: number;
}

/**
 * UP主数据收集器
 */
export class UpDataCollector {
  /**
   * 从当前页面提取UP主信息
   */
  extractUpInfo(): Partial<CreatorCollectData> | null {
    const url = window.location.href;

    if (url.includes('/video/')) {
      return this.extractFromVideoPage();
    }

    if (url.includes('space.bilibili.com')) {
      return this.extractFromSpacePage();
    }

    return null;
  }

  /**
   * 收集UP主数据
   */
  collectCreatorData(): CreatorCollectData | null {
    const upInfo = this.extractUpInfo();
    if (!upInfo || !upInfo.creatorId) {
      return null;
    }

    return {
      creatorId: upInfo.creatorId,
      platform: Platform.BILIBILI,
      name: upInfo.name || '',
      avatarUrl: upInfo.avatarUrl || '',
      description: upInfo.description || '',
      isFollowing: upInfo.isFollowing,
      followTime: upInfo.followTime
    };
  }

  /**
   * 填充关注状态事件的UP主信息
   */
  enrichFollowStatus(event: FollowStatusEvent): FollowStatusEvent {
    const upInfo = this.extractUpInfo();
    return {
      ...event,
      creator: {
        ...event.creator,
        ...upInfo
      }
    };
  }

  /**
   * 从视频播放页面提取UP主信息
   */
  private extractFromVideoPage(): Partial<FollowStatusEvent['creator']> | null {
    try {
      const upInfoContainer = document.querySelector('.up-info-container');
      if (!upInfoContainer) {
        return null;
      }

      // 提取UID
      let creatorId: number | null = null;

      const avatarLink = upInfoContainer.querySelector('.up-avatar');
      if (avatarLink && avatarLink instanceof HTMLAnchorElement) {
        const href = avatarLink.href;
        const match = href.match(/space\.bilibili\.com\/(\d+)/);
        if (match) {
          creatorId = parseInt(match[1], 10);
        }
      }

      if (!creatorId) {
        const nameLink = upInfoContainer.querySelector('.up-name');
        if (nameLink && nameLink instanceof HTMLAnchorElement) {
          const href = nameLink.href;
          const match = href.match(/space\.bilibili\.com\/(\d+)/);
          if (match) {
            creatorId = parseInt(match[1], 10);
          }
        }
      }

      if (!creatorId || creatorId <= 0) {
        return null;
      }

      // 提取UP主名字
      const nameElement = upInfoContainer.querySelector('.up-name');
      const name = nameElement?.textContent?.trim() || '';

      // 提取头像URL
      let avatarUrl = '';
      const avatarImg = upInfoContainer.querySelector('.bili-avatar-img');
      if (avatarImg instanceof HTMLImageElement) {
        avatarUrl = avatarImg.src || avatarImg.dataset.src || '';
      }

      // 提取简介
      const descElement = upInfoContainer.querySelector('.up-description');
      const description = descElement?.textContent?.trim() || '';

      // 提取是否关注
      let isFollowing = 0;
      const followBtn = upInfoContainer.querySelector('.follow-btn');
      if (followBtn) {
        isFollowing = followBtn.classList.contains('following') ? 1 : 0;
      }

      return {
        creatorId,
        name,
        avatarUrl,
        description,
        isFollowing,
        followTime: isFollowing ? Date.now() : 0
      };
    } catch (error) {
      console.error('[UpCollector] 提取UP主信息失败:', error);
      return null;
    }
  }

  /**
   * 从UP主页提取UP主信息
   */
  private extractFromSpacePage(): Partial<FollowStatusEvent['creator']> | null {
    try {
      const urlMatch = window.location.href.match(/space\.bilibili\.com\/(\d+)/);
      if (!urlMatch) {
        return null;
      }
      const creatorId = parseInt(urlMatch[1], 10);
      if (!creatorId || creatorId <= 0) {
        return null;
      }

      // 提取UP主名字
      let name = '';
      const titleEl = document.querySelector('title');
      if (titleEl) {
        const titleText = titleEl.textContent?.trim() ?? "";
        const nameMatch = titleText.match(/^(.+)的个人空间/);
        if (nameMatch) {
          name = nameMatch[1];
        }
      }

      // 提取简介
      let description = '';
      const signEl = document.querySelector('.sign-content');
      if (!signEl) {
        const altSignEl = document.querySelector('.user-info .sign');
        if (altSignEl) {
          description = altSignEl.textContent?.trim() ?? "";
        }
      } else {
        description = signEl.textContent?.trim() ?? "";
      }

      // 提取头像URL
      let avatarUrl = '';
      const faceEl = document.querySelector('.avatar img');
      if (!faceEl) {
        const altFaceEl = document.querySelector('.h-avatar img');
        if (altFaceEl instanceof HTMLImageElement) {
          avatarUrl = altFaceEl.src;
        }
      } else if (faceEl instanceof HTMLImageElement) {
        avatarUrl = faceEl.src;
      }

      // 提取是否关注
      let isFollowing = 0;
      const followBtn = document.querySelector('.space-follow-btn');
      if (followBtn) {
        isFollowing = followBtn.classList.contains('gray') ? 1 : 0;
      }

      return {
        creatorId,
        name,
        avatarUrl,
        description,
        isFollowing,
        followTime: isFollowing ? Date.now() : 0
      };
    } catch (error) {
      console.error('[UpCollector] 提取UP主信息失败:', error);
      return null;
    }
  }

  /**
   * 从UP主页提取完整数据
   */
  extractUPPageData(): UPPageData | null {
    const midMatch = window.location.href.match(/space\.bilibili\.com\/(\d+)/);
    if (!midMatch) {
      return null;
    }
    const mid = parseInt(midMatch[1], 10);

    // 尝试从 __INITIAL_STATE__ 提取
    const data = this.extractFromInitialState();
    if (data) {
      return data;
    }

    // 回退到DOM提取
    return this.extractFromDOM(mid);
  }

  /**
   * 从 __INITIAL_STATE__ 提取数据
   */
  private extractFromInitialState(): UPPageData | null {
    const win = window as unknown as {
      __INITIAL_STATE__?: {
        space?: {
          mid?: number;
          name?: string;
          sign?: string;
          face?: string;
          videoList?: {
            list?: {
              vlist?: Array<{
                bvid: string;
                title: string;
                play: number;
                length: string;
              }>;
            };
          };
        };
      };
    };

    const space = win.__INITIAL_STATE__?.space;
    if (!space?.mid) {
      return null;
    }

    const videos = (space.videoList?.list?.vlist ?? []).slice(0, 10).map(v => ({
      bvid: v.bvid,
      title: v.title,
      play: v.play,
      duration: this.parseDuration(v.length)
    }));

    // 提取视频标题
    const titleElements = document.querySelectorAll('.bili-video-card__title');
    const videoTitles: string[] = [];
    for (let i = 0; i < titleElements.length; i++) {
      const titleText = titleElements[i].textContent?.trim();
      if (titleText) {
        videoTitles.push(titleText);
      }
    }

    const pageText = videoTitles.join(" | ");

    return {
      mid: space.mid,
      name: space.name ?? "",
      sign: space.sign ?? "",
      face: space.face ?? "",
      videos,
      pageText
    };
  }

  /**
   * 从DOM提取数据
   */
  private extractFromDOM(mid: number): UPPageData | null {
    // 提取名称
    let name = "";
    const titleEl = document.querySelector('title');
    if (titleEl) {
      const titleText = titleEl.textContent?.trim() ?? "";
      const nameMatch = titleText.match(/^(.+)的个人空间/);
      if (nameMatch) {
        name = nameMatch[1];
      }
    }

    // 提取简介
    let sign = "";
    const signEl = document.querySelector('.sign-content');
    if (!signEl) {
      const altSignEl = document.querySelector('.user-info .sign');
      if (altSignEl) {
        sign = altSignEl.textContent?.trim() ?? "";
      }
    } else {
      sign = signEl.textContent?.trim() ?? "";
    }

    // 提取头像
    let face = "";
    const faceEl = document.querySelector('.avatar img');
    if (!faceEl) {
      const altFaceEl = document.querySelector('.h-avatar img');
      if (altFaceEl instanceof HTMLImageElement) {
        face = altFaceEl.src;
      }
    } else if (faceEl instanceof HTMLImageElement) {
      face = faceEl.src;
    }

    // 提取视频列表
    const videoItems = document.querySelectorAll('.video-item');
    const videos: Array<{
      bvid: string;
      title: string;
      play: number;
      duration: number;
    }> = [];

    for (let i = 0; i < Math.min(videoItems.length, 10); i++) {
      const item = videoItems[i];
      const linkEl = item.querySelector('a');
      const bvidMatch = linkEl?.getAttribute('href')?.match(/\/video\/(BV[\w]+)/);
      const bvid = bvidMatch ? bvidMatch[1] : "";
      const titleEl = item.querySelector('.title');
      const title = titleEl?.textContent?.trim() ?? "";
      const playEl = item.querySelector('.play-icon');
      const playText = playEl?.textContent?.trim() ?? "0";
      const play = parseFloat(playText.replace(/[^\d.]/g, "")) || 0;
      const durationEl = item.querySelector('.duration');
      const durationText = durationEl?.textContent?.trim() ?? "0:00";
      const duration = this.parseDuration(durationText);

      if (bvid && title) {
        videos.push({ bvid, title, play, duration });
      }
    }

    // 提取视频标题
    const titleElements = document.querySelectorAll('.bili-video-card__title');
    const videoTitles: string[] = [];
    for (let i = 0; i < titleElements.length; i++) {
      const titleText = titleElements[i].textContent?.trim();
      if (titleText) {
        videoTitles.push(titleText);
      }
    }

    const pageText = videoTitles.join(" | ");

    // 检查是否有有效数据
    if (!name && videos.length === 0 && videoTitles.length === 0) {
      return null;
    }

    return {
      mid,
      name,
      sign,
      face,
      videos,
      pageText
    };
  }

  /**
   * 解析时长字符串
   */
  private parseDuration(length: string): number {
    const parts = length.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }
}
