/**
 * 筛选管理器
 * 负责筛选标签的渲染和交互
 */

import type { StatsState } from "./types.js";
import type { ServiceContainer } from "./services.js";
import type { ID } from "../../database/types/base.js";
import { getDragContext, setDragContext } from "../../utils/drag-utils.js";
import { bindDropZone, createFilterChip } from "../shared/index.js";

type RefreshFn = () => void;

/**
 * 筛选管理器
 */
export class FilterManager {
  private services: ServiceContainer;

  constructor(services: ServiceContainer) {
    this.services = services;
  }

  /**
   * 添加包含标签
   */
  addIncludeTag(state: StatsState, tagId: ID): void {
    if (!state.filters.includeTags.includes(tagId)) {
      state.filters.includeTags.push(tagId);
      // 重置页码到第一页
      this.services.paginationState.currentPage = 0;
    }
  }

  /**
   * 移除包含标签
   */
  removeIncludeTag(state: StatsState, tagId: ID): void {
    state.filters.includeTags = state.filters.includeTags.filter(id => id !== tagId);
    // 重置页码到第一页
    this.services.paginationState.currentPage = 0;
  }

  /**
   * 添加排除标签
   */
  addExcludeTag(state: StatsState, tagId: ID): void {
    if (!state.filters.excludeTags.includes(tagId)) {
      state.filters.excludeTags.push(tagId);
      // 重置页码到第一页
      this.services.paginationState.currentPage = 0;
    }
  }

  /**
   * 移除排除标签
   */
  removeExcludeTag(state: StatsState, tagId: ID): void {
    state.filters.excludeTags = state.filters.excludeTags.filter(id => id !== tagId);
    // 重置页码到第一页
    this.services.paginationState.currentPage = 0;
  }

  addIncludeCategory(state: StatsState, categoryId: ID, tagIds: ID[]): void {
    if (!state.filters.includeCategories.includes(categoryId)) {
      state.filters.includeCategories.push(categoryId);
      // 重置页码到第一页
      this.services.paginationState.currentPage = 0;
    }

    const exists = state.filters.includeCategoryTags.some(category => category.categoryId === categoryId);
    if (!exists) {
      state.filters.includeCategoryTags.push({ categoryId, tagIds: [...tagIds] });
    }
  }

  removeIncludeCategory(state: StatsState, categoryId: ID): void {
    state.filters.includeCategories = state.filters.includeCategories.filter(id => id !== categoryId);
    state.filters.includeCategoryTags = state.filters.includeCategoryTags.filter(category => category.categoryId !== categoryId);
    // 重置页码到第一页
    this.services.paginationState.currentPage = 0;
  }

  addExcludeCategory(state: StatsState, categoryId: ID, tagIds: ID[]): void {
    if (!state.filters.excludeCategories.includes(categoryId)) {
      state.filters.excludeCategories.push(categoryId);
      // 重置页码到第一页
      this.services.paginationState.currentPage = 0;
    }

    const exists = state.filters.excludeCategoryTags.some(category => category.categoryId === categoryId);
    if (!exists) {
      state.filters.excludeCategoryTags.push({ categoryId, tagIds: [...tagIds] });
    }
  }

  removeExcludeCategory(state: StatsState, categoryId: ID): void {
    state.filters.excludeCategories = state.filters.excludeCategories.filter(id => id !== categoryId);
    state.filters.excludeCategoryTags = state.filters.excludeCategoryTags.filter(category => category.categoryId !== categoryId);
    // 重置页码到第一页
    this.services.paginationState.currentPage = 0;
  }

  /**
   * 清除所有筛选
   */
  clearAllFilters(state: StatsState): void {
    state.filters.includeTags = [];
    state.filters.excludeTags = [];
    state.filters.includeCategories = [];
    state.filters.excludeCategories = [];
    state.filters.includeCategoryTags = [];
    state.filters.excludeCategoryTags = [];
    // 重置页码到第一页
    this.services.paginationState.currentPage = 0;
  }

  /**
   * 检查是否有活动筛选
   */
  hasActiveFilters(state: StatsState): boolean {
    return (
      state.filters.includeTags.length > 0 ||
      state.filters.excludeTags.length > 0 ||
      state.filters.includeCategories.length > 0 ||
      state.filters.excludeCategories.length > 0
    );
  }

  /**
   * 渲染筛选标签
   */
  async renderFilterTags(state: StatsState, refresh: RefreshFn): Promise<void> {
    const includeContainer = document.getElementById("filter-include-tags");
    const excludeContainer = document.getElementById("filter-exclude-tags");

    if (!includeContainer || !excludeContainer) return;

    // 清空容器
    includeContainer.innerHTML = "";
    excludeContainer.innerHTML = "";

    // 获取标签名称
    const allTagIds = [...state.filters.includeTags, ...state.filters.excludeTags];
    const tagsMap = allTagIds.length > 0 ? await this.services.tagRepo.getTags(allTagIds) : new Map();
    const allCategoryIds = [...state.filters.includeCategories, ...state.filters.excludeCategories];
    const categories = await this.services.categoryRepo.getAllCategories();
    const categoryMap = new Map(categories.map(category => [category.id, category]));

    // 渲染包含标签
    for (const tagId of state.filters.includeTags) {
      const tag = tagsMap.get(tagId);
      const tagName = tag?.name || String(tagId);
      const tagElement = this.createFilterTagElement(tagId, tagName, 'include', state, refresh);
      includeContainer.appendChild(tagElement);
    }

    // 渲染排除标签
    for (const tagId of state.filters.excludeTags) {
      const tag = tagsMap.get(tagId);
      const tagName = tag?.name || String(tagId);
      const tagElement = this.createFilterTagElement(tagId, tagName, 'exclude', state, refresh);
      excludeContainer.appendChild(tagElement);
    }

    for (const categoryId of state.filters.includeCategories) {
      const category = categoryMap.get(categoryId);
      const tagList = state.filters.includeCategoryTags.find(item => item.categoryId === categoryId)?.tagIds || [];
      const categoryElement = this.createFilterCategoryElement(
        categoryId,
        category?.name || String(categoryId),
        tagList,
        'include',
        state,
        refresh
      );
      includeContainer.appendChild(categoryElement);
    }

    for (const categoryId of state.filters.excludeCategories) {
      const category = categoryMap.get(categoryId);
      const tagList = state.filters.excludeCategoryTags.find(item => item.categoryId === categoryId)?.tagIds || [];
      const categoryElement = this.createFilterCategoryElement(
        categoryId,
        category?.name || String(categoryId),
        tagList,
        'exclude',
        state,
        refresh
      );
      excludeContainer.appendChild(categoryElement);
    }
  }

  /**
   * 创建筛选标签元素
   */
  private createFilterTagElement(
    tagId: ID,
    tagName: string,
    type: 'include' | 'exclude',
    state: StatsState,
    refresh: RefreshFn
  ): HTMLElement {
    const tagElement = createFilterChip({
      label: tagName,
      colorTag: tagName,
      variant: type,
      createDragContext: () => ({
        tagId: tagId,
        tagName: tagName,
        dropped: false,
        isFilterTag: true,
        filterType: type
      }),
      onDragStart: (_, element) => {
        element.style.opacity = "0.5";
      },
      onDragEnd: (_, element) => {
        const context = getDragContext();
        if (context && !context.dropped && context.isFilterTag) {
          element.remove();
          if (type === 'include') {
            this.removeIncludeTag(state, tagId);
          } else {
            this.removeExcludeTag(state, tagId);
          }
          refresh();
        }
        element.style.opacity = "1";
      },
      onRemove: (_, element) => {
        element.remove();
        if (type === 'include') {
          this.removeIncludeTag(state, tagId);
        } else {
          this.removeExcludeTag(state, tagId);
        }
        refresh();
      }
    });
    return tagElement;
  }

  private createFilterCategoryElement(
    categoryId: ID,
    categoryName: string,
    tagIds: ID[],
    type: 'include' | 'exclude',
    state: StatsState,
    refresh: RefreshFn
  ): HTMLElement {
    const categoryElement = createFilterChip({
      label: `${categoryName} (${tagIds.length} OR)`,
      variant: type,
      className: `filter-tag filter-tag-category filter-tag-${type}`,
      createDragContext: () => ({
        categoryId,
        categoryName,
        categoryTagIds: [...tagIds],
        dropped: false,
        isFilterTag: true,
        isCategory: true,
        filterType: type
      }),
      onDragStart: (_, element) => {
        element.style.opacity = "0.5";
      },
      onDragEnd: (_, element) => {
        const context = getDragContext();
        if (context && !context.dropped && context.isFilterTag && context.isCategory) {
          element.remove();
          if (type === 'include') {
            this.removeIncludeCategory(state, categoryId);
          } else {
            this.removeExcludeCategory(state, categoryId);
          }
          refresh();
        }
        element.style.opacity = "1";
      },
      onRemove: (_, element) => {
        element.remove();
        if (type === 'include') {
          this.removeIncludeCategory(state, categoryId);
        } else {
          this.removeExcludeCategory(state, categoryId);
        }
        refresh();
      }
    });
    return categoryElement;
  }

  /**
   * 清除所有筛选
   */
  async clearFilters(state: StatsState, refresh: RefreshFn): Promise<void> {
    this.clearAllFilters(state);

    // 清除搜索关键词
    state.searchKeyword = '';
    const searchInput = document.getElementById('up-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }

    refresh();
  }

  /**
   * 设置拖拽功能
   */
  setupDragAndDrop(state: StatsState, refresh: RefreshFn): void {
    const includeZone = document.getElementById("filter-include-tags");
    const excludeZone = document.getElementById("filter-exclude-tags");

    if (!includeZone || !excludeZone) {
      console.warn('[FilterManager] 过滤区域未找到');
      return;
    }

    // 设置包含区域的拖拽事件
    this.setupDropZone(includeZone, state, refresh, 'include');

    // 设置排除区域的拖拽事件
    this.setupDropZone(excludeZone, state, refresh, 'exclude');
  }

  /**
   * 设置拖放区域
   */
  private setupDropZone(
    zone: HTMLElement,
    state: StatsState,
    refresh: RefreshFn,
    type: 'include' | 'exclude'
  ): void {
    bindDropZone({
      zone,
      dropEffect: "copy",
      onDrop: (context) => {
        // 如果是从过滤区域拖动的标签，需要处理过滤类型的转换
        if (context.isFilterTag && context.filterType) {
          // 如果拖动到不同类型的过滤区域，需要先从原区域移除，再添加到新区域
          if (context.filterType !== type) {
            if (context.tagId) {
              // 从原过滤区域移除
              if (context.filterType === 'include') {
                this.removeIncludeTag(state, context.tagId);
              } else {
                this.removeExcludeTag(state, context.tagId);
              }
              // 添加到新过滤区域
              if (type === 'include') {
                this.addIncludeTag(state, context.tagId);
              } else {
                this.addExcludeTag(state, context.tagId);
              }
            } else if (context.isCategory && context.categoryId && context.categoryTagIds) {
              // 处理分类标签的移动
              if (context.filterType === 'include') {
                this.removeIncludeCategory(state, context.categoryId);
              } else {
                this.removeExcludeCategory(state, context.categoryId);
              }
              if (type === 'include') {
                this.addIncludeCategory(state, context.categoryId, context.categoryTagIds);
              } else {
                this.addExcludeCategory(state, context.categoryId, context.categoryTagIds);
              }
            }
            context.dropped = true;
            setDragContext(context);
            refresh();
          } else {
            // 如果拖动到相同类型的过滤区域，不做处理
            context.dropped = true;
            setDragContext(context);
          }
          return;
        }

        // 处理从大分区拖动来的标签（isCategoryTag 为 true 的标签）
        if (context.isCategoryTag && context.tagId) {
          // 标记为已拖放，防止 onDragEnd 中删除标签
          context.dropped = true;
          setDragContext(context);

          // 添加到过滤区域
          if (type === 'include') {
            this.addIncludeTag(state, context.tagId);
          } else {
            this.addExcludeTag(state, context.tagId);
          }
          refresh();
          return;
        }

        // 处理从其他区域拖动来的标签
        if (context.isCategory && context.categoryId && context.categoryTagIds) {
          if (type === 'include') {
            this.addIncludeCategory(state, context.categoryId, context.categoryTagIds);
          } else {
            this.addExcludeCategory(state, context.categoryId, context.categoryTagIds);
          }
        } else {
          if (!context.tagId) {
            return;
          }

          if (type === 'include') {
            this.addIncludeTag(state, context.tagId);
          } else {
            this.addExcludeTag(state, context.tagId);
          }
        }

        context.dropped = true;
        setDragContext(context);
        refresh();
      }
    });
  }
}
