/**
 * UP列表管理器
 * 负责UP主列表的渲染和交互
 */
import type { Creator } from "../../database/types/index.js";
import type { CompositeQueryCondition } from "../../database/query-server/query/types.js";
import type { ServiceContainer } from "./services.js";
import type { StatsState } from "./types.js";
import { updateToggleLabel } from "../../utls/dom-utils.js";
import { colorFromTag } from "../../utls/tag-utils.js";
import { createDragGhost, setDragContext, getDragContext, type DragContext } from "../../utls/drag-utils.js";
import { BookRenderer } from "./BookRenderer.js";

type RenderFn = () => void;

/**
 * UP列表管理器
 */
export class UpListManager {
  private services: ServiceContainer;
  private currentState: StatsState | null = null;
  private bookRenderer: BookRenderer<Creator> | null = null;
  private isAnimating = false;

  constructor(services: ServiceContainer) {
    this.services = services;
  }

  /**
   * 获取筛选后的创作者列表
   */
  async getFilteredCreators(state: StatsState): Promise<{ creators: Creator[]; total: number }> {
    console.log('[UpListManager] getFilteredCreators called with state:', {
      searchKeyword: state.searchKeyword,
      showFollowedOnly: state.showFollowedOnly,
      platform: state.platform
    });

    // 构建查询条件
    const queryCondition = this.buildQueryCondition(state);
    console.log('[UpListManager] Query condition:', queryCondition);

    // 获取或创建Book实例 - 通过services层
    const currentBook = await this.services.getCreatorBook(queryCondition);

    // 初始化或更新BookRenderer
    if (!this.bookRenderer) {
      this.bookRenderer = new BookRenderer<Creator>(currentBook, {
        enablePreload: true,
        preloadCount: 1,
        enableAnimation: true,
        animationDelay: 150
      });
    } else {
      // 更新BookRenderer的查询条件
      await this.bookRenderer.updateCondition(queryCondition);
    }

    // 更新分页状态 - 从Book中获取分页信息
    this.services.paginationState.totalItems = currentBook.state.totalRecords;
    this.services.paginationState.totalPages = currentBook.state.totalPages;
    this.services.paginationState.pageSize = currentBook.state.pageSize;

    // 如果没有结果，返回空列表
    if (currentBook.state.totalRecords === 0) {
      console.log('[UpListManager] No results found');
      return {
        creators: [],
        total: 0
      };
    }

    // 确保当前页码有效
    if (this.services.paginationState.currentPage >= this.services.paginationState.totalPages) {
      this.services.paginationState.currentPage = Math.max(0, this.services.paginationState.totalPages - 1);
    }

    // 获取分页数据
    const result = await currentBook.getPage(this.services.paginationState.currentPage, {
      preloadNext: true,
      preloadCount: 1
    });

    console.log('[UpListManager] Returning results:', {
      count: result.items.length,
      total: result.state.totalRecords,
      items: result.items.map(c => ({ id: c.creatorId, name: c.name }))
    });

    // 检查是否有重复的creatorId
    const creatorIds = new Set<number>();
    const duplicates: number[] = [];
    for (const creator of result.items) {
      if (creatorIds.has(creator.creatorId)) {
        duplicates.push(creator.creatorId);
        console.warn(`[UpListManager] 发现重复的creatorId: ${creator.creatorId}, name: ${creator.name}`);
      } else {
        creatorIds.add(creator.creatorId);
      }
    }
    if (duplicates.length > 0) {
      console.warn(`[UpListManager] 发现重复的creatorId:`, duplicates);
    }

    return {
      creators: result.items,
      total: result.state.totalRecords
    };
  }

  /**
   * 验证分页参数有效性
   */
  private validatePagination(): void {
    if (this.services.paginationState.currentPage >= this.services.paginationState.totalPages) {
      this.services.paginationState.currentPage = Math.max(0, this.services.paginationState.totalPages - 1);
    }
  }

  /**
   * 构建查询条件
   */
  private buildQueryCondition(state: StatsState): CompositeQueryCondition {
    const condition: CompositeQueryCondition = {
      platform: state.platform,
      isFollowing: state.showFollowedOnly ? 1 : 0
    };

    // 添加搜索关键词（如果有）
    if (state.searchKeyword && state.searchKeyword.trim()) {
      condition.keyword = state.searchKeyword.trim();
    }

    // 构建标签表达式
    const tagExpressions: any[] = [];

    // 处理包含标签（AND 操作）
    if (state.filters.includeTags.length > 0) {
      tagExpressions.push({
        tagId: state.filters.includeTags.length === 1
          ? state.filters.includeTags[0]
          : state.filters.includeTags,
        operator: 'AND'
      });
    }

    // 处理排除标签（NOT 操作）
    if (state.filters.excludeTags.length > 0) {
      tagExpressions.push({
        tagId: state.filters.excludeTags.length === 1
          ? state.filters.excludeTags[0]
          : state.filters.excludeTags,
        operator: 'NOT'
      });
    }

    // 处理分类标签
    state.filters.includeCategoryTags.forEach(category => {
      if (category.tagIds.length > 0) {
        tagExpressions.push({
          tagId: category.tagIds.length === 1
            ? category.tagIds[0]
            : category.tagIds,
          operator: 'AND'
        });
      }
    });

    state.filters.excludeCategoryTags.forEach(category => {
      if (category.tagIds.length > 0) {
        tagExpressions.push({
          tagId: category.tagIds.length === 1
            ? category.tagIds[0]
            : category.tagIds,
          operator: 'NOT'
        });
      }
    });

    // 如果有标签表达式，添加到条件中
    if (tagExpressions.length > 0) {
      (condition as any).tagExpressions = tagExpressions;
    }

    return condition;
  }

  /**
   * 渲染UP列表
   */
  async renderUpList(state: StatsState): Promise<void> {
    console.log(`[UpListManager] renderUpList 被调用, state:`, {
      searchKeyword: state.searchKeyword,
      showFollowedOnly: state.showFollowedOnly,
      platform: state.platform,
      currentPage: this.services.paginationState.currentPage
    });

    // 保存当前的StatsState
    this.currentState = state;

    const container = this.getContainer();
    if (!container) {
      return;
    }

    // 如果正在动画中，忽略此次请求
    if (this.isAnimating) {
      console.log(`[UpListManager] 动画进行中，忽略此次请求`);
      return;
    }

    try {
      const currentPage = this.services.paginationState.currentPage;
      const total = await this.renderPageContent(container, currentPage, state);

      // 渲染分页控件到独立容器
      this.renderPagination(total, currentPage, this.services.paginationState.totalPages, () => {
        if (this.currentState) {
          this.renderUpList(this.currentState);
        }
      });
    } catch (error) {
      console.error('[UpListManager] 渲染UP列表失败:', error);
      container.innerHTML = '<div class="error">加载失败</div>';
    }
  }

  /**
   * 获取容器元素
   */
  private getContainer(): HTMLElement | null {
    const container = document.getElementById("up-list");
    if (!container) {
      console.warn(`[UpListManager] 找不到up-list容器`);
      return null;
    }
    return container;
  }

  /**
   * 渲染页面内容
   */
  private async renderPageContent(
    container: HTMLElement,
    currentPage: number,
    state: StatsState
  ): Promise<number> {
    
    // 确保BookRenderer已初始化
    if (!this.bookRenderer) {
      // 渲染新页面
      return await this.renderNewPage(container, state);
    }

    try {
      // 先更新查询条件
      const queryCondition = this.buildQueryCondition(state);
      await this.bookRenderer.updateCondition(queryCondition);
      
      // 使用BookRenderer渲染页面
      const renderResult = await this.bookRenderer.renderPage(
        currentPage,
        async (creators) => this.renderCreators(creators)
      );

      // 更新分页状态
      this.services.paginationState.currentPage = renderResult.state.currentPage;
      this.services.paginationState.totalPages = renderResult.state.totalPages;
      this.services.paginationState.pageSize = renderResult.state.pageSize;
      this.services.paginationState.totalItems = renderResult.state.totalRecords;

      console.log(`[UpListManager] ${renderResult.fromCache ? '使用缓存的' : '渲染新的'}页面 ${currentPage}`);

      // 渲染DOM元素
      await this.animatePageChange(container, async () => {
        container.innerHTML = "";
        renderResult.elements.forEach((el, index) => {
          const clonedElement = el.cloneNode(true) as HTMLElement;
          // 添加延迟动画效果，每个元素延迟递增
          clonedElement.style.animationDelay = `${index * 0.06}s`;
          container.appendChild(clonedElement);
        });
      });

      return renderResult.state.totalRecords;
    } catch (error) {
      console.error('[UpListManager] 渲染页面失败:', error);
      // 如果渲染失败，尝试渲染新页面
      return await this.renderNewPage(container, state);
    }

    // 渲染新页面
    return await this.renderNewPage(container, state);
  }

  // 注意：getCacheKey 和 renderCachedPage 方法已被移除，因为缓存逻辑现在由 BookRenderer 处理

  /**
   * 渲染新页面
   */
  private async renderNewPage(container: HTMLElement, state: StatsState): Promise<number> {
    // 显示加载状态
    const loadingElement = this.showLoadingState(container);

    try {
      const { creators, total } = await this.getFilteredCreators(state);

      // 更新分页状态
      this.services.paginationState.totalItems = total;

      // 移除加载状态
      loadingElement.remove();

      // 渲染UP列表
      const newElements = await this.renderCreators(creators);

      // 缓存当前页面
      const currentPage = this.services.paginationState.currentPage;

      console.log(`[UpListManager] UP列表渲染完成，实际渲染 ${newElements.length} 个创作者`);

      // 使用动画切换页面
      await this.animatePageChange(container, async () => {
        container.innerHTML = "";
        newElements.forEach((el, index) => {
          const clonedElement = el.cloneNode(true) as HTMLElement;
          // 添加延迟动画效果，每个元素延迟递增
          clonedElement.style.animationDelay = `${index * 0.06}s`;
          container.appendChild(clonedElement);
        });
      });

      return total;
    } catch (error) {
      loadingElement.remove();
      throw error;
    }
  }

  /**
   * 显示加载状态
   */
  private showLoadingState(container: HTMLElement): HTMLElement {
    const loadingElement = document.createElement("div");
    loadingElement.className = "loading";
    loadingElement.textContent = "加载中...";
    container.appendChild(loadingElement);
    return loadingElement;
  }

  /**
   * 渲染创作者列表
   */
  private async renderCreators(creators: Creator[]): Promise<HTMLElement[]> {
    console.log(`[UpListManager] 开始渲染UP列表，共 ${creators.length} 个创作者`);

    const creatorIds = new Set<number>();
    const newElements: HTMLElement[] = [];

    for (const creator of creators) {
      if (creatorIds.has(creator.creatorId)) {
        console.warn(`[UpListManager] 发现重复的创作者 (creatorId: ${creator.creatorId})`);
        continue;
      }
      creatorIds.add(creator.creatorId);
      const creatorElement = await this.renderCreatorItem(creator);
      newElements.push(creatorElement);
    }

    return newElements;
  }

  /**
   * 页面切换动画
   */
  private async animatePageChange(container: HTMLElement, changeFn: () => Promise<void> | void): Promise<void> {
    if (this.isAnimating) return;

    this.isAnimating = true;

    // 添加淡出和滑动效果
    container.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    container.style.opacity = '0';
    container.style.transform = 'translateY(5px)';

    // 等待淡出完成
    await new Promise(resolve => setTimeout(resolve, 150));

    // 执行内容更新
    await changeFn();

    // 添加淡入和滑动效果
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';

    // 等待淡入完成
    await new Promise(resolve => setTimeout(resolve, 150));

    // 清除transform属性
    container.style.transform = '';

    this.isAnimating = false;
  }

  /**
   * 渲染UP主项 - 主方法
   */
  private async renderCreatorItem(creator: Creator): Promise<HTMLElement> {
    console.log(`[UpListManager] 开始渲染创作者项 (creatorId: ${creator.creatorId}, name: ${creator.name})`);
    const creatorElement = document.createElement("div");
    creatorElement.className = "up-item";
    creatorElement.dataset.mid = String(creator.creatorId);
    console.log(`[UpListManager] 创建了创作者元素 (creatorId: ${creator.creatorId}, mid: ${creatorElement.dataset.mid})`);

    // 添加头像
    const avatarContainer = await this.createAvatarElement(creator);
    creatorElement.appendChild(avatarContainer);

    // 添加UP主信息
    const creatorInfo = await this.createCreatorInfoElement(creator);
    creatorElement.appendChild(creatorInfo);

    // 添加拖放事件处理
    this.setupDragDropHandlers(creatorElement, creator);

    return creatorElement;
  }

  /**
   * 创建头像元素
   */
  private async createAvatarElement(creator: Creator): Promise<HTMLElement> {
    const avatarContainer = document.createElement("div");
    avatarContainer.className = "up-avatar-container";

    const avatarImg = document.createElement("img");
    avatarImg.className = "up-avatar";
    avatarImg.alt = creator.name;
    avatarImg.loading = "lazy";

    // 尝试加载头像
    try {
      const avatarBlob = await this.services.creatorRepo.getAvatarBinary(creator.creatorId);
      if (avatarBlob) {
        const avatarUrl = URL.createObjectURL(avatarBlob);
        avatarImg.src = avatarUrl;
        avatarImg.onload = () => {
          URL.revokeObjectURL(avatarUrl);
        };
      } else {
        avatarImg.src = this.getDefaultAvatar();
      }
    } catch (error) {
      console.error(`[UpListManager] 加载头像失败 (creatorId: ${creator.creatorId}):`, error);
      avatarImg.src = this.getDefaultAvatar();
    }

    avatarContainer.appendChild(avatarImg);
    return avatarContainer;
  }

  /**
   * 获取默认头像URL
   */
  private getDefaultAvatar(): string {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23ccc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='60' fill='%23666'%3E%3F%3C/text%3E%3C/svg%3E";
  }

  /**
   * 创建UP主信息元素
   */
  private async createCreatorInfoElement(creator: Creator): Promise<HTMLElement> {
    const creatorInfo = document.createElement("div");
    creatorInfo.className = "up-info";

    // 添加名称和关注状态
    const nameRow = this.createNameRow(creator);
    creatorInfo.appendChild(nameRow);

    // 添加简介
    if (creator.description) {
      const creatorDesc = this.createDescriptionElement(creator.description);
      creatorInfo.appendChild(creatorDesc);
    }

    // 添加标签
    if (creator.tagWeights && creator.tagWeights.length > 0) {
      const tagsContainer = await this.createTagsContainer(creator);
      creatorInfo.appendChild(tagsContainer);
    }

    return creatorInfo;
  }

  /**
   * 创建名称和关注状态行
   */
  private createNameRow(creator: Creator): HTMLElement {
    const nameRow = document.createElement("div");
    nameRow.className = "up-name-row";

    const creatorName = document.createElement("div");
    creatorName.className = "up-name";
    creatorName.textContent = creator.name;
    nameRow.appendChild(creatorName);

    const followBadge = document.createElement("span");
    followBadge.className = creator.isFollowing ? "up-follow-badge followed" : "up-follow-badge unfollowed";
    followBadge.textContent = creator.isFollowing ? "已关注" : "未关注";
    nameRow.appendChild(followBadge);

    return nameRow;
  }

  /**
   * 创建简介元素
   */
  private createDescriptionElement(description: string): HTMLElement {
    const creatorDesc = document.createElement("div");
    creatorDesc.className = "up-description";
    creatorDesc.textContent = description.length > 100
      ? description.substring(0, 100) + "..."
      : description;
    return creatorDesc;
  }

  /**
   * 创建标签容器
   */
  private async createTagsContainer(creator: Creator): Promise<HTMLElement> {
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "up-tags";

    // 按权重排序，取前5个标签
    const sortedTags = [...creator.tagWeights]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 获取标签名称
    const tagIds = sortedTags.map(t => t.tagId);
    const tagsMap = await this.services.tagRepo.getTags(tagIds);

    // 分离user标签和system标签
    const userTags = sortedTags.filter(t => t.source === 'user');
    const systemTags = sortedTags
      .filter(t => t.source === 'system')
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 渲染user标签
    for (const tagWeight of userTags) {
      const tag = tagsMap.get(tagWeight.tagId);
      const tagName = tag?.name || String(tagWeight.tagId);
      const tagElement = this.createUserTagElement(tagWeight, tagName, creator.creatorId);
      tagsContainer.appendChild(tagElement);
    }

    // 如果两种标签都存在，添加分隔符
    if (userTags.length > 0 && systemTags.length > 0) {
      const divider = document.createElement("span");
      divider.className = "tag-divider";
      tagsContainer.appendChild(divider);
    }

    // 渲染system标签
    for (const tagWeight of systemTags) {
      const tag = tagsMap.get(tagWeight.tagId);
      const tagName = tag?.name || String(tagWeight.tagId);
      const tagElement = this.createSystemTagElement(tagWeight, tagName, creator.creatorId);
      tagsContainer.appendChild(tagElement);
    }

    return tagsContainer;
  }

  /**
   * 创建用户标签元素
   */
  private createUserTagElement(tagWeight: any, tagName: string, creatorId: number): HTMLElement {
    const tagElement = document.createElement("span");
    tagElement.className = "tag-pill";
    tagElement.textContent = tagName;
    tagElement.style.backgroundColor = colorFromTag(tagName);
    tagElement.draggable = true;

    // 设置拖拽开始事件
    tagElement.addEventListener('dragstart', (e) => {
      const context: DragContext = {
        tagId: tagWeight.tagId,
        tagName,
        originUpMid: creatorId,
        dropped: false,
        isFilterTag: false,
        isSystemTag: false
      };
      setDragContext(context);
      createDragGhost(e as DragEvent, tagName);
    });

    // 设置拖拽结束事件
    tagElement.addEventListener('dragend', async (e) => {
      setTimeout(async () => {
        const context = getDragContext();
        if (context && !context.dropped && context.originUpMid === creatorId) {
          try {
            const tag = await this.services.tagRepo.getTag(context.tagId);
            if (tag && this.currentState) {
              await this.services.creatorRepo.removeTag(creatorId, tag);
              tagElement.remove();
            }
          } catch (error) {
            console.error('[UpListManager] 删除UP标签失败:', error);
          }
        }
      }, 0);
    });

    return tagElement;
  }

  /**
   * 创建系统标签元素
   */
  private createSystemTagElement(tagWeight: any, tagName: string, creatorId: number): HTMLElement {
    const tagElement = document.createElement("span");
    tagElement.className = "tag-pill";
    tagElement.textContent = `${tagName}${tagWeight.count > 0 ? ` (${tagWeight.count})` : ''}`;
    tagElement.style.backgroundColor = colorFromTag(tagName);
    tagElement.style.opacity = "0.6";
    tagElement.draggable = true;

    tagElement.addEventListener('dragstart', (e) => {
      const context: DragContext = {
        tagId: tagWeight.tagId,
        tagName,
        originUpMid: creatorId,
        dropped: false,
        isFilterTag: false,
        isSystemTag: true
      };
      setDragContext(context);
      createDragGhost(e as DragEvent, tagName);
    });

    return tagElement;
  }

  /**
   * 设置拖放事件处理
   */
  private setupDragDropHandlers(creatorElement: HTMLElement, creator: Creator): void {
    // 拖拽进入事件
    creatorElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      creatorElement.classList.add('drag-over');
    });

    // 拖拽离开事件
    creatorElement.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!creatorElement.contains(e.relatedTarget as Node)) {
        creatorElement.classList.remove('drag-over');
      }
    });

    // 放置事件
    creatorElement.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      creatorElement.classList.remove('drag-over');

      const context = getDragContext();
      if (!context || !context.tagId) {
        return;
      }

      // 如果拖拽的是过滤区标签或系统标签，不处理
      if (context.isFilterTag || context.isSystemTag) {
        context.dropped = true;
        setDragContext(context);
        return;
      }

      // 处理标签放置
      await this.handleTagDrop(context, creatorElement, creator);
    });
  }

  /**
   * 处理标签放置
   */
  private async handleTagDrop(context: DragContext, creatorElement: HTMLElement, creator: Creator): Promise<void> {
    // 如果拖拽的是user标签，并且来源UP不是当前UP
    if (context.originUpMid && context.originUpMid !== creator.creatorId) {
      await this.addTagToCreator(context, creatorElement, creator);
    } else if (!context.originUpMid) {
      // 如果拖拽的是标签列表中的标签（没有originUpMid），添加到当前UP
      await this.addTagToCreator(context, creatorElement, creator);
    }
  }

  /**
   * 添加标签到UP主
   */
  private async addTagToCreator(context: DragContext, creatorElement: HTMLElement, creator: Creator): Promise<void> {
    try {
      const tag = await this.services.tagRepo.getTag(context.tagId);
      if (tag && this.currentState) {
        await this.services.creatorRepo.addTag(creator.creatorId, tag);
        context.dropped = true;
        setDragContext(context);

        const tagsContainer = creatorElement.querySelector('.up-tags');
        if (tagsContainer) {
          const newTagElement = this.createDroppedTagElement(context, creator.creatorId);
          this.insertTagElement(tagsContainer, newTagElement);
        }
      }
    } catch (error) {
      console.error('[UpListManager] 添加标签到UP失败:', error);
    }
  }

  /**
   * 创建放置后的标签元素
   */
  private createDroppedTagElement(context: DragContext, creatorId: number): HTMLElement {
    const newTagElement = document.createElement("span");
    newTagElement.className = "tag-pill";
    newTagElement.textContent = context.tagName;
    newTagElement.style.backgroundColor = colorFromTag(context.tagName);
    newTagElement.draggable = true;

    // 添加拖拽事件
    newTagElement.addEventListener('dragstart', (e) => {
      const newContext: DragContext = {
        tagId: context.tagId,
        tagName: context.tagName,
        originUpMid: creatorId,
        dropped: false,
        isFilterTag: false
      };
      setDragContext(newContext);
      createDragGhost(e as DragEvent, context.tagName);
    });

    // 添加拖拽结束事件
    newTagElement.addEventListener('dragend', async (e) => {
      setTimeout(async () => {
        const dragContext = getDragContext();
        if (dragContext && !dragContext.dropped && dragContext.originUpMid === creatorId) {
          try {
            const tagToRemove = await this.services.tagRepo.getTag(dragContext.tagId);
            if (tagToRemove && this.currentState) {
              await this.services.creatorRepo.removeTag(creatorId, tagToRemove);
              newTagElement.remove();
            }
          } catch (error) {
            console.error('[UpListManager] 删除UP标签失败:', error);
          }
        }
      }, 0);
    });

    return newTagElement;
  }

  /**
   * 插入标签元素到容器
   */
  private insertTagElement(tagsContainer: Element, newTagElement: HTMLElement): void {
    const hasUserTags = tagsContainer.querySelectorAll('.tag-pill:not([style*="opacity"])').length > 0;
    const hasSystemTags = tagsContainer.querySelectorAll('.tag-pill[style*="opacity"]').length > 0;

    if (hasUserTags && !hasSystemTags) {
      // 如果只有user标签，直接添加
      tagsContainer.appendChild(newTagElement);
    } else if (!hasUserTags && hasSystemTags) {
      // 如果只有system标签，先添加分隔符，再添加标签
      const divider = document.createElement("span");
      divider.className = "tag-divider";
      tagsContainer.insertBefore(divider, tagsContainer.firstChild);
      tagsContainer.insertBefore(newTagElement, divider);
    } else if (hasUserTags && hasSystemTags) {
      // 如果两种标签都存在，找到分隔符，插入到分隔符之前
      const divider = tagsContainer.querySelector('.tag-divider');
      if (divider) {
        tagsContainer.insertBefore(newTagElement, divider);
      } else {
        tagsContainer.appendChild(newTagElement);
      }
    } else {
      tagsContainer.appendChild(newTagElement);
    }
  }

  /**
   * 更新分页控件状态
   */
  private renderPagination(
    total: number,
    currentPage: number,
    totalPages: number,
    rerender: RenderFn
  ): void {
    const paginationContainer = document.getElementById("up-pagination");
    if (!paginationContainer) return;

    // 获取或初始化分页控件元素，确保顺序为：上一页 - 页码 - 下一页
    const prevBtn = this.getOrCreatePaginationButton(paginationContainer, 'prev-btn', '上一页');
    const pageInfo = this.getOrCreatePaginationInfo(paginationContainer);
    const nextBtn = this.getOrCreatePaginationButton(paginationContainer, 'next-btn', '下一页');

    // 更新上一页按钮状态
    prevBtn.disabled = currentPage === 0;

    // 更新页码信息
    pageInfo.textContent = `${currentPage + 1} / ${totalPages || 1}`;

    // 更新下一页按钮状态
    nextBtn.disabled = currentPage >= totalPages - 1;

    // 移除旧的事件监听器并添加新的
    this.updatePaginationEventHandlers(prevBtn, nextBtn, currentPage, totalPages, rerender);
  }

  /**
   * 滚动列表到顶部
   */
  private scrollToTop(): void {
    const container = this.getContainer();
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * 获取或创建分页按钮
   */
  private getOrCreatePaginationButton(container: HTMLElement, id: string, text: string): HTMLButtonElement {
    let btn = document.getElementById(id) as HTMLButtonElement;
    if (!btn) {
      btn = document.createElement("button");
      btn.id = id;
      btn.className = "pagination-btn";
      btn.textContent = text;

      // 根据按钮ID确定插入位置
      if (id === 'prev-btn') {
        // 上一页按钮始终在最前面
        container.insertBefore(btn, container.firstChild);
      } else if (id === 'next-btn') {
        // 下一页按钮在页码信息之后
        const pageInfo = document.getElementById("pagination-info");
        if (pageInfo) {
          container.insertBefore(btn, pageInfo.nextSibling);
        } else {
          container.appendChild(btn);
        }
      }
    }
    return btn;
  }

  /**
   * 获取或创建分页信息元素
   */
  private getOrCreatePaginationInfo(container: HTMLElement): HTMLElement {
    let info = document.getElementById("pagination-info");
    if (!info) {
      info = document.createElement("span");
      info.id = "pagination-info";
      info.className = "pagination-info";

      // 将页码信息插入到上一页按钮之后
      const prevBtn = document.getElementById("prev-btn");
      if (prevBtn) {
        container.insertBefore(info, prevBtn.nextSibling);
      } else {
        container.appendChild(info);
      }
    }
    return info;
  }

  /**
   * 更新分页按钮的事件处理器
   */
  private updatePaginationEventHandlers(
    prevBtn: HTMLButtonElement,
    nextBtn: HTMLButtonElement,
    currentPage: number,
    totalPages: number,
    rerender: RenderFn
  ): void {
    // 移除旧的事件监听器（通过克隆节点）
    const newPrevBtn = prevBtn.cloneNode(true) as HTMLButtonElement;
    const newNextBtn = nextBtn.cloneNode(true) as HTMLButtonElement;
    prevBtn.parentNode?.replaceChild(newPrevBtn, prevBtn);
    nextBtn.parentNode?.replaceChild(newNextBtn, nextBtn);

    // 添加新的事件监听器
    newPrevBtn.addEventListener("click", () => {
      if (currentPage > 0) {
        this.services.paginationState.currentPage = currentPage - 1;
        this.scrollToTop();
        rerender();
      }
    });

    newNextBtn.addEventListener("click", () => {
      if (currentPage < totalPages - 1) {
        this.services.paginationState.currentPage = currentPage + 1;
        this.scrollToTop();
        rerender();
      }
    });
  }

  /**
   * 刷新UP列表
   */
  async refreshUpList(state: StatsState): Promise<void> {
    await this.renderUpList(state);
    updateToggleLabel(state.showFollowedOnly);
  }
}
