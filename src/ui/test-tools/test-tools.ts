import { VideoRepository } from "../../database/implementations/video-repository.impl.js";
import { CollectionRepository } from "../../database/implementations/collection-repository.impl.js";
import { CollectionItemRepository } from "../../database/implementations/collection-item-repository.impl.js";
import { Platform } from "../../database/types/base.js";

// 状态管理
let isCompressRunning = false;
let shouldStopCompress = false;

// DOM 元素
const platformSelect = document.getElementById("platform") as HTMLSelectElement;
const startCompressBtn = document.getElementById("start-compress-btn") as HTMLButtonElement;
const stopCompressBtn = document.getElementById("stop-compress-btn") as HTMLButtonElement;
const compressStatus = document.getElementById("compress-status") as HTMLSpanElement;
const compressPercent = document.getElementById("compress-percent") as HTMLSpanElement;
const processedCount = document.getElementById("processed-count") as HTMLSpanElement;
const totalCount = document.getElementById("total-count") as HTMLSpanElement;
const compressMessage = document.getElementById("compress-message") as HTMLSpanElement;
const updateStatsBtn = document.getElementById("update-stats-btn") as HTMLButtonElement;
const statsMessage = document.getElementById("stats-message") as HTMLSpanElement;

/**
 * 设置消息
 */
function setMessage(element: HTMLSpanElement, text: string): void {
  element.textContent = text;
}

/**
 * 更新压缩进度
 */
function updateCompressProgress(done: number, total: number): void {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  compressPercent.textContent = `${percent}%`;
  processedCount.textContent = String(done);
  totalCount.textContent = String(total);

  if (done === total && total > 0) {
    compressStatus.textContent = "完成！";
    setMessage(compressMessage, "压缩任务已完成");
  } else {
    compressStatus.textContent = `处理中... (${done}/${total})`;
  }
}

/**
 * 开始压缩任务
 */
async function startCompress(): Promise<void> {
  if (isCompressRunning) return;

  isCompressRunning = true;
  shouldStopCompress = false;

  // 更新按钮状态
  startCompressBtn.disabled = true;
  stopCompressBtn.disabled = false;

  // 重置进度显示
  compressPercent.textContent = "0%";
  processedCount.textContent = "0";
  totalCount.textContent = "0";
  compressStatus.textContent = "准备中...";
  setMessage(compressMessage, "正在扫描数据库...");

  try {
    const platform = platformSelect.value as Platform;
    const videoRepository = new VideoRepository();

    // 开始压缩任务
    await videoRepository.compressAllVideoPictures(platform, (done, total) => {
      if (shouldStopCompress) {
        compressStatus.textContent = "已停止";
        setMessage(compressMessage, "压缩任务已停止");
        return;
      }
      updateCompressProgress(done, total);
    });

    if (!shouldStopCompress) {
      setMessage(compressMessage, "压缩任务已完成");
    }
  } catch (error) {
    console.error("[Compress] Error:", error);
    setMessage(compressMessage, `错误: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    isCompressRunning = false;
    startCompressBtn.disabled = false;
    stopCompressBtn.disabled = true;
  }
}

/**
 * 停止压缩任务
 */
function stopCompress(): void {
  if (!isCompressRunning) return;
  shouldStopCompress = true;
  compressStatus.textContent = "正在停止...";
}

/**
 * 更新收藏夹统计
 */
async function updateCollectionStats(): Promise<void> {
  if (isCompressRunning) {
    setMessage(statsMessage, "请先停止当前任务");
    return;
  }

  try {
    setMessage(statsMessage, "正在更新收藏夹统计...");
    updateStatsBtn.disabled = true;

    const platform = platformSelect.value as Platform;
    const collectionRepository = new CollectionRepository();
    const collectionItemRepository = new CollectionItemRepository();

    // 获取所有收藏夹
    const collections = await collectionRepository.getAllCollections(platform);

    // 更新每个收藏夹的统计信息
    let updatedCount = 0;
    for (const collection of collections) {
      try {
        // 获取收藏夹的实际视频数量
        const actualCount = await collectionItemRepository.countCollectionItems(collection.collectionId);

        // 更新收藏夹的 videoCount
        await collectionRepository.updateCollection(collection.collectionId, {
          videoCount: actualCount
        });

        updatedCount++;
      } catch (error) {
        console.error(`[UpdateStats] Error updating stats for collection ${collection.collectionId}:`, error);
      }
    }

    setMessage(statsMessage, `已更新 ${updatedCount} 个收藏夹的统计信息`);
  } catch (error) {
    console.error("[UpdateStats] Error:", error);
    setMessage(statsMessage, `错误: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    updateStatsBtn.disabled = false;
  }
}

/**
 * 初始化页面
 */
function initPage(): void {
  startCompressBtn.addEventListener("click", startCompress);
  stopCompressBtn.addEventListener("click", stopCompress);
  updateStatsBtn.addEventListener("click", updateCollectionStats);
}

// 页面加载完成后初始化
if (typeof document !== "undefined") {
  initPage();
}
