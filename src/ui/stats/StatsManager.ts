/**
 * 统计页面管理器
 * 统一管理统计页面的所有功能
 */

import { Platform } from "../../database/types/base.js";
import { getServiceContainer, type ServiceContainer } from "./services.js";
import { createInitialState } from "./helpers.js";
import { UpListManager } from "./UpListManager.js";
import { TagManager } from "./TagManager.js";
import { CategoryManager } from "./CategoryManager.js";
import { FilterManager } from "./FilterManager.js";
import type { StatsState } from "./types.js";

/**
 * 统计页面管理器
 * 负责协调所有子管理器，管理页面状态和渲染
 */
export class StatsManager {
  private services: ServiceContainer;
  private state: StatsState;
  private upListManager: UpListManager;
  private tagManager: TagManager;
  private categoryManager: CategoryManager;
  private filterManager: FilterManager;
  private initialized: boolean = false;

  constructor() {
    this.services = getServiceContainer();
    this.state = createInitialState(Platform.BILIBILI);

    // 初始化子管理器
    this.upListManager = new UpListManager(this.services);
    this.tagManager = new TagManager(this.services);
    this.categoryManager = new CategoryManager(this.services);
    this.filterManager = new FilterManager(this.services);
  }

  /**
   * 初始化统计页面
   */
  async init(): Promise<void> {
    if (typeof document === "undefined") {
      return;
    }

    if (this.initialized) {
      console.warn('[StatsManager] 已经初始化过了');
      return;
    }

    try {
      // 绑定事件
      this.bindPageActions();
      this.bindInputs();

      // 设置拖拽功能
      this.filterManager.setupDragAndDrop(this.state, () => this.rerender());

      // 加载数据
      await this.loadData();

      this.initialized = true;
    } catch (error) {
      console.error('[StatsManager] 初始化失败:', error);
      this.state.error = error instanceof Error ? error.message : '未知错误';
    }
  }

  /**
   * 加载统计数据
   */
  private async loadStats(): Promise<void> {
    // 获取已关注和未关注的UP数量
    const followedCount = await this.services.creatorRepo.getFollowedCount(this.state.platform);
    const unfollowedCount = await this.services.creatorRepo.getUnfollowedCount(this.state.platform);

    // 获取标签总数
    const tagResult = await this.services.tagRepo.getAllTags();
    const tagCount = tagResult.total;

    // 更新UI
    const followedCountElement = document.getElementById("stat-followed-count");
    const unfollowedCountElement = document.getElementById("stat-unfollowed-count");
    const tagCountElement = document.getElementById("stat-tag-count");

    if (followedCountElement) {
      followedCountElement.textContent = followedCount.toString();
    }
    if (unfollowedCountElement) {
      unfollowedCountElement.textContent = unfollowedCount.toString();
    }
    if (tagCountElement) {
      tagCountElement.textContent = tagCount.toString();
    }
  }

  /**
   * 加载数据
   */
  private async loadData(): Promise<void> {
    console.log(`[StatsManager] loadData 被调用`);
    this.state.loading = true;

    try {
      // 获取统计数据
      await this.loadStats();

      // 并行加载所有数据
      await Promise.all([
        this.tagManager.renderTagList(),
        this.categoryManager.renderCategories(() => this.rerender()),
        this.upListManager.renderUpList(this.state)
      ]);
    } catch (error) {
      console.error('[StatsManager] 加载数据失败:', error);
      this.state.error = error instanceof Error ? error.message : '加载失败';
    } finally {
      this.state.loading = false;
    }
  }

  /**
   * 重新渲染页面
   */
  private async rerender(): Promise<void> {
    console.log(`[StatsManager] rerender 被调用`);
    await this.upListManager.renderUpList(this.state);
    await this.tagManager.renderTagList();
    await this.categoryManager.renderCategories(() => this.rerender());
    await this.filterManager.renderFilterTags(this.state, () => this.rerender());
  }

  /**
   * 绑定页面操作
   */
  private bindPageActions(): void {
    // 绑定添加标签按钮
    const addTagBtn = document.getElementById('btn-add-tag');
    addTagBtn?.addEventListener('click', async () => {
      const tagName = prompt('请输入标签名称:');
      if (tagName) {
        try {
          await this.tagManager.createTag(tagName);
          await this.tagManager.renderTagList();
        } catch (error) {
          console.error('[StatsManager] 添加标签失败:', error);
          this.state.error = error instanceof Error ? error.message : '添加标签失败';
        }
      }
    });

    // 绑定添加分类按钮
    const addCategoryBtn = document.getElementById('btn-add-category');
    addCategoryBtn?.addEventListener('click', async () => {
      const categoryName = prompt('请输入分类名称:');
      if (categoryName) {
        try {
          await this.categoryManager.createCategory(categoryName);
          await this.categoryManager.renderCategories(() => this.rerender());
        } catch (error) {
          console.error('[StatsManager] 添加分类失败:', error);
          this.state.error = error instanceof Error ? error.message : '添加分类失败';
        }
      }
    });

    // 绑定清除筛选按钮
    const clearFilterBtn = document.getElementById('btn-clear-filter');
    clearFilterBtn?.addEventListener('click', () => {
      this.filterManager.clearFilters(this.state, () => this.rerender());
    });
  }

  /**
   * 绑定输入事件
   */
  private bindInputs(): void {
    // 绑定搜索框
    const searchInput = document.getElementById('up-search');
    searchInput?.addEventListener('input', this.debounce((e) => {
      const keyword = (e.target as HTMLInputElement).value.trim();
      // 如果搜索框为空，清除搜索关键词状态
      if (keyword === '') {
        this.state.searchKeyword = '';
      } else {
        this.state.searchKeyword = keyword;
      }
      this.upListManager.renderUpList(this.state);
    }, 300));

    // 绑定关注筛选开关
    const followToggle = document.getElementById('show-followed-toggle');
    followToggle?.addEventListener('change', (e) => {
      this.state.showFollowedOnly = (e.target as HTMLInputElement).checked;
      this.upListManager.renderUpList(this.state);
    });

    // 绑定标签搜索框
    const tagSearchInput = document.getElementById('tag-search');
    tagSearchInput?.addEventListener('input', this.debounce((e) => {
      const keyword = (e.target as HTMLInputElement).value.trim();
      // 如果搜索框为空，显示所有标签
      if (keyword === '') {
        this.tagManager.renderTagList('');
      } else {
        this.tagManager.renderTagList(keyword);
      }
    }, 300));
  }

  /**
   * 防抖函数
   */
  private debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * 获取当前状态
   */
  getState(): StatsState {
    return this.state;
  }
}

/**
 * 创建全局统计管理器实例
 */
let globalStatsManager: StatsManager | null = null;

/**
 * 获取全局统计管理器
 */
export function getStatsManager(): StatsManager {
  if (!globalStatsManager) {
    globalStatsManager = new StatsManager();
  }
  return globalStatsManager;
}
