
/**
 * 关注状态触发器
 * 负责监听关注按钮状态变化，决定何时触发关注数据的收集
 */

import { FollowStatusEvent } from '../types.js';

/**
 * 关注触发器接口
 */
export interface FollowTrigger {
  /** 开始监听关注事件 */
  start(): void;
  /** 停止监听关注事件 */
  stop(): void;
  /** 设置数据收集回调 */
  onCollect(callback: (data: FollowStatusEvent) => void): void;
}

/**
 * 关注按钮触发器
 * 监听关注按钮状态变化
 */
export class FollowButtonTrigger implements FollowTrigger {
  private callbacks: Array<(data: FollowStatusEvent) => void> = [];
  private observer: MutationObserver | null = null;
  private followBtn: HTMLElement | null = null;
  private isFollowing = false;
  private isRunning = false;

  constructor() {
    this.setupObserver();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.detectAndObserveButton();
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  onCollect(callback: (data: FollowStatusEvent) => void): void {
    this.callbacks.push(callback);
  }

  private detectAndObserveButton(): void {
    const url = window.location.href;

    // 根据页面类型选择不同的关注按钮
    if (url.includes('/video/')) {
      this.followBtn = document.querySelector('.follow-btn');
    } else if (url.includes('space.bilibili.com')) {
      this.followBtn = document.querySelector('.space-follow-btn');
    }

    if (!this.followBtn) {
      console.log("[FollowTrigger] Follow button not found, retrying...");
      setTimeout(() => this.detectAndObserveButton(), 2000);
      return;
    }

    // 获取初始关注状态
    this.isFollowing = this.checkFollowStatus();

    // 开始观察按钮变化
    if (this.observer) {
      this.observer.observe(this.followBtn, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class']
      });
    }

    console.log("[FollowTrigger] Started tracking follow button");
  }

  private setupObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || 
            mutation.type === 'characterData' || 
            mutation.type === 'attributes') {
          this.checkStatusChange();
        }
      }
    });
  }

  private checkFollowStatus(): boolean {
    if (!this.followBtn) return false;

    const url = window.location.href;

    if (url.includes('/video/')) {
      return this.followBtn.classList.contains('following');
    } else if (url.includes('space.bilibili.com')) {
      return this.followBtn.classList.contains('gray') ||
             this.followBtn.textContent?.includes('已关注') || false;
    }

    return false;
  }

  private checkStatusChange(): void {
    const newIsFollowing = this.checkFollowStatus();

    if (newIsFollowing !== this.isFollowing) {
      const event: FollowStatusEvent = {
        creator: {
          isFollowing: newIsFollowing ? 1 : 0,
          followTime: newIsFollowing ? Date.now() : 0
        },
        isFollowing: newIsFollowing,
        timestamp: Date.now()
      };

      console.log("[FollowTrigger] Follow status changed:", event);
      this.callbacks.forEach(callback => callback(event));
      this.isFollowing = newIsFollowing;
    }
  }
}
