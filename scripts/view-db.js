/**
 * 脚本用于查看 IndexedDB 数据库内容
 * 使用方法: node scripts/view-db.js [storeName] [key]
 * 示例:
 *   node scripts/view-db.js                    // 查看所有存储
 *   node scripts/view-db.js upList             // 查看 upList 存储
 *   node scripts-view-db.js upList 123456      // 查看 upList 中 mid 为 123456 的记录
 */

const { open } = require('node:sqlite');
const path = require('path');

// IndexedDB 数据库名称
const DB_NAME = "BilibiliDiscoveryDB";

// 存储配置
const STORES = {
  upList: { keyPath: "mid" },
  videoCache: { keyPath: "mid" },
  tagLibrary: { keyPath: "id" },
  upTagWeightsCache: { keyPath: "mid" },
  upManualTagsCache: { keyPath: "mid" },
  categoryLibrary: { keyPath: "id" },
  interestProfile: { keyPath: "tag" },
  upFaceDataCache: { keyPath: "mid" },
  classifyStatus: { keyPath: "id" }
};

/**
 * 获取扩展数据目录
 */
function getExtensionDataDir() {
  const platform = process.platform;
  const home = process.env.HOME || process.env.USERPROFILE;

  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || home, 'Google', 'Chrome', 'User Data', 'Default', 'IndexedDB');
  } else if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'IndexedDB');
  } else {
    return path.join(home, '.config', 'google-chrome', 'Default', 'IndexedDB');
  }
}

/**
 * 查找 IndexedDB 数据库文件
 */
function findDatabaseFiles() {
  const dataDir = getExtensionDataDir();
  console.log('Looking for IndexedDB files in:', dataDir);
  console.log('Note: You may need to find the extension-specific directory manually');
  console.log('The database files are typically located in:');
  console.log('  - Chrome: chrome-extension://<extension-id>/IndexedDB');
  console.log('  - Firefox: browser-extension://<extension-id>/IndexedDB');
}

/**
 * 打印存储信息
 */
function printStoreInfo(storeName, key) {
  if (!STORES[storeName]) {
    console.error(`Unknown store: ${storeName}`);
    console.log('Available stores:', Object.keys(STORES).join(', '));
    return;
  }

  console.log(`\nStore: ${storeName}`);
  console.log(`Key path: ${STORES[storeName].keyPath}`);

  if (key) {
    console.log(`\nKey: ${key}`);
    console.log('Note: To view specific records, you need to use Chrome DevTools:');
    console.log('  1. Open chrome://extensions');
    console.log('  2. Find your extension and click "Inspect views: background page"');
    console.log('  3. Go to Application tab > IndexedDB');
    console.log('  4. Navigate to BilibiliDiscoveryDB and select the store');
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const storeName = args[0];
  const key = args[1];

  console.log('Bilibili Discovery Database Viewer');
  console.log('===================================\n');

  if (storeName) {
    printStoreInfo(storeName, key);
  } else {
    console.log('Available stores:');
    Object.entries(STORES).forEach(([name, config]) => {
      console.log(`  - ${name} (key: ${config.keyPath})`);
    });

    console.log('\nTo view a specific store:');
    console.log('  node scripts/view-db.js <storeName> [key]');

    console.log('\nNote: For detailed data inspection, use Chrome DevTools:');
    console.log('  1. Open chrome://extensions');
    console.log('  2. Find your extension and click "Inspect views: background page"');
    console.log('  3. Go to Application tab > IndexedDB');
    console.log('  4. Navigate to BilibiliDiscoveryDB');
    console.log('  5. Browse the stores and view their contents');

    findDatabaseFiles();
  }
}

main().catch(console.error);
