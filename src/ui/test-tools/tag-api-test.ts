
/**
 * 标签 API 测试工具
 * 用于测试标签 API 的响应间隔，绕过 API 层自带的速率限制
 */

// 测试的 BV 号列表
const testBvids = [
  'BV1CN4y1w7kt',
  'BV1RP41137XA',
  'BV1cK41197uX',
  'BV1gs4y1U7z2',
  'BV1ru411t7ro',
  'BV1B84y1S7KL',
  'BV1ik4y1u7SZ',
  'BV1dX4y1j7fF',
  'BV1mc411F7WA',
  'BV1Wb411f7Es'
];

// 测试结果接口
interface TestResult {
  bvid: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
}

// 测试结果数组
const testResults: TestResult[] = [];

// 直接使用 fetch 发送请求，绕过 API 层的速率限制
async function fetchVideoTags(bvid: string): Promise<any> {
  const url = `https://api.bilibili.com/x/tag/archive/tags?bvid=${bvid}`;
  const response = await fetch(url, {
    credentials: 'include',
    mode: 'cors',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`API error! code: ${data.code}, message: ${data.message}`);
  }

  return data.data;
}

// 测试单个 BV 号的标签 API
async function testTagApi(bvid: string): Promise<TestResult> {
  const startTime = performance.now();
  const result: TestResult = {
    bvid,
    startTime,
    endTime: 0,
    duration: 0,
    success: false
  };

  try {
    await fetchVideoTags(bvid);
    result.endTime = performance.now();
    result.duration = result.endTime - result.startTime;
    result.success = true;
  } catch (error) {
    result.endTime = performance.now();
    result.duration = result.endTime - result.startTime;
    result.success = false;
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

// 运行所有测试
async function runAllTests(onProgress?: (current: number, total: number, result: TestResult) => void): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const total = testBvids.length;

  for (let i = 0; i < total; i++) {
    const result = await testTagApi(testBvids[i]);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, total, result);
    }
  }

  return results;
}

// 计算统计信息
function calculateStatistics(results: TestResult[]): {
  total: number;
  successCount: number;
  failCount: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  durations: number[];
} {
  const durations = results.map(r => r.duration);
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;

  return {
    total: results.length,
    successCount,
    failCount,
    avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    durations
  };
}

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
  const startTestBtn = document.getElementById('start-tag-api-test-btn') as HTMLButtonElement;
  const stopTestBtn = document.getElementById('stop-tag-api-test-btn') as HTMLButtonElement;
  const testStatus = document.getElementById('tag-api-test-status') as HTMLSpanElement;
  const testPercent = document.getElementById('tag-api-test-percent') as HTMLSpanElement;
  const testProcessedCount = document.getElementById('tag-api-test-processed-count') as HTMLSpanElement;
  const testTotalCount = document.getElementById('tag-api-test-total-count') as HTMLSpanElement;
  const testMessage = document.getElementById('tag-api-test-message') as HTMLSpanElement;
  const testResultsDiv = document.getElementById('tag-api-test-results') as HTMLDivElement;

  let isRunning = false;
  let shouldStop = false;

  // 开始测试按钮点击事件
  startTestBtn.addEventListener('click', async () => {
    if (isRunning) return;

    isRunning = true;
    shouldStop = false;
    testResults.length = 0; // 清空之前的测试结果

    // 禁用开始按钮，启用停止按钮
    startTestBtn.disabled = true;
    stopTestBtn.disabled = false;

    // 更新UI状态
    testStatus.textContent = '测试中...';
    testPercent.textContent = '0%';
    testProcessedCount.textContent = '0';
    testTotalCount.textContent = testBvids.length.toString();
    testMessage.textContent = '';
    testResultsDiv.innerHTML = '';

    try {
      const results = await runAllTests((current, total, result) => {
        const percent = Math.round((current / total) * 100);
        testPercent.textContent = `${percent}%`;
        testProcessedCount.textContent = current.toString();

        // 添加测试结果到页面
        const resultDiv = document.createElement('div');
        resultDiv.className = 'tag-api-test-result';
        resultDiv.innerHTML = `
          <div class="result-item">
            <span class="result-label">BV号:</span>
            <span class="result-value">${result.bvid}</span>
          </div>
          <div class="result-item">
            <span class="result-label">状态:</span>
            <span class="result-value ${result.success ? 'success' : 'fail'}">${result.success ? '成功' : '失败'}</span>
          </div>
          <div class="result-item">
            <span class="result-label">响应时间:</span>
            <span class="result-value">${result.duration.toFixed(2)}ms</span>
          </div>
          ${result.error ? `<div class="result-item"><span class="result-label">错误:</span><span class="result-value error">${result.error}</span></div>` : ''}
        `;
        testResultsDiv.appendChild(resultDiv);

        // 如果用户点击了停止按钮，则停止测试
        if (shouldStop) {
          throw new Error('用户停止了测试');
        }
      });

      // 计算并显示统计信息
      const stats = calculateStatistics(results);
      const statsDiv = document.createElement('div');
      statsDiv.className = 'tag-api-test-stats';
      statsDiv.innerHTML = `
        <h3>测试统计</h3>
        <div class="stat-item">
          <span class="stat-label">总请求数:</span>
          <span class="stat-value">${stats.total}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">成功:</span>
          <span class="stat-value success">${stats.successCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">失败:</span>
          <span class="stat-value fail">${stats.failCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">平均响应时间:</span>
          <span class="stat-value">${stats.avgDuration.toFixed(2)}ms</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">最小响应时间:</span>
          <span class="stat-value">${stats.minDuration.toFixed(2)}ms</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">最大响应时间:</span>
          <span class="stat-value">${stats.maxDuration.toFixed(2)}ms</span>
        </div>
      `;
      testResultsDiv.appendChild(statsDiv);

      testStatus.textContent = '测试完成';
      testMessage.textContent = `成功完成 ${stats.total} 个请求，其中 ${stats.successCount} 个成功，${stats.failCount} 个失败`;
    } catch (error) {
      testStatus.textContent = '测试停止';
      testMessage.textContent = `错误: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      // 启用开始按钮，禁用停止按钮
      startTestBtn.disabled = false;
      stopTestBtn.disabled = true;
      isRunning = false;
    }
  });

  // 停止测试按钮点击事件
  stopTestBtn.addEventListener('click', () => {
    if (isRunning) {
      shouldStop = true;
      testMessage.textContent = '正在停止测试...';
    }
  });
});
