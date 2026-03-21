import { addRuntimeListener, hasChromeRuntime, removeRuntimeListener } from "./popup-runtime.js";

type ProgressPayload = {
  current: number;
  total: number;
  title?: string;
  detail?: string;
  text?: string;
  stopping?: boolean;
};
type ProgressMessage = { type: string; payload?: unknown };

let progressListener: ((message: unknown) => void) | null = null;
let progressTimeoutId: number | null = null;

export function showProgress(): void {
  const button = document.getElementById("btn-auto-classify");
  if (button) {
    button.classList.add("is-running");
  }
}

export function hideProgress(): void {
  const button = document.getElementById("btn-auto-classify");
  if (button) {
    button.classList.remove("is-running", "is-stopping");
  }
  setButtonText("自动分类", "抓取UP页面并生成可编辑标签", "开始");
  setProgressFill(0);
  if (progressTimeoutId !== null) {
    clearTimeout(progressTimeoutId);
    progressTimeoutId = null;
  }
}

function setButtonText(title: string, detail: string, count: string): void {
  const titleEl = document.getElementById("classify-button-title");
  const detailEl = document.getElementById("classify-button-detail");
  const countEl = document.getElementById("classify-button-count");

  if (titleEl) titleEl.textContent = title;
  if (detailEl) detailEl.textContent = detail;
  if (countEl) countEl.textContent = count;
}

function setProgressFill(percentage: number): void {
  const progressFill = document.getElementById("classify-button-fill");
  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }
}

export function updateProgress(payload: ProgressPayload): void {
  const button = document.getElementById("btn-auto-classify");
  if (button) {
    button.classList.toggle("is-stopping", Boolean(payload.stopping));
  }

  const title = payload.title ?? (payload.stopping ? "正在停止分类" : "自动分类");
  const detail = payload.detail ?? payload.text ?? "准备中...";
  const count = payload.total > 0 ? `${payload.current}/${payload.total}` : payload.stopping ? "停止中" : "运行中";
  const percentage = payload.total > 0 ? (payload.current / payload.total) * 100 : 12;

  setButtonText(title, detail, count);
  setProgressFill(percentage);
}

function detachListener(): void {
  if (progressListener) {
    removeRuntimeListener(progressListener);
    progressListener = null;
  }
}

export function bindProgressListener(onComplete: () => void): void {
  if (!hasChromeRuntime()) {
    return;
  }

  detachListener();
  progressListener = (message: unknown) => {
    const msg = message as ProgressMessage;
    if (msg.type === "classify_progress") {
      const payload = msg.payload as ProgressPayload;
      showProgress();
      updateProgress(payload);
      return;
    }
    if (msg.type === "classify_complete") {
      hideProgress();
      detachListener();
      onComplete();
    }
  };
  addRuntimeListener(progressListener);
}

export function armProgressTimeout(): void {
  progressTimeoutId = window.setTimeout(() => {
    hideProgress();
    detachListener();
  }, 5 * 60 * 1000);
}
