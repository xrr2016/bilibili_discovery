/**
 * 基础请求工具
 */

import type { BiliResponse } from "./types.js";

export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * 风控错误类
 */
export class RateLimitError extends Error {
  constructor(message: string = "触发B站风控，请求被限制") {
    super(message);
    this.name = "RateLimitError";
  }
}

interface ApiRequestOptions {
  fetchFn?: FetchFn;
  fetchInit?: RequestInit;
  fallbackRequest?: (url: string) => Promise<unknown | null>;
}

const DEFAULT_MIN_INTERVAL_MS = 500;
const DEFAULT_MAX_INTERVAL_MS = 1000;
let lastRequestAt = 0;
let currentMinInterval = DEFAULT_MIN_INTERVAL_MS;
let currentMaxInterval = DEFAULT_MAX_INTERVAL_MS;

/**
 * Simple delay helper.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate limiter for API requests.
 */
export async function rateLimiter(
  minIntervalMs?: number,
  maxIntervalMs?: number
): Promise<void> {
  const now = Date.now();
  const actualMinInterval = minIntervalMs ?? currentMinInterval;
  const actualMaxInterval = maxIntervalMs ?? currentMaxInterval;
  const baseWaitTime = Math.max(0, lastRequestAt + actualMinInterval - now);
  const randomDelay = Math.random() * (actualMaxInterval - actualMinInterval);
  const waitTime = baseWaitTime + randomDelay;
  if (waitTime > 0) {
    console.log("[API] Rate limit wait", Math.round(waitTime));
    await delay(waitTime);
  }
  lastRequestAt = Date.now();
}

/**
 * Reset internal rate limiter (for tests).
 */
export function __resetRateLimiter(): void {
  lastRequestAt = 0;
}

/**
 * Update rate limiter intervals from settings.
 */
export function updateRateLimiterIntervals(minInterval: number, maxInterval: number): void {
  currentMinInterval = minInterval;
  currentMaxInterval = maxInterval;
}

/**
 * Unified API request helper.
 */
export async function apiRequest<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T | null> {
  const fetchFn = options.fetchFn || (fetch as unknown as FetchFn);
  const fetchInit: RequestInit = {
    credentials: "include",
    mode: "cors",
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/json"
    },
    ...(options.fetchInit ?? {})
  };
  try {
    await rateLimiter();
    console.log("[API] Request", url);
    const response = await fetchFn(url, fetchInit);
    if (!response.ok) {
      console.error("[API] Request failed", response.status, url);
      if (response.status === 412) {
        if (options.fallbackRequest) {
          const fallback = await options.fallbackRequest(url);
          return (fallback as T | null) ?? null;
        }
        throw new RateLimitError("触发B站风控，请求被限制。请稍后再试或检查您的网络环境。");
      }
      return null;
    }
    const data = (await response.json()) as BiliResponse<T>;
    // 检查API返回的code
    if (data.code !== 0) {
      console.error("[API] API error", data.code, data.message, url);
      return null;
    }
    return data.data;
  } catch (error) {
    console.error("[API] Request error", error, url);
    return null;
  }
}

export type { ApiRequestOptions };
