import { chatComplete, parseTagsFromContent, LlmRequestError } from "../../engine/llm-client.js";
import { 
  getValue, 
  setValue, 
  getFollowedUPList,
  getUPManualTags,
  setUPManualTags,
  addTagsToLibrary
} from "../../database/implementations/index.js";
import type { BackgroundOptions, MessageLike } from "./common-types.js";

declare const chrome: {
  runtime?: {
    sendMessage: (message: unknown) => void;
    getURL?: (path: string) => string;
  };
  notifications?: {
    create: (options: { type: string; iconUrl: string; title: string; message: string }) => void;
  };
  tabs?: {
    update: (tabId: number | undefined, updateProperties: { url: string }) => void;
    remove?: (tabId: number | number[]) => Promise<void>;
    create?: (createProperties: { url: string; active?: boolean }) => Promise<{ id?: number } | undefined>;
  };
};

function toUpUrl(mid: number): string {
  return `https://space.bilibili.com/${mid}`;
}

const collectedPageData = new Map<number, any>();
const classificationQueue: number[] = [];
const pendingClassificationQueue: number[] = [];
let isClassifying = false;
let pageClassifyActive = false;
let pageClassifyStopping = false;
let pageClassifyTotal = 0;
let pageClassifyProcessed = 0;
let pageClassifyTitle = "自动分类";
let pageClassifyDetail = "准备中...";
const upNameMap = new Map<number, string>();

const activeCollectionTabs = new Map<number, number>();
const createdCollectionTabs = new Set<number>();

const MAX_CONCURRENT_TABS = 3;

function sendPageProgress(title: string, detail: string): void {
  if (typeof chrome === "undefined" || !chrome.runtime) return;
  pageClassifyTitle = title;
  pageClassifyDetail = detail;
  chrome.runtime.sendMessage({
    type: "classify_progress",
    payload: {
      active: pageClassifyActive,
      stopping: pageClassifyStopping,
      current: pageClassifyProcessed,
      total: pageClassifyTotal,
      title,
      detail
    }
  });
}

function sendPageComplete(): void {
  if (typeof chrome === "undefined" || !chrome.runtime) return;
  chrome.runtime.sendMessage({ type: "classify_complete" });
}

export function getPageClassifyProgress(): {
  active: boolean;
  stopping: boolean;
  current: number;
  total: number;
  title: string;
  detail: string;
} {
  return {
    active: pageClassifyActive,
    stopping: pageClassifyStopping,
    current: pageClassifyProcessed,
    total: pageClassifyTotal,
    title: pageClassifyTitle,
    detail: pageClassifyDetail
  };
}

function resetPageClassifyState(): void {
  classificationQueue.length = 0;
  pendingClassificationQueue.length = 0;
  collectedPageData.clear();
  activeCollectionTabs.clear();
  createdCollectionTabs.clear();
  upNameMap.clear();
  pageClassifyActive = false;
  pageClassifyStopping = false;
  pageClassifyTotal = 0;
  pageClassifyProcessed = 0;
  pageClassifyTitle = "自动分类";
  pageClassifyDetail = "准备中...";
}

async function finishPageClassification(options: BackgroundOptions = {}, detail: string = "分类完成"): Promise<void> {
  await closeAllCollectionTabs(options);
  const shouldNotify = pageClassifyActive;
  resetPageClassifyState();
  if (shouldNotify) {
    sendPageComplete();
  }
  console.log("[Background] Page classify finished:", detail);
}

function notifyClassificationFailure(options: BackgroundOptions, title: string, message: string): void {
  const notifications = options.notifications ?? (typeof chrome !== "undefined" ? chrome.notifications : undefined);
  if (!notifications) {
    return;
  }
  notifications.create({
    type: "basic",
    iconUrl: chrome.runtime?.getURL?.("icons/icon128.png") || "",
    title,
    message
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitRandom(minMs = 1000, maxMs = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await wait(delay);
}

async function openNextUPPage(mid: number, tabId: number | undefined, options: BackgroundOptions = {}): Promise<void> {
  const tabs = options.tabs ?? (typeof chrome !== "undefined" ? chrome.tabs : undefined);
  if (!tabs) {
    console.log("[Background] ✗ Tabs API not available");
    return;
  }

  if (!tabId) {
    console.log("[Background] ✗ No tabId provided for UP:", mid);
    return;
  }

  await waitRandom();
  console.log("[Background] Updating tab", tabId, "for UP:", mid);
  tabs.update(tabId, { url: toUpUrl(mid) });
  activeCollectionTabs.set(mid, tabId);
}

function enqueueClassification(mid: number): void {
  if (!pendingClassificationQueue.includes(mid)) {
    pendingClassificationQueue.push(mid);
  }
}

async function closeCollectionTab(tabId: number, options: BackgroundOptions = {}): Promise<void> {
  const tabs = options.tabs ?? (typeof chrome !== "undefined" ? chrome.tabs : undefined);
  if (!tabs?.remove) {
    return;
  }
  if (!createdCollectionTabs.has(tabId)) {
    return;
  }
  try {
    await tabs.remove(tabId);
    createdCollectionTabs.delete(tabId);
    console.log("[Background] Closed collection tab", tabId);
  } catch (error) {
    console.warn("[Background] Failed to close tab", tabId, error);
  }
}

async function openNextAvailableUPPage(tabId: number, options: BackgroundOptions = {}): Promise<void> {
  if (classificationQueue.length === 0) {
    await closeCollectionTab(tabId, options);
    return;
  }
  const nextMid = classificationQueue.shift();
  if (!nextMid) {
    await closeCollectionTab(tabId, options);
    return;
  }
  await openNextUPPage(nextMid, tabId, options);
}

async function closeAllCollectionTabs(options: BackgroundOptions = {}): Promise<void> {
  const tabs = options.tabs ?? (typeof chrome !== "undefined" ? chrome.tabs : undefined);
  if (!tabs?.remove || createdCollectionTabs.size === 0) {
    return;
  }
  const toClose = Array.from(createdCollectionTabs);
  createdCollectionTabs.clear();
  try {
    await tabs.remove(toClose);
    console.log("[Background] Closed all collection tabs:", toClose.length);
  } catch (error) {
    console.warn("[Background] Failed to close all collection tabs", error);
  }
}

export function handleCollectionTabRemoved(tabId: number): void {
  let removedMid: number | null = null;
  for (const [mid, activeTabId] of activeCollectionTabs.entries()) {
    if (activeTabId === tabId) {
      removedMid = mid;
      break;
    }
  }
  if (removedMid === null) {
    return;
  }
  activeCollectionTabs.delete(removedMid);
  createdCollectionTabs.delete(tabId);
  classificationQueue.push(removedMid);
  console.log("[Background] Collection tab closed, re-queue UP:", removedMid);
  if (pageClassifyActive) {
    sendPageProgress("自动分类", "采集标签页关闭，已重新排队");
  }
}

export async function handleUPPageCollected(
  message: MessageLike,
  options: BackgroundOptions = {}
): Promise<void> {
  const payload = message.payload as { mid?: number; name?: string; sign?: string; videos?: any[] } | undefined;
  if (!payload?.mid) {
    console.warn("[Background] Invalid UP page data", payload);
    return;
  }

  const getValueFn = options.getValueFn ?? ((key: string) => getValue(key));
  const settings = (await getValueFn("settings")) as { userId?: number } | null;
  const currentUserId = settings?.userId;
  if (currentUserId && payload.mid === currentUserId) {
    console.log("[Background] Ignore current user page collection:", payload.mid);
    return;
  }

  const tabId = activeCollectionTabs.get(payload.mid);
  if (!pageClassifyActive || !tabId) {
    console.log("[Background] Ignore unsolicited UP page collection:", payload.mid);
    return;
  }

  console.log("[Background] UP page data collected:", {
    mid: payload.mid,
    name: payload.name,
    sign: payload.sign,
    videoCount: payload.videos?.length ?? 0
  });
  console.log("[Background] Classification queue:", classificationQueue);
  console.log("[Background] Active collection tabs:", Array.from(activeCollectionTabs.entries()));
  activeCollectionTabs.delete(payload.mid);

  if (!payload.name && (!payload.videos || payload.videos.length === 0)) {
    console.log("[Background] UP", payload.mid, "appears to be invalid, skipping...");
    collectedPageData.delete(payload.mid);
    if (pageClassifyActive) {
      pageClassifyProcessed += 1;
      sendPageProgress(payload.name || "无效UP", "页面数据为空，已跳过");
    }
    if (tabId) {
      await openNextAvailableUPPage(tabId, options);
    }
    return;
  }

  collectedPageData.set(payload.mid, payload);

  if (tabId) {
    await openNextAvailableUPPage(tabId, options);
  }
  enqueueClassification(payload.mid);
  await processNextClassification(options);
}

export async function classifyUPWithPageData(
  mid: number,
  pageData: any,
  existingTags: string[] = [],
  options: BackgroundOptions = {}
): Promise<string[]> {
  const classifyWithPageDataFn = options.classifyWithPageDataFn ?? defaultClassifyWithPageData;
  return classifyWithPageDataFn(mid, pageData, existingTags);
}

async function defaultClassifyWithPageData(
  mid: number,
  pageData: any,
  existingTags: string[] = []
): Promise<string[]> {
  console.log("[Background] Starting LLM classification for UP:", mid);
  console.log("[Background] UP name:", pageData.name);
  console.log("[Background] UP sign:", pageData.sign);
  console.log("[Background] Existing tags:", existingTags);

  const pageText = pageData.pageText ?? "";
  const titles = pageData.videos?.slice(0, 10).map((v: any) => v.title) ?? [];

  console.log("[Background] Page text length:", pageText.length);
  console.log("[Background] Page text preview:", pageText.substring(0, 500));
  console.log("[Background] Video titles for classification:", titles);

  const existing = existingTags.length > 0 ? existingTags.join("、") : "无";
  const prompt = [
    "You are a content classifier.",
    "Return a JSON array of 3 to 5 short Chinese tags.",
    "Prefer existing tags when appropriate and avoid near-duplicate synonyms.",
    `UP: ${pageData.name}`,
    `Bio: ${pageData.sign}`,
    `Existing tags: ${existing}`,
    `Page content (first 2000 chars): ${pageText.substring(0, 2000)}`,
    `Video titles: ${titles.join(" | ")}`
  ].join("\n");

  console.log("[Background] Sending prompt to LLM...");
  console.log("[Background] Prompt:", prompt);

  const content = await chatComplete([
    { role: "system", content: "Classify Bilibili UP content into tags." },
    { role: "user", content: prompt }
  ]);

  if (!content) {
    console.log("[Background] LLM empty response for UP:", mid);
    return [];
  }

  console.log("[Background] LLM raw response for UP", mid, ":", content);
  const tags = parseTagsFromContent(content);
  console.log("[Background] Parsed tags for UP", mid, ":", tags);
  return tags;
}

async function abortForLlmError(mid: number, pageData: any, error: LlmRequestError, options: BackgroundOptions = {}): Promise<void> {
  const statusSuffix = typeof error.status === "number" ? `（HTTP ${error.status}）` : "";
  const upName = pageData?.name || upNameMap.get(mid) || `UP ${mid}`;
  console.error("[Background] Fatal LLM error, stop auto classification:", {
    mid,
    upName,
    status: error.status,
    message: error.message
  });
  pageClassifyStopping = true;
  sendPageProgress("LLM 调用失败", `${upName}${statusSuffix}，自动分类已终止`);
  notifyClassificationFailure(options, "自动分类已终止", `LLM 请求失败${statusSuffix}，请检查 API Key 或模型配置。`);
  await finishPageClassification(options, "LLM 调用失败");
}

async function processNextClassification(options: BackgroundOptions = {}): Promise<void> {
  if (isClassifying) {
    console.log("[Background] Already classifying, skipping...");
    return;
  }

  if (!pageClassifyActive || pageClassifyStopping) {
    if (classificationQueue.length === 0 && pendingClassificationQueue.length === 0 && activeCollectionTabs.size === 0) {
      await finishPageClassification(options, pageClassifyStopping ? "已停止" : "分类完成");
    }
    return;
  }

  if (pendingClassificationQueue.length === 0) {
    if (classificationQueue.length === 0 && activeCollectionTabs.size === 0) {
      console.log("[Background] Classification queue is empty, all done!");
      await finishPageClassification(options);
    }
    return;
  }

  isClassifying = true;
  const mid = pendingClassificationQueue.shift();
  if (mid === undefined) {
    isClassifying = false;
    return;
  }
  const pageData = collectedPageData.get(mid);

  console.log("[Background] Processing classification for UP:", mid);
  console.log("[Background] Queue size:", classificationQueue.length);
  console.log("[Background] Pending classification:", pendingClassificationQueue.slice(0, 5));

  if (!pageData) {
    console.log("[Background] No page data yet for UP", mid, ", waiting...");
    isClassifying = false;
    return;
  }

  try {
    const getValueFn = options.getValueFn ?? ((key: string) => getValue(key));
    const setValueFn = options.setValueFn ?? ((key: string, value: unknown) => setValue(key, value));

    // 获取UP的手动标签
    const existingTagIds = await getUPManualTags(mid);

    console.log("[Background] Existing manual tags for UP", mid, ":", existingTagIds);

    if (existingTagIds.length > 0) {
      console.log("[Background] UP", mid, "already has manual tags, skipping...");
      collectedPageData.delete(mid);
      isClassifying = false;
      if (pageClassifyActive) {
        pageClassifyProcessed += 1;
        sendPageProgress(pageData.name || upNameMap.get(mid) || "已分类UP", "已存在可编辑标签，跳过");
      }
      await processNextClassification(options);
      return;
    }

    // 获取LLM分类的标签名称
    const tagNames = await classifyUPWithPageData(mid, pageData, [], options);
    console.log("[Background] LLM classified tags for UP", mid, ":", tagNames);

    const normalizedTagNames = [...new Set(tagNames.map((tag) => tag.trim()).filter(Boolean))];
    if (normalizedTagNames.length === 0) {
      collectedPageData.delete(mid);
      isClassifying = false;
      if (pageClassifyActive) {
        pageClassifyProcessed += 1;
        sendPageProgress(pageData.name || upNameMap.get(mid) || "分类结果为空", "没有生成有效标签，未写入");
      }
      await processNextClassification(options);
      return;
    }

    // 将标签名称添加到标签库，获取标签ID。自动分类产物按可编辑用户标签存储。
    const addedTags = await addTagsToLibrary(normalizedTagNames, true);
    const tagIds = addedTags.map(tag => tag.id);

    // 保存UP的手动标签
    await setUPManualTags(mid, tagIds);

    console.log("[Background] ✓ Successfully classified UP", mid, "with tags:", normalizedTagNames, "tagIds:", tagIds);
    const remaining =
      classificationQueue.length + pendingClassificationQueue.length + activeCollectionTabs.size;
    console.log("[Background] Progress:", remaining, "UPs remaining (including in-flight)");
    if (pageClassifyActive) {
      pageClassifyProcessed += 1;
      sendPageProgress(
        pageData.name || upNameMap.get(mid) || "自动分类",
        "分类完成，继续处理下一位UP"
      );
    }

    collectedPageData.delete(mid);

    await setValueFn("classifyStatus", { lastUpdate: Date.now() });

    isClassifying = false;
    await processNextClassification(options);
  } catch (error) {
    if (error instanceof LlmRequestError) {
      collectedPageData.delete(mid);
      isClassifying = false;
      await abortForLlmError(mid, pageData, error, options);
      return;
    }

    console.error("[Background] ✗ Classification error for UP", mid, ":", error);
    collectedPageData.delete(mid);
    isClassifying = false;
    if (pageClassifyActive) {
      pageClassifyProcessed += 1;
      sendPageProgress(pageData?.name || upNameMap.get(mid) || "自动分类", "分类失败，已跳过");
    }
  }
}

export async function stopAutoClassification(options: BackgroundOptions = {}): Promise<boolean> {
  if (!pageClassifyActive) {
    return false;
  }

  pageClassifyStopping = true;
  classificationQueue.length = 0;
  pendingClassificationQueue.length = 0;
  collectedPageData.clear();
  sendPageProgress("正在停止分类", "关闭采集标签页并停止后续任务");

  await closeAllCollectionTabs(options);
  activeCollectionTabs.clear();

  if (!isClassifying) {
    await finishPageClassification(options, "已停止");
  }

  return true;
}

export async function startAutoClassification(options: BackgroundOptions = {}): Promise<boolean> {
  console.log("[Background] ===== Starting auto classification =====");

  if (pageClassifyActive) {
    console.log("[Background] Auto classification already running");
    return true;
  }

  // 获取已关注的UP列表
  const followedUPs = await getFollowedUPList();


  console.log("[Background] Loaded followed UP list:", followedUPs.length, "UPs");

  if (followedUPs.length === 0) {
    console.log("[Background] ✗ No followed UPs to classify. Please follow some UPs first.");
    return false;
  }

  resetPageClassifyState();
  pageClassifyActive = true;

  // 筛选出没有手动标签的已关注UP
  const upsWithoutTags = [];
  for (const up of followedUPs) {
    upNameMap.set(up.mid, up.name);
    const existingTagIds = await getUPManualTags(up.mid);
    if (existingTagIds.length === 0) {
      upsWithoutTags.push(up);
      console.log("[Background] UP", up.mid, "has no manual tags, will classify");
    } else {
      console.log("[Background] Skipping UP", up.mid, "- already has manual tags");
    }
  }


  for (const up of upsWithoutTags) {
    classificationQueue.push(up.mid);
  }
  pageClassifyTotal = classificationQueue.length;
  sendPageProgress("自动分类", `待分类 ${pageClassifyTotal} 位UP`);

  console.log("[Background] ✓ Classification queue created with", classificationQueue.length, "UPs");
  console.log("[Background] First 5 UPs in queue:", classificationQueue.slice(0, 5));

  if (classificationQueue.length > 0) {
    const tabs = options.tabs ?? (typeof chrome !== "undefined" ? chrome.tabs : undefined);
    if (!tabs || !tabs.create) {
      console.log("[Background] ✗ Tabs API not available for creating new tabs");
      await finishPageClassification(options, "浏览器标签页能力不可用");
      return false;
    }

    const toOpen = Math.min(MAX_CONCURRENT_TABS, classificationQueue.length);
    console.log("[Background] Creating", toOpen, "tabs for concurrent collection");

    for (let i = 0; i < toOpen; i++) {
      const nextMid = classificationQueue.shift();
      if (!nextMid) break;
      await waitRandom();
      sendPageProgress(upNameMap.get(nextMid) || "自动分类", `正在打开页面采集内容 · ${pageClassifyProcessed}/${pageClassifyTotal}`);
      const created = await tabs.create({ url: toUpUrl(nextMid), active: false });
      if (created?.id) {
        activeCollectionTabs.set(nextMid, created.id);
        createdCollectionTabs.add(created.id);
        console.log("[Background] Created tab", created.id, "for UP:", nextMid);
      }
    }
    return true;
  }

  await finishPageClassification(options, "没有需要分类的UP");
  return false;
}
