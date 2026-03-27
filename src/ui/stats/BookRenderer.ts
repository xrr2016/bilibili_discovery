
/**
 * Book渲染器
 * 与Book实例深度绑定，负责管理渲染和缓存
 * Book负责提供数据和分页，BookRenderer负责将数据转换成DOM元素并实现预加载机制
 */

import type { Creator } from "../../database/types/index.js";
import type { Book } from "../../database/query-server/book/types.js";
import type { BookQueryOptions } from "../../database/query-server/book/types.js";
import type { BookQueryResult } from "../../database/query-server/book/types.js";

/**
 * 渲染配置选项
 */
export interface RenderOptions {
  /** 是否启用预加载 */
  enablePreload?: boolean;
  /** 预加载的页数 */
  preloadCount?: number;
  /** 是否启用动画 */
  enableAnimation?: boolean;
  /** 动画延迟（毫秒） */
  animationDelay?: number;
}

/**
 * 渲染页面结果
 */
export interface RenderPageResult {
  /** 渲染的元素列表 */
  elements: HTMLElement[];
  /** 分页状态 */
  state: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalRecords: number;
  };
  /** 是否来自缓存 */
  fromCache: boolean;
}

/**
 * Book渲染器
 */
export class BookRenderer<T = Creator> {
  private book: Book<T>;
  private cachedPages: Map<number, HTMLElement[]> = new Map();
  private currentCondition: any = null;
  private isAnimating = false;
  private options: Required<RenderOptions>;

  constructor(book: Book<T>, options: RenderOptions = {}) {
    this.book = book;
    this.options = {
      enablePreload: options.enablePreload ?? true,
      preloadCount: options.preloadCount ?? 1,
      enableAnimation: options.enableAnimation ?? true,
      animationDelay: options.animationDelay ?? 150
    };
  }

  /**
   * 渲染指定页面
   */
  async renderPage(
    pageNumber: number,
    renderFn: (items: T[]) => Promise<HTMLElement[]>
  ): Promise<RenderPageResult> {
    // 如果正在动画中，忽略此次请求
    if (this.isAnimating && this.options.enableAnimation) {
      throw new Error('Animation in progress');
    }

    // 检查是否已缓存该页面
    if (this.cachedPages.has(pageNumber)) {
      console.log(`[BookRenderer] 使用缓存的页面 ${pageNumber}`);
      return {
        elements: this.cachedPages.get(pageNumber)!,
        state: this.book.state,
        fromCache: true
      };
    }

    // 获取页面数据
    const queryOptions: BookQueryOptions = {
      preloadNext: this.options.enablePreload,
      preloadCount: this.options.preloadCount
    };

    const result = await this.book.getPage(pageNumber, queryOptions);

    // 渲染数据为DOM元素
    const elements = await renderFn(result.items);

    // 缓存渲染结果
    this.cachedPages.set(pageNumber, elements);

    console.log(`[BookRenderer] 页面 ${pageNumber} 渲染完成，共 ${elements.length} 个元素`);

    return {
      elements,
      state: result.state,
      fromCache: false
    };
  }

  /**
   * 预加载指定页面
   */
  async preloadPage(
    pageNumber: number,
    renderFn: (items: T[]) => Promise<HTMLElement[]>
  ): Promise<void> {
    // 如果已经缓存，跳过
    if (this.cachedPages.has(pageNumber)) {
      return;
    }

    try {
      // 获取页面数据（不预加载下一页）
      const result = await this.book.getPage(pageNumber, { preloadNext: false });

      // 渲染数据为DOM元素
      const elements = await renderFn(result.items);

      // 缓存渲染结果
      this.cachedPages.set(pageNumber, elements);

      console.log(`[BookRenderer] 页面 ${pageNumber} 预加载完成`);
    } catch (error) {
      console.warn(`[BookRenderer] 页面 ${pageNumber} 预加载失败:`, error);
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cachedPages.clear();
    console.log('[BookRenderer] 缓存已清空');
  }

  /**
   * 清除指定页面的缓存
   */
  clearPageCache(pageNumber: number): void {
    this.cachedPages.delete(pageNumber);
    console.log(`[BookRenderer] 页面 ${pageNumber} 缓存已清除`);
  }

  /**
   * 获取当前分页状态
   */
  getState() {
    return this.book.state;
  }

  /**
   * 更新查询条件
   */
  async updateCondition(condition: any): Promise<void> {
    // 如果条件相同，不更新
    if (JSON.stringify(condition) === JSON.stringify(this.currentCondition)) {
      return;
    }

    this.currentCondition = condition;

    // 更新Book的索引
    await this.book.updateIndex(condition);

    // 清除缓存
    this.clearCache();
  }

  /**
   * 设置动画状态
   */
  setAnimating(animating: boolean): void {
    this.isAnimating = animating;
  }

  /**
   * 获取动画状态
   */
  getAnimating(): boolean {
    return this.isAnimating;
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.clearCache();
    this.currentCondition = null;
    console.log('[BookRenderer] 渲染器已销毁');
  }
}
