/**
 * UI辅助方法
 * 用于处理UI显示和更新
 */

/**
 * 显示进度条
 * @param current 当前进度值
 * @param total 总进度值
 * @param message 进度消息
 */
export function showProgress(current: number, total: number, message: string): void {
  const container = document.getElementById('progress-container');
  const textElement = document.getElementById('progress-text');
  const percentElement = document.getElementById('progress-percent');
  const fillElement = document.getElementById('progress-fill');

  if (container) {
    container.style.display = 'block';
  }
  if (textElement) {
    textElement.textContent = message;
  }
  if (percentElement) {
    const percent = Math.round((current / total) * 100);
    percentElement.textContent = `${percent}%`;
  }
  if (fillElement) {
    const percent = Math.round((current / total) * 100);
    fillElement.style.width = `${percent}%`;
  }
}

/**
 * 隐藏进度条
 */
export function hideProgress(): void {
  const container = document.getElementById('progress-container');
  if (container) {
    container.style.display = 'none';
  }
}

/**
 * 更新统计数值
 * @param elementId 元素ID
 * @param value 数值
 */
export function updateStatValue(elementId: string, value: number): void {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value.toString();
  }
}

/**
 * 显示状态信息
 * @param message 状态消息
 * @param type 状态类型
 */
export function showStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
  }
}

/**
 * 更新获取按钮状态
 * @param isFetching 是否正在获取
 */
export function updateFetchButtonState(isFetching: boolean): void {
  const fetchBtn = document.getElementById('fetch-favorites-btn') as HTMLButtonElement;
  if (fetchBtn) {
    if (isFetching) {
      fetchBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
        暂停获取
      `;
    } else {
      fetchBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        获取收藏夹数据
      `;
    }
  }
}

/**
 * 显示UP主进度条
 * @param current 当前进度值
 * @param total 总进度值
 * @param message 进度消息
 */
export function showUPProgress(current: number, total: number, message: string): void {
  const container = document.getElementById('up-progress-container');
  const textElement = document.getElementById('up-progress-text');
  const percentElement = document.getElementById('up-progress-percent');
  const fillElement = document.getElementById('up-progress-fill');

  if (container) {
    container.style.display = 'block';
  }
  if (textElement) {
    textElement.textContent = message;
  }
  if (percentElement) {
    const percent = Math.round((current / total) * 100);
    percentElement.textContent = `${percent}%`;
  }
  if (fillElement) {
    const percent = Math.round((current / total) * 100);
    fillElement.style.width = `${percent}%`;
  }
}

/**
 * 隐藏UP主进度条
 */
export function hideUPProgress(): void {
  const container = document.getElementById('up-progress-container');
  if (container) {
    container.style.display = 'none';
  }
}

/**
 * 更新获取UP主按钮状态
 * @param isFetching 是否正在获取
 */
export function updateUPFetchButtonState(isFetching: boolean): void {
  const fetchBtn = document.getElementById('fetch-ups-btn') as HTMLButtonElement;
  if (fetchBtn) {
    if (isFetching) {
      fetchBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
        暂停获取
      `;
    } else {
      fetchBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        获取已关注UP主
      `;
    }
  }
}
