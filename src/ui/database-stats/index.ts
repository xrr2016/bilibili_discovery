/**
 * 数据库统计页面入口文件
 */

import { DatabaseStatsManager } from "./database-stats-manager.js";

// 创建全局实例
let databaseStatsManager: DatabaseStatsManager | null = null;

/**
 * 初始化数据库统计页面
 */
export async function initDatabaseStats(): Promise<void> {
  if (!databaseStatsManager) {
    databaseStatsManager = new DatabaseStatsManager();
  }
  await databaseStatsManager.init();
}

// 页面加载完成后自动初始化
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void initDatabaseStats());
  } else {
    void initDatabaseStats();
  }
}
