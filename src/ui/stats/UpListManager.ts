/**
 * UP列表管理器
 * 负责UP主列表的渲染和交互
 */

import {
  bookManager,
  type BookType,
  type IDataRepository,
  type IQueryService
} from "../../database/index.js";
import type { Creator } from "../../database/types/index.js";
import type { CreatorIndex } from "../../database/query-server/cache/types.js";
import type { CompositeQueryCondition, QueryCondition } from "../../database/query-server/query/types.js";
import type { ServiceContainer } from "./services.js";
import type { StatsState } from "./types.js";
import { updateToggleLabel } from "../../utls/dom-utils.js";
import { colorFromTag } from "../../utls/tag-utils.js";
import { createDragGhost, setDragContext, getDragContext, type DragContext } from "../../utls/drag-utils.js";

type RenderFn = () => void;

/**
 * UP列表管理器
 */
export class UpListManager {
  private services: ServiceContainer;
  private currentState: StatsState | null = null;

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

    // 获取或创建Book实例
    const currentBook = await this.getOrCreateBook(queryCondition);

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
   * 获取或创建Book实例
   */
  private async getOrCreateBook(condition: QueryCondition): Promise<BookType<Creator>> {
    if (this.services.creatorBook) {
      // 更新现有Book的索引
      await this.services.creatorBook.updateIndex(condition);
      return this.services.creatorBook;
    }

    // 创建新的Book实例
    const services = this.services;
    const queryServiceAdapter = new class implements IQueryService<CreatorIndex> {
      async queryIds(condition: QueryCondition): Promise<number[]> {
        return await services.creatorQueryService.queryResultIds(condition);
      }
    };

    const bookConfig = {
      repository: this.services.creatorRepo as unknown as IDataRepository<Creator>,
      queryService: queryServiceAdapter
      // 不指定pageSize，让Book使用默认值（20）
    };

    this.services.creatorBook = await bookManager.createBook(condition, bookConfig);
    return this.services.creatorBook;
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

    const container = document.getElementById("up-list");
    if (!container) {
      console.warn(`[UpListManager] 找不到up-list容器`);
      return;
    }

    // 显示加载状态
    container.innerHTML = '<div class="loading">加载中...</div>';

    try {
      const { creators, total } = await this.getFilteredCreators(state);

      // 更新分页状态
      this.services.paginationState.totalItems = total;

      // 清空容器
      console.log(`[UpListManager] 清空容器前，容器中有 ${container.children.length} 个元素`);
      container.innerHTML = "";

      // 渲染UP列表
      console.log(`[UpListManager] 开始渲染UP列表，共 ${creators.length} 个创作者`);
      const creatorIds = new Set<number>();
      for (const creator of creators) {
        if (creatorIds.has(creator.creatorId)) {
          console.warn(`[UpListManager] 发现重复的创作者 (creatorId: ${creator.creatorId})`);
          continue;
        }
        creatorIds.add(creator.creatorId);
        const creatorElement = await this.renderCreatorItem(creator);
        container.appendChild(creatorElement);
      }
      console.log(`[UpListManager] UP列表渲染完成，实际渲染 ${creatorIds.size} 个创作者`);
      console.log(`[UpListManager] 渲染完成后，容器中有 ${container.children.length} 个元素`);

      // 渲染分页控件到独立容器
      this.renderPagination(total, this.services.paginationState.currentPage, this.services.paginationState.totalPages, () => {
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
   * 渲染UP主项
   */
  private async renderCreatorItem(creator: Creator): Promise<HTMLElement> {
    console.log(`[UpListManager] 开始渲染创作者项 (creatorId: ${creator.creatorId}, name: ${creator.name})`);
    const creatorElement = document.createElement("div");
    creatorElement.className = "up-item";
    creatorElement.dataset.mid = String(creator.creatorId);
    console.log(`[UpListManager] 创建了创作者元素 (creatorId: ${creator.creatorId}, mid: ${creatorElement.dataset.mid})`);

    // 创建头像元素
    const avatarContainer = document.createElement("div");
    avatarContainer.className = "up-avatar-container";
    
    // 创建头像图片元素
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
        // 当图片加载完成后，释放URL对象
        avatarImg.onload = () => {
          URL.revokeObjectURL(avatarUrl);
        };
      } else {
        // 如果没有头像，显示默认头像
        avatarImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23ccc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='60' fill='%23666'%3E%3F%3C/text%3E%3C/svg%3E";
      }
    } catch (error) {
      console.error(`[UpListManager] 加载头像失败 (creatorId: ${creator.creatorId}):`, error);
      // 加载失败时显示默认头像
      avatarImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23ccc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='60' fill='%23666'%3E%3F%3C/text%3E%3C/svg%3E";
    }
    
    avatarContainer.appendChild(avatarImg);
    creatorElement.appendChild(avatarContainer);

    // 创建UP主信息元素
    const creatorInfo = document.createElement("div");
    creatorInfo.className = "up-info";

    // 名称和关注状态
    const nameRow = document.createElement("div");
    nameRow.className = "up-name-row";

    const creatorName = document.createElement("div");
    creatorName.className = "up-name";
    creatorName.textContent = creator.name;
    nameRow.appendChild(creatorName);

    // 关注状态标签
    const followBadge = document.createElement("span");
    followBadge.className = creator.isFollowing ? "up-follow-badge followed" : "up-follow-badge unfollowed";
    followBadge.textContent = creator.isFollowing ? "已关注" : "未关注";
    nameRow.appendChild(followBadge);

    creatorInfo.appendChild(nameRow);

    // 简介显示
    if (creator.description) {
      const creatorDesc = document.createElement("div");
      creatorDesc.className = "up-description";
      creatorDesc.textContent = creator.description.length > 100
        ? creator.description.substring(0, 100) + "..."
        : creator.description;
      creatorInfo.appendChild(creatorDesc);
    }

    // 标签显示
    if (creator.tagWeights && creator.tagWeights.length > 0) {
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

        const tagElement = document.createElement("span");
        tagElement.className = "tag-pill";
        tagElement.textContent = tagName;
        tagElement.style.backgroundColor = colorFromTag(tagName);
        tagElement.draggable = true;

        tagElement.addEventListener('dragstart', (e) => {
          const context: DragContext = {
            tagId: tagWeight.tagId,
            tagName,
            originUpMid: creator.creatorId,
            dropped: false,
            isFilterTag: false,
            isSystemTag: false
          };
          setDragContext(context);
          createDragGhost(e as DragEvent, tagName);
        });

        // 拖拽结束事件
        tagElement.addEventListener('dragend', async (e) => {
          // 使用setTimeout确保drop事件先执行
          setTimeout(async () => {
            const context = getDragContext();
            if (context && !context.dropped && context.originUpMid === creator.creatorId) {
              // 如果拖拽没有被放置到任何区域，并且来源UP是当前UP，则删除标签
              try {
                // 获取标签对象
                const tag = await this.services.tagRepo.getTag(context.tagId);
                if (tag && this.currentState) {
                  await this.services.creatorRepo.removeTag(creator.creatorId, tag);
                  // 局部刷新：只移除当前标签元素
                  tagElement.remove();
                }
              } catch (error) {
                console.error('[UpListManager] 删除UP标签失败:', error);
              }
            }
          }, 0);
        });

        tagsContainer.appendChild(tagElement);
      }

      // 如果两种标签都存在，添加分隔符
      if (userTags.length > 0 && systemTags.length > 0) {
        const divider = document.createElement("span");
        divider.className = "tag-divider";
        tagsContainer.appendChild(divider);
      }

      // 渲染system标签（最多5个，按计数器排序）
      for (const tagWeight of systemTags) {
        const tag = tagsMap.get(tagWeight.tagId);
        const tagName = tag?.name || String(tagWeight.tagId);

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
            originUpMid: creator.creatorId,
            dropped: false,
            isFilterTag: false,
            isSystemTag: true
          };
          setDragContext(context);
          createDragGhost(e as DragEvent, tagName);
        });

        tagsContainer.appendChild(tagElement);
      }

      creatorInfo.appendChild(tagsContainer);
    }

    // 添加拖放事件处理
    creatorElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      creatorElement.classList.add('drag-over');
    });

    creatorElement.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!creatorElement.contains(e.relatedTarget as Node)) {
        creatorElement.classList.remove('drag-over');
      }
    });

    creatorElement.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      creatorElement.classList.remove('drag-over');

      const context = getDragContext();
      if (!context || !context.tagId) {
        return;
      }

      // 如果拖拽的是过滤区标签，不处理
      if (context.isFilterTag) {
        context.dropped = true;
        setDragContext(context);
        return;
      }

      // 如果拖拽的是system标签，不处理
      if (context.isSystemTag) {
        context.dropped = true;
        setDragContext(context);
        return;
      }

      // 如果拖拽的是user标签，并且来源UP不是当前UP
      if (context.originUpMid && context.originUpMid !== creator.creatorId) {
        try {
          // 获取标签对象
          const tag = await this.services.tagRepo.getTag(context.tagId);
          if (tag && this.currentState) {
            // 将标签添加到当前UP
            await this.services.creatorRepo.addTag(creator.creatorId, tag);
            // 标记已放置，防止触发删除
            context.dropped = true;
            setDragContext(context);
            // 局部刷新：只添加标签到当前UP的标签容器
            const tagsContainer = creatorElement.querySelector('.up-tags');
            if (tagsContainer) {
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
                  originUpMid: creator.creatorId,
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
                  if (dragContext && !dragContext.dropped && dragContext.originUpMid === creator.creatorId) {
                    try {
                      const tagToRemove = await this.services.tagRepo.getTag(dragContext.tagId);
                      if (tagToRemove && this.currentState) {
                        await this.services.creatorRepo.removeTag(creator.creatorId, tagToRemove);
                        newTagElement.remove();
                      }
                    } catch (error) {
                      console.error('[UpListManager] 删除UP标签失败:', error);
                    }
                  }
                }, 0);
              });

              // 检查是否需要添加分隔符
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
          }
        } catch (error) {
          console.error('[UpListManager] 添加标签到UP失败:', error);
        }
      } else if (!context.originUpMid) {
        // 如果拖拽的是标签列表中的标签（没有originUpMid），添加到当前UP
        try {
          const tag = await this.services.tagRepo.getTag(context.tagId);
          if (tag && this.currentState) {
            await this.services.creatorRepo.addTag(creator.creatorId, tag);
            context.dropped = true;
            setDragContext(context);
            // 局部刷新：只添加标签到当前UP的标签容器
            const tagsContainer = creatorElement.querySelector('.up-tags');
            if (tagsContainer) {
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
                  originUpMid: creator.creatorId,
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
                  if (dragContext && !dragContext.dropped && dragContext.originUpMid === creator.creatorId) {
                    try {
                      const tagToRemove = await this.services.tagRepo.getTag(dragContext.tagId);
                      if (tagToRemove && this.currentState) {
                        await this.services.creatorRepo.removeTag(creator.creatorId, tagToRemove);
                        newTagElement.remove();
                      }
                    } catch (error) {
                      console.error('[UpListManager] 删除UP标签失败:', error);
                    }
                  }
                }, 0);
              });

              // 检查是否需要添加分隔符
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
                // 如果两种标签都存在，找到分隔符，找到第一个system标签，插入到分隔符之前
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
          }
        } catch (error) {
          console.error('[UpListManager] 添加标签到UP失败:', error);
        }
      }
    });

    creatorElement.appendChild(creatorInfo);
    return creatorElement;
  }

  /**
   * 渲染分页控件
   */
  private renderPagination(
    total: number,
    currentPage: number,
    totalPages: number,
    rerender: RenderFn
  ): void {
    const paginationContainer = document.getElementById("up-pagination");
    if (!paginationContainer) return;

    paginationContainer.innerHTML = "";

    // 上一页按钮
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "上一页";
    prevBtn.disabled = currentPage === 0;
    prevBtn.addEventListener("click", () => {
      if (currentPage > 0) {
        this.services.paginationState.currentPage = currentPage - 1;
        rerender();
      }
    });
    paginationContainer.appendChild(prevBtn);

    // 页码信息
    const pageInfo = document.createElement("span");
    pageInfo.className = "pagination-info";
    pageInfo.textContent = `${currentPage + 1} / ${totalPages || 1}`;
    paginationContainer.appendChild(pageInfo);

    // 下一页按钮
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "下一页";
    nextBtn.disabled = currentPage >= totalPages - 1;
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages - 1) {
        this.services.paginationState.currentPage = currentPage + 1;
        rerender();
      }
    });
    paginationContainer.appendChild(nextBtn);
  }

  /**
   * 刷新UP列表
   */
  async refreshUpList(state: StatsState): Promise<void> {
    await this.renderUpList(state);
    updateToggleLabel(state.showFollowedOnly);
  }
}
