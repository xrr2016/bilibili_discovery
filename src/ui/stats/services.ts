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
  creatorRepo: CreatorRepository;
  tagRepo: TagRepository;
  categoryRepo: CategoryRepositoryImpl;

  // QueryService 实例
  creatorQueryService: QueryService;
  tagQueryService: TagQueryService;

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
}

/**
 * 创建服务容器实例
 */
export function createServiceContainer(): ServiceContainer {
  const creatorRepo = new CreatorRepository();
  const tagRepo = new TagRepository();
  const categoryRepo = new CategoryRepositoryImpl();

  // 创建QueryService实例
  const creatorQueryService = new QueryService(creatorRepo);
  const tagQueryService = new TagQueryService(tagRepo);

  return {
    // Repository 实例
    creatorRepo,
    tagRepo,
    categoryRepo,

    // QueryService 实例
    creatorQueryService,
    tagQueryService,

    // Book 实例（初始为null，在使用时创建）
    creatorBook: null,
    tagBook: null,

    // 分页状态
    paginationState: {
      currentPage: 0,
      pageSize: 20, // 使用Book的默认分页大小
      totalPages: 0,
      totalItems: 0
    }
  };
}

/**
 * 全局服务容器实例
 */
let globalContainer: ServiceContainer | null = null;

/**
 * 获取全局服务容器
 */
export function getServiceContainer(): ServiceContainer {
  if (!globalContainer) {
    globalContainer = createServiceContainer();
  }
  return globalContainer;
}

/**
 * 设置全局服务容器
 */
export function setServiceContainer(container: ServiceContainer): void {
  globalContainer = container;
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
 * 创建或获取标签Book实例
 */
export async function getOrCreateTagBook(condition?: TagQueryCondition): Promise<Book<Tag>> {
  const container = getServiceContainer();

  if (container.tagBook) {
    if (condition) {
      // 更新现有Book的索引
      const queryCondition: QueryCondition = {
        keyword: condition.keyword,
        platform:Platform.BILIBILI
      };
      await container.tagBook.updateIndex(queryCondition);
    }
    return container.tagBook;
  }

  // 创建新的Book实例
  const queryServiceAdapter = new TagQueryServiceAdapter(container.tagQueryService);
  const bookConfig: BookConfig<Tag, TagIndex> = {
    repository: container.tagRepo as unknown as IDataRepository<Tag>,
    queryService: queryServiceAdapter
    // 不指定pageSize，让Book使用默认值（20）
  };

  // 将TagQueryCondition转换为QueryCondition
  const queryCondition: QueryCondition = condition
    ? { keyword: condition.keyword, platform:Platform.BILIBILI } // Platform.BILIBILI
    : { platform: Platform.BILIBILI }; // Platform.BILIBILI

  container.tagBook = await bookManager.createBook(queryCondition, bookConfig);
  return container.tagBook;
}

/**
 * 清空Book实例
 */
export function clearBooks(): void {
  const container = getServiceContainer();
  container.creatorBook = null;
  container.tagBook = null;
}
