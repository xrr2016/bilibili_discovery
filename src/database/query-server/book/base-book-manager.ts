/**
 * 基础书管理器类
 * 实现书页机制的核心功能，可被所有数据类型复用
 *
 * 核心职责：
 * - 作为Book工厂，负责创建Book实例
 * - 管理Book实例的生命周期
 * - 提供Book的注册和删除功能
 */

import { Book } from './book.js';
import type { QueryCondition } from '../query/types.js';
import type { BookQueryOptions } from './types.js';
import {generateId} from "../../implementations/id-generator.js"

/**
 * 数据仓库接口
 * 定义数据仓库必须实现的方法
 * 职责：从Cache或Database获取完整数据
 */
export interface IDataRepository<T> {
  /**
   * 根据ID获取单个数据
   * 优先从Cache获取，未命中则从Database获取
   * @param id - 全局唯一的ID
   */
  getById(id: number): Promise<T | null>;

  /**
   * 根据ID列表批量获取数据
   * 优先从Cache获取，未命中的从Database获取
   * @param ids - 全局唯一的ID列表
   */
  getByIds(ids: number[]): Promise<T[]>;

  /**
   * 获取所有数据
   */
  getAll(): Promise<T[]>;
}

/**
 * 索引转换器接口
 * 定义如何将数据转换为索引
 */
export interface IIndexConverter<T, I> {
  /**
   * 将数据转换为索引
   */
  toIndex(data: T): I;

  /**
   * 获取数据的唯一标识
   */
  getId(data: T): number;
}

/**
 * 查询服务接口
 * 定义查询服务必须实现的方法
 * 职责：根据查询条件返回索引ID列表
 */
export interface IQueryService<I> {
  /**
   * 根据查询条件获取索引ID列表
   */
  queryIds(condition: QueryCondition): Promise<number[]>;
}

/**
 * Book配置接口
 * 定义创建Book所需的配置
 */
export interface BookConfig<T, I> {
  /** 数据仓库 */
  repository: IDataRepository<T>;
  /** 查询服务 */
  queryService: IQueryService<I>;
  /** 每页大小 */
  pageSize?: number;
}

/**
 * 基础书管理器类（单例工厂）
 * 作为Book工厂，负责创建和管理Book实例的生命周期
 *
 * 设计原则：
 * - BookManager只负责创建和管理Book实例
 * - Book自己负责获取数据和管理分页
 * - Book生命周期与页面生命周期一致
 * - BookManager是单例，全局唯一
 */
export class BaseBookManager {
  private static instance: BaseBookManager;
  private books: Map<number, Book<any>> = new Map();

  private constructor() {
    // 私有构造函数，确保单例
  }

  /**
   * 获取单例实例
   */
  static getInstance(): BaseBookManager {
    if (!BaseBookManager.instance) {
      BaseBookManager.instance = new BaseBookManager();
    }
    return BaseBookManager.instance;
  }

  /**
   * 创建一本书
   * 通过QueryService获取索引ID列表
   * @param queryCondition - 查询条件
   * @param config - Book配置
   * @param options - 查询选项
   * @returns 创建的Book实例
   */
  async createBook<T, I>(
    queryCondition: QueryCondition,
    config: BookConfig<T, I>,
    options: BookQueryOptions = {}
  ): Promise<Book<T>> {
    const { repository, queryService, pageSize: defaultPageSize } = config;
    const pageSize = options.pageSize || defaultPageSize || 20;

    // 生成书ID
    const bookId = generateId();

    // 通过QueryService获取结果ID列表
    const resultIds = await queryService.queryIds(queryCondition);

    // 创建Book实例
    const book = new Book<T>(
      bookId,
      resultIds,
      repository,
      queryService,
      pageSize
    );

    // 存储书
    this.books.set(bookId, book);

    return book;
  }

  /**
   * 获取书
   * @param bookId - 书的ID
   * @returns Book实例或undefined
   */
  getBook<T>(bookId: number): Book<T> | undefined {
    return this.books.get(bookId);
  }

  /**
   * 删除书
   * @param bookId - 书的ID
   * @returns 是否删除成功
   */
  deleteBook(bookId: number): boolean {
    return this.books.delete(bookId);
  }

  /**
   * 获取所有书的数量
   * @returns 书的数量
   */
  getBookCount(): number {
    return this.books.size;
  }

  /**
   * 清空所有书
   */
  clearAllBooks(): void {
    this.books.clear();
  }
}
