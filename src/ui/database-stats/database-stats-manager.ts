/**
 * 数据库统计管理器
 * 负责管理数据库统计页面的核心功能
 */

import { VideoRepositoryImpl } from "../../database/implementations/video-repository.impl.js";
import { CreatorRepositoryImpl } from "../../database/implementations/creator-repository.impl.js";
import { CollectionRepositoryImpl } from "../../database/implementations/collection-repository.impl.js";
import { TagRepositoryImpl } from "../../database/implementations/tag-repository.impl.js";
import { DBUtils, STORE_NAMES } from "../../database/indexeddb/index.js";
import { getFavoriteFolders, getCollectedFolders } from "../../api/favorite.js";
import type { SubscribedFavoriteFolderInfo, FavoriteFolderInfo } from "../../api/types.js";
import { getValue } from "../../database/implementations/settings-repository.impl.js";
import { FolderProcessor } from "./folder-processor.js";
import { showProgress, hideProgress, showStatus, updateStatValue, updateFetchButtonState } from "./ui-helper.js";
import type { ProgressCallback } from "./types.js";
import { RateLimitError } from "../../api/request.js";

/**
 * 数据库统计管理器类
 */
export class DatabaseStatsManager {
  private videoRepo: VideoRepositoryImpl;
  private creatorRepo: CreatorRepositoryImpl;
  private collectionRepo: CollectionRepositoryImpl;
  private tagRepo: TagRepositoryImpl;
  private folderProcessor: FolderProcessor;
  private isFetching: boolean = false;
  private isPaused: boolean = false;
  private abortController: AbortController | null = null;

  constructor() {
    this.videoRepo = new VideoRepositoryImpl();
    this.creatorRepo = new CreatorRepositoryImpl();
    this.collectionRepo = new CollectionRepositoryImpl();
    this.tagRepo = new TagRepositoryImpl();
    this.folderProcessor = new FolderProcessor();
  }

  /**
   * 初始化页面
   */
  async init(): Promise<void> {
    if (typeof document === "undefined") {
      return;
    }

    // 初始化主题
    import("../../themes/index.js").then(({ initThemedPage }) => {
      initThemedPage("database-stats");
    });

    // 加载统计数据
    await this.loadStats();

    // 绑定获取收藏夹按钮事件
    this.bindFetchButton();
  }

  /**
   * 绑定获取收藏夹按钮事件
   */
  private bindFetchButton(): void {
    const fetchBtn = document.getElementById('fetch-favorites-btn');
    if (fetchBtn) {
      fetchBtn.addEventListener('click', async () => {
        if (this.isFetching) {
          // 暂停获取
          this.isPaused = true;
          if (this.abortController) {
            this.abortController.abort();
          }
          showStatus('已暂停获取', 'info');
          return;
        }

        // 从设置中获取UID
        const userId = await getValue<number>("userId");
        if (!userId) {
          showStatus('请先在设置中配置用户UID', 'error');
          return;
        }

        await this.fetchFavoriteData(userId.toString());
      });
    }
  }

  /**
   * 获取收藏夹数据
   */
  private async fetchFavoriteData(uid: string): Promise<void> {
    this.isFetching = true;
    this.isPaused = false;
    this.abortController = new AbortController();

    updateFetchButtonState(true);

    try {
      showProgress(0, 100, '正在获取收藏夹列表...');
      const folders = await getFavoriteFolders(uid);
      const collectedFolders = await getCollectedFolders(uid);
      const allFolders = [...folders, ...collectedFolders];

      if (allFolders.length === 0) {
        showStatus('未找到收藏夹', 'error');
        hideProgress();
        return;
      }

      let totalVideos = 0;
      let processedFolders = 0;

      for (const folder of allFolders) {
        if (this.isPaused) {
          showStatus(`已暂停，已处理 ${processedFolders} 个收藏夹`, 'info');
          break;
        }

        showProgress(
          processedFolders,
          allFolders.length,
          `正在处理收藏夹: ${folder.title} (${folder.media_count}个视频)`
        );

        // 判断是自己的收藏夹还是订阅的收藏夹
        if ('intro' in folder) {
          // 订阅的收藏夹
          await this.folderProcessor.processCollectedFolder(folder as SubscribedFavoriteFolderInfo, (current, total, message) => {
            const folderProgress = (processedFolders / allFolders.length) * 100;
            const videoProgress = (current / total) * (100 / allFolders.length);
            const totalProgress = folderProgress + videoProgress;
            showProgress(
              Math.floor(totalProgress),
              100,
              `[订阅 ${processedFolders + 1}/${allFolders.length}] ${folder.title}: ${message} (${current}/${total})`
            );
          }, this.abortController.signal);
        } else {
          // 自己的收藏夹
          await this.folderProcessor.processFolder(folder as FavoriteFolderInfo, (current, total, message) => {
            const folderProgress = (processedFolders / allFolders.length) * 100;
            const videoProgress = (current / total) * (100 / allFolders.length);
            const totalProgress = folderProgress + videoProgress;
            showProgress(
              Math.floor(totalProgress),
              100,
              `[${processedFolders + 1}/${allFolders.length}] ${folder.title}: ${message} (${current}/${total})`
            );
          }, this.abortController.signal);
        }

        if (this.isPaused) {
          break;
        }

        processedFolders++;
        totalVideos += folder.media_count;
      }

      if (!this.isPaused) {
        showProgress(100, 100, '完成！');
        showStatus(`成功处理 ${folders.length} 个收藏夹和 ${collectedFolders.length} 个订阅收藏夹，共 ${totalVideos} 个视频`, 'success');
        // 重新加载统计数据
        await this.loadStats();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        showStatus('已取消获取', 'info');
      } else if (error instanceof RateLimitError) {
        console.error('[DatabaseStatsManager] 触发风控:', error);
        showStatus(error.message, 'error');
      } else {
        console.error('[DatabaseStatsManager] 获取收藏夹数据失败:', error);
        showStatus('获取收藏夹数据失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
      }
    } finally {
      this.isFetching = false;
      this.isPaused = false;
      this.abortController = null;
      updateFetchButtonState(false);
      setTimeout(() => hideProgress(), 2000);
    }
  }

  /**
   * 加载统计数据
   */
  private async loadStats(): Promise<void> {
    try {
      // 获取视频总数
      const videos = await this.videoRepo.getAllVideos();
      const videoCount = videos.length;

      // 获取UP主总数
      const creators = await this.creatorRepo.getAll();
      const creatorCount = creators.length;

      // 获取收藏夹总数
      const collections = await this.collectionRepo.getAllCollections();
      const collectionCount = collections.length;

      // 获取收藏项总数
      const collectionItems = await DBUtils.getAll(STORE_NAMES.COLLECTION_ITEMS);
      const collectionItemCount = collectionItems.length;

      // 获取标签总数
      const tagResult = await this.tagRepo.getAllTags();
      const tagCount = tagResult.total;

      // 获取分类总数
      const categories = await DBUtils.getAll(STORE_NAMES.CATEGORIES);
      const categoryCount = categories.length;

      // 更新UI
      updateStatValue('stat-video-count', videoCount);
      updateStatValue('stat-creator-count', creatorCount);
      updateStatValue('stat-collection-count', collectionCount);
      updateStatValue('stat-collection-item-count', collectionItemCount);
      updateStatValue('stat-tag-count', tagCount);
      updateStatValue('stat-category-count', categoryCount);

      showStatus('数据加载完成', 'success');
    } catch (error) {
      console.error('[DatabaseStatsManager] 加载统计数据失败:', error);
      showStatus('加载数据失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error');
    }
  }
}
