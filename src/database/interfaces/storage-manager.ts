
/**
 * 存储管理接口
 * 负责IndexedDB数据库的初始化、连接和基础操作
 */

import type {
  DBResult,
  Platform
} from '../types';

/**
 * 数据库配置
 */
export interface DatabaseConfig {
  name: string;               // 数据库名称
  version: number;            // 数据库版本
  stores: StoreConfig[];      // 存储对象配置
}

/**
 * 存储对象配置
 */
export interface StoreConfig {
  name: string;               // 存储对象名称
  keyPath: string;           // 主键路径
  indexes?: IndexConfig[];    // 索引配置
}

/**
 * 索引配置
 */
export interface IndexConfig {
  name: string;               // 索引名称
  keyPath: string;           // 索引键路径
  options?: IDBIndexParameters; // 索引选项
}

/**
 * 存储管理接口
 */
export interface IStorageManager {
  /**
   * 初始化数据库
   * @param config 数据库配置
   * @returns 操作结果
   */
  initialize(config: DatabaseConfig): Promise<DBResult<void>>;

  /**
   * 打开数据库连接
   * @returns 操作结果
   */
  connect(): Promise<DBResult<IDBDatabase>>;

  /**
   * 关闭数据库连接
   * @returns 操作结果
   */
  disconnect(): Promise<DBResult<void>>;

  /**
   * 检查数据库是否存在
   * @returns 是否存在
   */
  exists(): Promise<boolean>;

  /**
   * 清空数据库
   * @returns 操作结果
   */
  clear(): Promise<DBResult<void>>;

  /**
   * 删除数据库
   * @returns 操作结果
   */
  delete(): Promise<DBResult<void>>;

  /**
   * 获取数据库版本
   * @returns 版本号
   */
  getVersion(): Promise<number>;

  /**
   * 升级数据库
   * @param newVersion 新版本号
   * @param upgradeCallback 升级回调
   * @returns 操作结果
   */
  upgrade(
    newVersion: number,
    upgradeCallback: (db: IDBDatabase, oldVersion: number) => void
  ): Promise<DBResult<void>>;
}

/**
 * 浏览器本地存储管理接口
 * 用于存储用户UID和API配置等敏感信息
 */
export interface IBrowserStorageManager {
  /**
   * 设置用户UID
   * @param uid 用户ID
   * @returns 操作结果
   */
  setUserUID(uid: string): Promise<DBResult<void>>;

  /**
   * 获取用户UID
   * @returns 用户ID
   */
  getUserUID(): Promise<DBResult<string | null>>;

  /**
   * 设置API配置
   * @param config API配置
   * @returns 操作结果
   */
  setAPIConfig(config: {
    provider: string;
    apiKey: string;
    endpoint?: string;
  }): Promise<DBResult<void>>;

  /**
   * 获取API配置
   * @returns API配置
   */
  getAPIConfig(): Promise<DBResult<{
    provider: string;
    apiKey: string;
    endpoint?: string;
  } | null>>;

  /**
   * 清除API配置
   * @returns 操作结果
   */
  clearAPIConfig(): Promise<DBResult<void>>;

  /**
   * 设置用户偏好设置
   * @param settings 偏好设置
   * @returns 操作结果
   */
  setUserPreferences(settings: Record<string, any>): Promise<DBResult<void>>;

  /**
   * 获取用户偏好设置
   * @returns 偏好设置
   */
  getUserPreferences(): Promise<DBResult<Record<string, any>>>;

  /**
   * 清除所有浏览器存储数据
   * @returns 操作结果
   */
  clearAll(): Promise<DBResult<void>>;
}

/**
 * 存储管理统一接口
 */
export interface IStorageManager extends IStorageManager, IBrowserStorageManager {}
