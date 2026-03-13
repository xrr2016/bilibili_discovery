/**
 * Storage helpers based on chrome.storage.local.
 */

export interface StorageArea {
  get: (keys?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
}

export interface StorageProvider {
  local: StorageArea;
}

export interface UP {
  mid: number;
  name: string;
  face: string;
  sign: string;
  follow_time: number;
}

export interface Video {
  bvid: string;
  aid: number;
  title: string;
  play: number;
  duration: number;
  pubdate: number;
  tags: string[];
}

export interface UPCache {
  upList: UP[];
  lastUpdate: number;
}

export interface VideoCacheEntry {
  videos: Video[];
  lastUpdate: number;
}

export type VideoCache = Record<string, VideoCacheEntry>;

export interface UserInterest {
  tag: string;
  score: number;
}

export type InterestProfile = Record<string, UserInterest>;

/**
 * UP标签统计项
 */
export interface UPTagCount {
  tag: string;
  count: number;
}

/**
 * UP标签统计缓存
 * 键为UP的mid，值为该UP的标签统计列表
 */
export type UPTagCache = Record<string, { tags: UPTagCount[]; lastUpdate: number }>;

interface StorageOptions {
  storage?: StorageProvider;
}

function getDefaultStorage(): StorageProvider {
  return chrome.storage as StorageProvider;
}

declare const chrome: { storage: StorageProvider };

/**
 * Set a value in storage.
 */
export async function setValue<T>(
  key: string,
  value: T,
  options: StorageOptions = {}
): Promise<void> {
  const storage = options.storage ?? getDefaultStorage();
  console.log("[Storage] Set", key);
  await storage.local.set({ [key]: value });
}

/**
 * Get a value from storage.
 */
export async function getValue<T>(
  key: string,
  options: StorageOptions = {}
): Promise<T | null> {
  const storage = options.storage ?? getDefaultStorage();
  const result = await storage.local.get(key);
  const value = result[key] as T | undefined;
  return value ?? null;
}

/**
 * Save UP list cache.
 */
export async function saveUPList(
  upList: UP[],
  options: StorageOptions = {}
): Promise<void> {
  const payload: UPCache = { upList, lastUpdate: Date.now() };
  await setValue("upList", payload, options);
}

/**
 * Load UP list cache.
 */
export async function loadUPList(
  options: StorageOptions = {}
): Promise<UPCache | null> {
  return getValue<UPCache>("upList", options);
}

/**
 * Save video cache for a specific UP.
 */
export async function saveVideoCache(
  mid: number,
  videos: Video[],
  options: StorageOptions = {}
): Promise<void> {
  const cache = (await getValue<VideoCache>("videoCache", options)) ?? {};
  cache[String(mid)] = { videos, lastUpdate: Date.now() };
  await setValue("videoCache", cache, options);
}

/**
 * Load video cache for a specific UP.
 */
export async function loadVideoCache(
  mid: number,
  options: StorageOptions = {}
): Promise<VideoCacheEntry | null> {
  const cache = await getValue<VideoCache>("videoCache", options);
  if (!cache) {
    return null;
  }
  return cache[String(mid)] ?? null;
}

/**
 * Update interest score for a tag.
 */
export async function updateInterest(
  tag: string,
  score: number,
  options: StorageOptions = {}
): Promise<UserInterest> {
  const profile = (await getValue<InterestProfile>("interestProfile", options)) ?? {};
  const existing = profile[tag]?.score ?? 0;
  const next: UserInterest = { tag, score: existing + score };
  profile[tag] = next;
  await setValue("interestProfile", profile, options);
  return next;
}

/**
 * 获取UP的标签统计
 */
export async function getUPTagCounts(
  mid: number,
  options: StorageOptions = {}
): Promise<UPTagCount[] | null> {
  const cache = await getValue<UPTagCache>("upTagCache", options);
  if (!cache || !cache[String(mid)]) {
    return null;
  }
  return cache[String(mid)].tags;
}

/**
 * 更新UP的标签统计
 * @param mid UP的mid
 * @param tags 要更新的标签列表
 * @param options 存储选项
 */
export async function updateUPTagCounts(
  mid: number,
  tags: string[],
  options: StorageOptions = {}
): Promise<void> {
  const cache = (await getValue<UPTagCache>("upTagCache", options)) ?? {};
  const midKey = String(mid);

  // 获取现有标签统计
  const existingEntry = cache[midKey] ?? { tags: [], lastUpdate: 0 };
  const existingTagsMap = new Map(existingEntry.tags.map(t => [t.tag, t.count]));

  // 更新标签计数
  for (const tag of tags) {
    const currentCount = existingTagsMap.get(tag) ?? 0;
    existingTagsMap.set(tag, currentCount + 1);
  }

  // 转换回数组并按数量降序排序
  const updatedTags = Array.from(existingTagsMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  // 保存更新
  cache[midKey] = {
    tags: updatedTags,
    lastUpdate: Date.now()
  };

  await setValue("upTagCache", cache, options);
}

/**
 * 获取所有UP的标签统计
 */
export async function getAllUPTagCounts(
  options: StorageOptions = {}
): Promise<UPTagCache | null> {
  return getValue<UPTagCache>("upTagCache", options);
}

/**
 * 清除指定UP的标签统计
 */
export async function clearUPTagCounts(
  mid: number,
  options: StorageOptions = {}
): Promise<void> {
  const cache = (await getValue<UPTagCache>("upTagCache", options)) ?? {};
  const midKey = String(mid);
  if (cache[midKey]) {
    delete cache[midKey];
    await setValue("upTagCache", cache, options);
  }
}
