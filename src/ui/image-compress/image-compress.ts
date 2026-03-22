import { VideoRepository } from "../../database/implementations/video-repository.impl.js";
import { Platform } from "../../database/types/base.js";

// 状态管理
let isRunning = false;
let shouldStop = false;

// DOM 元素
const platformSelect = document.getElementById("platform") as HTMLSelectElement;
const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
const stopBtn = document.getElementById("stop-btn") as HTMLButtonElement;
const progressFill = document.getElementById("progress-fill") as HTMLDivElement;
const progressStatus = document.getElementById("progress-status") as HTMLSpanElement;
const progressPercent = document.getElementById("progress-percent") as HTMLSpanElement;
const processedCount = document.getElementById("processed-count") as HTMLDivElement;
const totalCount = document.getElementById("total-count") as HTMLDivElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;

/**
 * 设置状态文本
 */
function setStatus(text: string, type: "success" | "error" | "normal" = "normal"): void {
  statusEl.textContent = text;
  statusEl.className = "status";
  if (type !== "normal") {
    statusEl.classList.add(type);
  }
}

/**
 * 更新进度显示
 */
function updateProgress(done: number, total: number): void {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
  processedCount.textContent = String(done);
  totalCount.textContent = String(total);

  if (done === total && total > 0) {
    progressStatus.textContent = "完成！";
    setStatus("压缩任务已完成", "success");
  } else {
    progressStatus.textContent = `处理中... (${done}/${total})`;
  }
}

/**
 * 开始压缩任务
 */
async function startCompress(): Promise<void> {
  if (isRunning) return;

  isRunning = true;
  shouldStop = false;

  // 更新按钮状态
  startBtn.disabled = true;
  stopBtn.disabled = false;

  // 重置进度显示
  progressFill.style.width = "0%";
  progressPercent.textContent = "0%";
  processedCount.textContent = "0";
  totalCount.textContent = "0";
  progressStatus.textContent = "准备中...";
  setStatus("正在扫描数据库...", "normal");

  try {
    const platform = platformSelect.value as Platform;
    const videoRepository = new VideoRepository();

    // 开始压缩任务
    await videoRepository.compressAllVideoPictures(platform, (done, total) => {
      if (shouldStop) {
        progressStatus.textContent = "已停止";
        setStatus("压缩任务已停止", "normal");
        return;
      }
      updateProgress(done, total);
    });

    if (!shouldStop) {
      setStatus("压缩任务已完成", "success");
    }
  } catch (error) {
    console.error("[ImageCompress] Error:", error);
    setStatus(`错误: ${error instanceof Error ? error.message : String(error)}`, "error");
  } finally {
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

/**
 * 停止压缩任务
 */
function stopCompress(): void {
  if (!isRunning) return;
  shouldStop = true;
  progressStatus.textContent = "正在停止...";
}

/**
 * 初始化页面
 */
function initPage(): void {
  startBtn.addEventListener("click", startCompress);
  stopBtn.addEventListener("click", stopCompress);
}

// 页面加载完成后初始化
if (typeof document !== "undefined") {
  initPage();
}
