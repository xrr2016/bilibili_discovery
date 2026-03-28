/**
 * 标签管理器
 * 负责标签列表的渲染和交互
 */

import type { TagInfo } from "./types.js";
import type { Tag } from "../../database/types/semantic.js";
import type { TagQueryCondition } from "../../database/query-server/cache/types.js";
import type { ServiceContainer } from "./services.js";
import { TagSource } from "../../database/types/base.js";
import { RenderBook } from "../../renderer/RenderBook.js";
import { TagElementBuilder } from "./TagElementBuilder.js";
import { TagListRender } from "./TagListRender.js";

/**
 * 标签管理器
 */
export class TagManager {
  private services: ServiceContainer;
  private currentKeyword = "";
  private tagListRender: TagListRender | null = null;

  constructor(services: ServiceContainer) {
    this.services = services;
  }

  /**
   * 获取标签页数据
   */
  private async getTagsByPage(page: number, options: { pageSize?: number } = {}): Promise<{
    items: TagInfo[];
    state: {
      currentPage: number;
      totalPages: number;
      pageSize: number;
      totalRecords: number;
    };
  }> {
    // 使用container的getTagBook方法获取Book实例
    const tagBook = await this.services.getTagBook();
    const result = await tagBook.getPage(page, options);

    // 转换为TagInfo格式
    const items = result.items.map(tag => ({
      tagId: tag.tagId,
      name: tag.name,
      source: tag.source
    }));

    return {
      items,
      state: result.state
    };
  }

  /**
   * 初始化标签Book
   */
  private async initTagBook(condition?: TagQueryCondition): Promise<void> {
    // 使用container的getTagBook方法
    await this.services.getTagBook(condition);
  }

  /**
   * 渲染标签列表
   */
  async renderTagList(keyword: string = "", page: number = 0): Promise<void> {
    const container = document.getElementById("tag-list");
    if (!container) return;

    const normalizedKeyword = keyword.trim();
    const condition = normalizedKeyword ? { keyword: normalizedKeyword } : undefined;

    if (!this.tagListRender) {
      const tagBook = await this.services.getTagBook(condition);
      const renderBook = new RenderBook<Tag, HTMLElement>({
        book: tagBook,
        elementBuilder: new TagElementBuilder(),
        maxCachePages: 3
      });

      this.tagListRender = new TagListRender({
        container,
        renderBook,
        autoRender: false
      });
      this.currentKeyword = normalizedKeyword;
      await this.tagListRender.initialize(page);
      return;
    }

    if (normalizedKeyword === this.currentKeyword) {
      await this.tagListRender.goToPage(page);
      return;
    }

    this.currentKeyword = normalizedKeyword;
    this.tagListRender.setTargetPage(page);
    await this.initTagBook(condition);
  }

  /**
   * 创建新标签
   */
  async createTag(name: string): Promise<number> {
    const tagId = await this.services.tagRepo.createTag(name, TagSource.USER);

    // 清空标签查询索引缓存和Book实例，确保新标签会出现在列表中
    this.services.tagQueryService.clearIndexCache();
    this.services.resetBooks();
    this.destroyRenderChain();

    return tagId;
  }

  /**
   * 根据名称获取或创建标签
   */
  async ensureTag(name: string): Promise<{ tagId: number; created: boolean }> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error("标签名称不能为空");
    }

    const existing = await this.services.tagRepo.findTagByName(normalizedName);
    if (existing) {
      return { tagId: existing.tagId, created: false };
    }

    const tagId = await this.createTag(normalizedName);
    return { tagId, created: true };
  }

  /**
   * 获取所有标签（兼容旧接口）
   */
  async getAllTags(): Promise<TagInfo[]> {
    const result = await this.getTagsByPage(0, { pageSize: Number.MAX_SAFE_INTEGER });
    return result.items;
  }

  /**
   * 搜索标签（兼容旧接口）
   */
  async searchTags(keyword: string): Promise<TagInfo[]> {
    await this.initTagBook({ keyword });
    const result = await this.getTagsByPage(0, { pageSize: Number.MAX_SAFE_INTEGER });
    return result.items;
  }

  /**
   * 批量获取标签
   */
  async getTagsByIds(tagIds: number[]): Promise<Map<number, TagInfo>> {
    const tags = await this.services.tagRepo.getTags(tagIds);
    const result = new Map<number, TagInfo>();
    tags.forEach(tag => {
      result.set(tag.tagId, {
        tagId: tag.tagId,
        name: tag.name,
        source: tag.source
      });
    });
    return result;
  }

  destroy(): void {
    this.destroyRenderChain();
    this.currentKeyword = "";
  }

  private destroyRenderChain(): void {
    if (this.tagListRender) {
      this.tagListRender.destroy();
      this.tagListRender = null;
    }
  }
}
