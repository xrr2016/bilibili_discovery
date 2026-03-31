/**
 * 数据库统计页面类型定义
 */

/**
 * 进度更新回调
 */
export interface ProgressCallback {
  (current: number, total: number, message: string): void;
}
