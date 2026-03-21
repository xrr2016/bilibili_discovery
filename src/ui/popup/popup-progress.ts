import { addRuntimeListener, hasChromeRuntime, removeRuntimeListener } from "./popup-runtime.js";

type ProgressPayload = { current: number; total: number; text: string };
type ProgressMessage = { type: string; payload?: unknown };

let progressListener: ((message: unknown) => void) | null = null;
let progressTimeoutId: number | null = null;

export function showProgress(): void {
  const section = document.getElementById("classify-progress-section");
  if (section) {
    section.style.display = "block";
  }
}

export function hideProgress(): void {
  const section = document.getElementById("classify-progress-section");
  if (section) {
    section.style.display = "none";
  }
  if (progressTimeoutId !== null) {
    clearTimeout(progressTimeoutId);
    progressTimeoutId = null;
  }
}

export function updateProgress(current: number, total: number, text: string): void {
  const progressText = document.getElementById("progress-text");
  const progressCount = document.getElementById("progress-count");
  const progressFill = document.getElementById("progress-fill");

  if (progressText) progressText.textContent = text;
  if (progressCount) progressCount.textContent = `${current}/${total}`;
  if (progressFill) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    progressFill.style.width = `${percentage}%`;
  }
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
      updateProgress(payload.current, payload.total, payload.text);
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
