
/**
 * 语义管理接口
 * 负责管理标签、标签映射、标签向量等语义相关数据
 */

import type {
  Tag,
  TagAlias,
  TagStats,
  TagSimilarity,
  TagQueryParams,
  TagAliasQueryParams,
  DBResult,
  PaginationParams,
  PaginationResult,
  ID,
  Vector
} from '../types';

/**
 * 标签管理接口
 */
export interface ITagManager {
  /**
   * 创建标签
   * @param tag 标签信息
   * @returns 操作结果
   */
  createTag(tag: Omit<Tag, 'tag_id' | 'created_at' | 'updated_at'>): Promise<DBResult<Tag>>;

  /**
   * 获取标签
   * @param tagId 标签ID
   * @returns 标签信息
   */
  getTag(tagId: ID): Promise<DBResult<Tag>>;

  /**
   * 批量获取标签
   * @param tagIds 标签ID列表
   * @returns 标签信息列表
   */
  getTags(tagIds: ID[]): Promise<DBResult<Tag[]>>;

  /**
   * 查询标签列表
   * @param params 查询参数
   * @param pagination 分页参数
   * @returns 标签列表
   */
  queryTags(
    params: TagQueryParams,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<Tag>>>;

  /**
   * 更新标签
   * @param tagId 标签ID
   * @param updates 更新内容
   * @returns 操作结果
   */
  updateTag(
    tagId: ID,
    updates: Partial<Pick<Tag, 'name' | 'embedding'>>
  ): Promise<DBResult<Tag>>;

  /**
   * 删除标签
   * @param tagId 标签ID
   * @returns 操作结果
   */
  deleteTag(tagId: ID): Promise<DBResult<void>>;

  /**
   * 获取标签统计信息
   * @param tagId 标签ID
   * @returns 标签统计
   */
  getTagStats(tagId: ID): Promise<DBResult<TagStats>>;

  /**
   * 搜索相似标签
   * @param query 查询文本或向量
   * @param limit 返回数量
   * @param minSimilarity 最小相似度
   * @returns 相似标签列表
   */
  findSimilarTags(
    query: string | Vector,
    limit?: number,
    minSimilarity?: number
  ): Promise<DBResult<TagSimilarity[]>>;
}

/**
 * 标签映射管理接口
 */
export interface ITagAliasManager {
  /**
   * 添加标签映射
   * @param alias 别名信息
   * @returns 操作结果
   */
  addTagAlias(alias: Omit<TagAlias, 'alias_id' | 'created_at'>): Promise<DBResult<TagAlias>>;

  /**
   * 获取标签映射
   * @param aliasId 别名ID
   * @returns 标签映射
   */
  getTagAlias(aliasId: ID): Promise<DBResult<TagAlias>>;

  /**
   * 查询标签映射列表
   * @param params 查询参数
   * @param pagination 分页参数
   * @returns 标签映射列表
   */
  queryTagAliases(
    params: TagAliasQueryParams,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<TagAlias>>>;

  /**
   * 解析标签
   * 将输入文本解析为标准标签ID
   * @param input 输入文本
   * @returns 标准标签ID
   */
  resolveTag(input: string): Promise<DBResult<ID>>;

  /**
   * 批量解析标签
   * @param inputs 输入文本列表
   * @returns 标准标签ID列表
   */
  resolveTags(inputs: string[]): Promise<DBResult<ID[]>>;

  /**
   * 删除标签映射
   * @param aliasId 别名ID
   * @returns 操作结果
   */
  deleteTagAlias(aliasId: ID): Promise<DBResult<void>>;
}

/**
 * 分区管理接口
 */
export interface ICategoryManager {
  /**
   * 创建分区
   * @param category 分区信息
   * @returns 操作结果
   */
  createCategory(category: {
    name: string;
    tag_ids: ID[];
  }): Promise<DBResult<{id: ID, name: string, tag_ids: ID[], created_at: number}>>;

  /**
   * 获取分区
   * @param categoryId 分区ID
   * @returns 分区信息
   */
  getCategory(categoryId: ID): Promise<DBResult<{id: ID, name: string, tag_ids: ID[], created_at: number}>>;

  /**
   * 查询所有分区
   * @returns 分区列表
   */
  queryCategories(): Promise<DBResult<Array<{id: ID, name: string, tag_ids: ID[], created_at: number}>>>;

  /**
   * 更新分区
   * @param categoryId 分区ID
   * @param updates 更新内容
   * @returns 操作结果
   */
  updateCategory(
    categoryId: ID,
    updates: Partial<{name: string, tag_ids: ID[]}>
  ): Promise<DBResult<void>>;

  /**
   * 删除分区
   * @param categoryId 分区ID
   * @returns 操作结果
   */
  deleteCategory(categoryId: ID): Promise<DBResult<void>>;
}

/**
 * 语义管理统一接口
 */
export interface ISemanticManager extends ITagManager, ITagAliasManager, ICategoryManager {}
