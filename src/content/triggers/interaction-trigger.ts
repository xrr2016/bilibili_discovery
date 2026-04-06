/**
 * 视频交互触发器
 * 负责监听点赞、分享等一次点击即可成立的轻量交互
 */

import { VideoInteractionEvent } from '../types.js';
import { logger } from '../../utils/logger.js';

export interface InteractionTrigger {
  /** 开始监听交互事件 */
  start(): void;
  /** 停止监听交互事件 */
  stop(): void;
  /** 设置数据收集回调 */
  onCollect(callback: (data: VideoInteractionEvent) => void): void;
}

export class VideoInteractionTrigger implements InteractionTrigger {
  private callbacks: Array<(data: VideoInteractionEvent) => void> = [];
  private isRunning = false;
  private lastTriggerAt = new Map<string, number>();
  private coinObserver: MutationObserver | null = null;
  private coinButton: HTMLElement | null = null;
  private isCoined = false;
  private pendingCoinAmount: number | undefined;
  private pendingCoinTimer: number | null = null;

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    document.addEventListener('click', this.handleClick, true);
    this.detectAndObserveCoinButton();
    logger.debug('[InteractionTrigger] Started tracking like/share/coin interactions');
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    document.removeEventListener('click', this.handleClick, true);
    if (this.coinObserver) {
      this.coinObserver.disconnect();
    }
    if (this.pendingCoinTimer !== null) {
      clearTimeout(this.pendingCoinTimer);
      this.pendingCoinTimer = null;
    }
  }

  onCollect(callback: (data: VideoInteractionEvent) => void): void {
    this.callbacks.push(callback);
  }

  private handleClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const likeButton = target.closest('.video-like');
    if (likeButton instanceof HTMLElement) {
      this.triggerCollect('like');
      return;
    }

    const shareButton = target.closest('.video-share');
    if (shareButton instanceof HTMLElement) {
      this.triggerCollect('share');
      return;
    }

    const coinConfirmButton = target.closest('.coin-operated-m-exp .coin-bottom .bi-btn');
    if (coinConfirmButton instanceof HTMLElement) {
      const dialog = coinConfirmButton.closest('.coin-operated-m-exp');
      this.cachePendingCoinAmount(dialog);
    }
  };

  private triggerCollect(action: VideoInteractionEvent['action']): void {
    this.triggerCollectWithPayload({ action });
  }

  private triggerCollectWithPayload(payload: Pick<VideoInteractionEvent, 'action' | 'amount'>): void {
    const now = Date.now();
    const dedupeKey = `${payload.action}:${payload.amount ?? 0}`;
    const lastAt = this.lastTriggerAt.get(dedupeKey) ?? 0;

    // 避免按钮内部多层节点冒泡导致一次点击被重复记录
    if (now - lastAt < 800) {
      return;
    }

    this.lastTriggerAt.set(dedupeKey, now);

    const url = window.location.href;
    const bvidMatch = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    const bvid = bvidMatch ? bvidMatch[1] : '';

    if (!bvid) {
      logger.debug('[InteractionTrigger] Not on video page, skipping');
      return;
    }

    const event: VideoInteractionEvent = {
      bv: bvid,
      title: this.extractTitle(),
      action: payload.action,
      amount: payload.amount,
      timestamp: now
    };

    logger.debug('[InteractionTrigger] Interaction detected:', event);
    this.callbacks.forEach(callback => callback(event));
  }

  private detectAndObserveCoinButton(): void {
    const selectors = [
      '.video-coin.video-toolbar-left-item',
      '.video-coin',
      '.video-toolbar-left-item.video-coin'
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button instanceof HTMLElement) {
        this.coinButton = button;
        break;
      }
    }

    if (!this.coinButton) {
      setTimeout(() => this.detectAndObserveCoinButton(), 1000);
      return;
    }

    this.isCoined = this.coinButton.classList.contains('on');

    if (!this.coinObserver) {
      this.coinObserver = new MutationObserver(() => {
        this.handleCoinButtonStateChange();
      });
    }

    this.coinObserver.disconnect();
    this.coinObserver.observe(this.coinButton, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  private handleCoinButtonStateChange(): void {
    if (!this.coinButton) {
      return;
    }

    const nextIsCoined = this.coinButton.classList.contains('on');
    if (!this.isCoined && nextIsCoined) {
      // 普通投币优先使用弹窗中确认的数量；没有弹窗时按一键三连默认2枚兜底
      const amount = this.pendingCoinAmount ?? 2;
      this.triggerCollectWithPayload({ action: 'coin', amount });
      this.pendingCoinAmount = undefined;
      if (this.pendingCoinTimer !== null) {
        clearTimeout(this.pendingCoinTimer);
        this.pendingCoinTimer = null;
      }
    }

    this.isCoined = nextIsCoined;
  }

  private cachePendingCoinAmount(dialog: Element | null): void {
    const amount = this.extractCoinAmount(dialog);
    this.pendingCoinAmount = amount ?? 1;

    if (this.pendingCoinTimer !== null) {
      clearTimeout(this.pendingCoinTimer);
    }

    // 如果按钮状态没有及时切换，稍后清理缓存，避免影响后续视频
    this.pendingCoinTimer = window.setTimeout(() => {
      this.pendingCoinAmount = undefined;
      this.pendingCoinTimer = null;
    }, 5000);
  }

  private extractCoinAmount(dialog: Element | null): number | undefined {
    if (!dialog) {
      return undefined;
    }

    const activeOption = dialog.querySelector('.mc-box.on .c-num')?.textContent?.trim();
    const optionMatch = activeOption?.match(/(\d+)/);
    if (optionMatch) {
      return Number(optionMatch[1]);
    }

    const titleMatch = dialog.querySelector('.coin-title')?.textContent?.match(/(\d+)/);
    if (titleMatch) {
      return Number(titleMatch[1]);
    }

    return undefined;
  }

  private extractTitle(): string | undefined {
    const titleSelectors = [
      '.video-info-container .video-title',
      '.video-info-title .video-title',
      'h1.video-title',
      'h1.title'
    ];

    for (const selector of titleSelectors) {
      const text = document.querySelector(selector)?.textContent?.trim();
      if (text) {
        return text;
      }
    }

    return undefined;
  }
}
