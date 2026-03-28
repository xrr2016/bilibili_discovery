/**
 * 服务容器 - 管理所有共享实例
 * 所有 Repository、Service 和 Book 实例通过此容器统一管理和注入
 */

import {
  CreatorRepository,
  TagRepository,
  CategoryRepositoryImpl,
  QueryService,
  bookManager,
  Platform,
  type Book,
  type BookType,
  type BookConfig
} from "../../database/index.js";
import { TagQueryService } from "../../database/query-server/query/tag-query-service.js";
import type { TagIndex } from "../../database/query-server/cache/types.js";
import type { CreatorIndex } from "../../database/query-server/cache/types.js";
import type { Tag } from "../../database/types/semantic.js";
import type { Creator } from "../../database/types/index.js";
import type { IQueryService, IDataRepository } from "../../database/query-server/book/base-book-manager.js";
import type { QueryCondition } from "../../database/query-server/query/types.js";
import type { TagQueryCondition } from "../../database/query-server/cache/types.js";

/**
 * 服务容器接口
 */
export interface ServiceContainer {
  // Repository 实例
  readonly creatorRepo: CreatorRepository;
  readonly tagRepo: TagRepository;
  readonly categoryRepo: CategoryRepositoryImpl;

  // QueryService 实例
  readonly creatorQueryService: QueryService;
  readonly tagQueryService: TagQueryService;

  // Book 实例
  creatorBook: BookType<Creator> | null;
  tagBook: Book<Tag> | null;

  // 分页状态
  paginationState: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };

  // Book获取方法
  getCreatorBook(condition: QueryCondition): Promise<BookType<Creator>>;
  getTagBook(condition?: TagQueryCondition): Promise<Book<Tag>>;

  // 重置方法
  resetBooks(): void;
  resetPagination(): void;
}

/**
 * 服务容器实现类
 * 负责创建和管理所有服务实例
 */
class ServiceContainerImpl implements ServiceContainer {
  private static instance: ServiceContainerImpl | null = null;

  // Repository 实例
  public readonly creatorRepo: CreatorRepository;
  public readonly tagRepo: TagRepository;
  public readonly categoryRepo: CategoryRepositoryImpl;

  // QueryService 实例
  public readonly creatorQueryService: QueryService;
  public readonly tagQueryService: TagQueryService;

  // Book 实例
  public creatorBook: BookType<Creator> | null = null;
  public tagBook: Book<Tag> | null = null;

  // 分页状态
  public paginationState: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };

  private constructor() {
    // 初始化Repository实例
    this.creatorRepo = new CreatorRepository();
    this.tagRepo = new TagRepository();
    this.categoryRepo = new CategoryRepositoryImpl();

    // 初始化QueryService实例
    this.creatorQueryService = new QueryService(this.creatorRepo);
    this.tagQueryService = new TagQueryService(this.tagRepo);

    // 初始化分页状态
    this.paginationState = {
      currentPage: 0,
      pageSize: 20,
      totalPages: 0,
      totalItems: 0
    };
  }

  /**
   * 获取服务容器的单例
   */
  public static getInstance(): ServiceContainerImpl {
    if (!ServiceContainerImpl.instance) {
      ServiceContainerImpl.instance = new ServiceContainerImpl();
    }
    return ServiceContainerImpl.instance;
  }

  /**
   * 重置服务容器
   */
  public static reset(): void {
    if (ServiceContainerImpl.instance) {
      ServiceContainerImpl.instance.resetBooks();
      ServiceContainerImpl.instance.resetPagination();
    }
    ServiceContainerImpl.instance = null;
  }

  /**
   * 获取或创建创作者Book实例
   */
  public async getCreatorBook(condition: QueryCondition): Promise<BookType<Creator>> {
    if (this.creatorBook) {
      // 更新现有Book的索引
      await this.creatorBook.updateIndex(condition);
      return this.creatorBook;
    }

    // 创建新的Book实例
    const queryServiceAdapter = new CreatorQueryServiceAdapter(this.creatorQueryService);
    const bookConfig: BookConfig<Creator, CreatorIndex> = {
      repository: this.creatorRepo as unknown as IDataRepository<Creator>,
      queryService: queryServiceAdapter
    };

    this.creatorBook = await bookManager.createBook(condition, bookConfig);
    return this.creatorBook;
  }

  /**
   * 获取或创建标签Book实例
   */
  public async getTagBook(condition?: TagQueryCondition): Promise<Book<Tag>> {
    const queryCondition: QueryCondition = condition
      ? { keyword: condition.keyword, platform: Platform.BILIBILI }
      : { platform: Platform.BILIBILI };

    if (this.tagBook) {
      // 无论是否带 keyword，都更新现有 Book 的索引
      await this.tagBook.updateIndex(queryCondition);
      return this.tagBook;
    }

    // 创建新的Book实例
    const queryServiceAdapter = new TagQueryServiceAdapter(this.tagQueryService);
    const bookConfig: BookConfig<Tag, TagIndex> = {
      repository: this.tagRepo as unknown as IDataRepository<Tag>,
      queryService: queryServiceAdapter
    };

    this.tagBook = await bookManager.createBook(queryCondition, bookConfig);
    return this.tagBook;
  }

  /**
   * 清空Book实例
   */
  public resetBooks(): void {
    this.creatorBook = null;
    this.tagBook = null;
  }

  /**
   * 重置分页状态
   */
  public resetPagination(): void {
    this.paginationState = {
      currentPage: 0,
      pageSize: 20,
      totalPages: 0,
      totalItems: 0
    };
  }
}

/**
 * 创建标签查询服务适配器
 * 将 TagQueryService 适配为 IQueryService 接口
 */
class TagQueryServiceAdapter implements IQueryService<TagIndex> {
  private queryService: TagQueryService;

  constructor(queryService: TagQueryService) {
    this.queryService = queryService;
  }

  async queryIds(condition: QueryCondition): Promise<number[]> {
    // 将QueryCondition转换为TagQueryCondition
    const cacheCondition: TagQueryCondition = {
      keyword: 'keyword' in condition ? condition.keyword : undefined,
      source: undefined // QueryCondition不包含source属性，标签查询不需要source
    };
    return await this.queryService.queryResultIds(cacheCondition);
  }
}

/**
 * 创建创作者查询服务适配器
 * 将 QueryService 适配为 IQueryService 接口
 */
class CreatorQueryServiceAdapter implements IQueryService<CreatorIndex> {
  private queryService: QueryService;

  constructor(queryService: QueryService) {
    this.queryService = queryService;
  }

  async queryIds(condition: QueryCondition): Promise<number[]> {
    return await this.queryService.queryResultIds(condition);
  }
}

/**
 * 获取全局服务容器
 */
export function getServiceContainer(): ServiceContainer {
  return ServiceContainerImpl.getInstance();
}

/**
 * 设置全局服务容器（用于测试）
 */
export function setServiceContainer(container: ServiceContainer): void {
  // 注意：这个方法主要用于测试，实际使用中应该使用getInstance()
  console.warn('[services] setServiceContainer is deprecated, use getInstance() instead');
}

/**
 * 重置全局服务容器
 */
export function resetServiceContainer(): void {
  ServiceContainerImpl.reset();
}
