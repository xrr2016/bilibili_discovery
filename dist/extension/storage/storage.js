/**
 * Storage helpers based on chrome.storage.local.
 */
function getDefaultStorage() {
    return chrome.storage;
}
/**
 * Set a value in storage.
 */
export async function setValue(key, value, options = {}) {
    const storage = options.storage ?? getDefaultStorage();
    console.log("[Storage] Set", key);
    await storage.local.set({ [key]: value });
}
/**
 * Get a value from storage.
 */
export async function getValue(key, options = {}) {
    const storage = options.storage ?? getDefaultStorage();
    const result = await storage.local.get(key);
    const value = result[key];
    return value ?? null;
}
/**
 * Save UP list cache.
 */
export async function saveUPList(upList, options = {}) {
    const payload = { upList, lastUpdate: Date.now() };
    await setValue("upList", payload, options);
}
/**
 * Load UP list cache.
 */
export async function loadUPList(options = {}) {
    return getValue("upList", options);
}
/**
 * Save video cache for a specific UP.
 */
export async function saveVideoCache(mid, videos, options = {}) {
    const cache = (await getValue("videoCache", options)) ?? {};
    cache[String(mid)] = { videos, lastUpdate: Date.now() };
    await setValue("videoCache", cache, options);
}
/**
 * Load video cache for a specific UP.
 */
export async function loadVideoCache(mid, options = {}) {
    const cache = await getValue("videoCache", options);
    if (!cache) {
        return null;
    }
    return cache[String(mid)] ?? null;
}
/**
 * Update interest score for a tag.
 */
export async function updateInterest(tag, score, options = {}) {
    const profile = (await getValue("interestProfile", options)) ?? {};
    const existing = profile[tag]?.score ?? 0;
    const next = { tag, score: existing + score };
    profile[tag] = next;
    await setValue("interestProfile", profile, options);
    return next;
}
/**
 * 获取UP的标签统计
 */
export async function getUPTagCounts(mid, options = {}) {
    const cache = await getValue("upTagCache", options);
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
export async function updateUPTagCounts(mid, tags, options = {}) {
    const cache = (await getValue("upTagCache", options)) ?? {};
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
export async function getAllUPTagCounts(options = {}) {
    return getValue("upTagCache", options);
}
/**
 * 清除指定UP的标签统计
 */
export async function clearUPTagCounts(mid, options = {}) {
    const cache = (await getValue("upTagCache", options)) ?? {};
    const midKey = String(mid);
    if (cache[midKey]) {
        delete cache[midKey];
        await setValue("upTagCache", cache, options);
    }
}
