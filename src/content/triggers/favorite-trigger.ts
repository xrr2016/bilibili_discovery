
/**
 * 收藏状态触发器
 * 负责监听收藏按钮状态变化，决定何时触发收藏数据的收集
 */

import { FavoriteStatusEvent } from '../types.js';
import { logger } from '../../utils/logger.js';
/**
 * 收藏触发器接口
 */
export interface FavoriteTrigger {
  /** 开始监听收藏事件 */
  start(): void;
  /** 停止监听收藏事件 */
  stop(): void;
  /** 设置数据收集回调 */
  onCollect(callback: (data: FavoriteStatusEvent) => void): void;
}

/**
 * 收藏按钮触发器
 * 监听收藏按钮状态变化
 */
export class FavoriteButtonTrigger implements FavoriteTrigger {
  private callbacks: Array<(data: FavoriteStatusEvent) => void> = [];
  private observer: MutationObserver | null = null;
  private favoriteBtn: HTMLElement | null = null;
  private isRunning = false;
  private isFavorited = false;
  private dialogInitialFolders: string[] = [];
  private dialogSnapshotTimer: number | null = null;
  private lastDialogConfirmAt = 0;

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
    document.removeEventListener("click", this.handleDocumentClick, true);
    if (this.dialogSnapshotTimer !== null) {
      clearTimeout(this.dialogSnapshotTimer);
      this.dialogSnapshotTimer = null;
    }
  }

  onCollect(callback: (data: FavoriteStatusEvent) => void): void {
    this.callbacks.push(callback);
  }

  private detectAndObserveButton(): void {
    const selectors = [
      ".video-fav", // B站收藏按钮的主类名
      ".video-toolbar-left-item.video-fav",
      ".toolbar-left .collect",
      ".video-toolbar .collect",
      ".action-item.collect",
      ".toolbar-left .video-coin-video",
      ".video-toolbar .video-coin-video",
      ".action-item.video-coin-video",
      "[class*='collect']",
      "[class*='favorite']",
      "[class*='fav']",
      ".video-actions .collect-btn",
      ".video-actions .favorite-btn"
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        this.favoriteBtn = el as HTMLElement;
        break;
      }
    }

    if (!this.favoriteBtn) {
      logger.debug("[FavoriteTrigger] Favorite button not found, retrying...");
      setTimeout(() => this.detectAndObserveButton(), 1000);
      return;
    }

    logger.debug("[FavoriteTrigger] Favorite button found, setting up observer");
    this.isFavorited = this.favoriteBtn.classList.contains("on");

    // 开始观察按钮变化
    if (this.observer) {
      this.observer.observe(this.favoriteBtn, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }

    document.removeEventListener("click", this.handleDocumentClick, true);
    document.addEventListener("click", this.handleDocumentClick, true);
  }

  private setupObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          const target = mutation.target as HTMLElement;
          const isFavorited = target.classList.contains("on");
          if (isFavorited !== this.isFavorited) {
            this.handleFavoriteStateChange(isFavorited);
            this.isFavorited = isFavorited;
          }
        }
      });
    });
  }

  private handleDocumentClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const favoriteButton = target.closest(".video-fav");
    if (favoriteButton instanceof HTMLElement) {
      this.scheduleDialogSnapshot();
      return;
    }

    const confirmButton = target.closest(".collection-m-exp .bottom .submit-move");
    if (confirmButton instanceof HTMLButtonElement && !confirmButton.disabled) {
      this.handleDialogConfirm(confirmButton);
    }
  };

  private handleFavoriteStateChange(isFavorited: boolean): void {
    const now = Date.now();
    if (now - this.lastDialogConfirmAt < 1500) {
      return;
    }

    if (isFavorited) {
      this.triggerCollect(true, ['默认收藏夹']);
    } else {
      this.triggerCollect(false);
    }
  }

  private scheduleDialogSnapshot(): void {
    if (this.dialogSnapshotTimer !== null) {
      clearTimeout(this.dialogSnapshotTimer);
    }

    let attempts = 0;
    const capture = () => {
      const dialog = document.querySelector('.collection-m-exp');
      if (dialog) {
        this.dialogInitialFolders = this.getCheckedFolderNames(dialog);
        this.dialogSnapshotTimer = null;
        return;
      }

      attempts += 1;
      if (attempts < 10) {
        this.dialogSnapshotTimer = window.setTimeout(capture, 200);
      } else {
        this.dialogSnapshotTimer = null;
      }
    };

    this.dialogSnapshotTimer = window.setTimeout(capture, 100);
  }

  private handleDialogConfirm(confirmButton: HTMLButtonElement): void {
    const dialog = confirmButton.closest('.collection-m-exp');
    if (!dialog) {
      return;
    }

    const currentFolders = this.getCheckedFolderNames(dialog);
    const initialFolders = this.dialogInitialFolders;
    const addedFolders = currentFolders.filter(name => !initialFolders.includes(name));
    const removedFolders = initialFolders.filter(name => !currentFolders.includes(name));

    this.lastDialogConfirmAt = Date.now();

    if (addedFolders.length > 0) {
      this.triggerCollect(true, addedFolders);
    }

    if (removedFolders.length > 0) {
      this.triggerCollect(false, removedFolders);
    }

    this.dialogInitialFolders = [];
  }

  private getCheckedFolderNames(dialog: Element): string[] {
    const labels = Array.from(dialog.querySelectorAll('.group-list li label'));
    const names: string[] = [];

    for (const label of labels) {
      const input = label.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      if (!input?.checked) {
        continue;
      }

      const name = label.querySelector('.fav-title')?.textContent?.trim();
      if (name) {
        names.push(name);
      }
    }

    return names;
  }

  private triggerCollect(isFavorited: boolean, folderNames?: string[]): void {
    const url = window.location.href;
    const bvidMatch = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    const bvid = bvidMatch ? bvidMatch[1] : "";

    if (!bvid) {
      logger.debug("[FavoriteTrigger] Not on video page, skipping");
      return;
    }

    const titleElement = document.querySelector("h1.video-title, h1.title");
    const title = titleElement?.textContent?.trim() || "";

    const event: FavoriteStatusEvent = {
      bv: bvid,
      title,
      action: isFavorited ? "add" : "remove",
      folderNames,
      timestamp: Date.now()
    };

    logger.debug("[FavoriteTrigger] Favorite status changed:", event);
    this.callbacks.forEach(callback => callback(event));
  }
}
