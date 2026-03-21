import {
  addTagsToLibrary,
  getValue,
  loadUPList,
  recordWatchProgressEvent,
  saveUPList,
  updateUPTagWeights,
  upsertTrackedVideo,
  type UP
} from "../../database/implementations/index.js";
import type { BackgroundOptions, WatchProgressPayload } from "./common-types.js";

export async function updateWatchStats(
  payload: WatchProgressPayload,
  options: BackgroundOptions = {}
): Promise<void> {
  console.log("[WatchStats] Updating watch time stats with payload:", payload);

  const delta = Math.max(0, payload.watchedSeconds || 0);
  if (delta <= 0 || !payload.bvid || !payload.upMid) {
    return;
  }

  await recordWatchProgressEvent(payload);
  await upsertTrackedVideo(payload);
  console.log("[WatchStats] Watch event saved to database");
}

/**
 * 初始化视频信息（第一次观看时调用）
 */
export async function initializeVideoInfo(
  payload: WatchProgressPayload,
  options: BackgroundOptions = {}
): Promise<void> {
  console.log("[WatchStats] Initializing video info with payload:", payload);
  if (!payload.bvid) {
    return;
  }

  await upsertTrackedVideo(payload);
  console.log("[WatchStats] Video info saved to database:", payload.bvid);
}

/**
 * 处理UP信息（添加新UP或更新现有UP）
 */
export async function processUPInfo(
  payload: WatchProgressPayload,
  options: BackgroundOptions = {}
): Promise<void> {
  if (!payload.upMid) {
    return;
  }

  const getValueFn = options.getValueFn ?? ((key: string) => getValue(key));
  const settings = (await getValueFn("settings")) as { userId?: number } | null;
  const currentUserId = settings?.userId;
  if (currentUserId && payload.upMid === currentUserId) {
    console.log("[WatchStats] Skipping current user record:", payload.upMid);
    return;
  }

  console.log("[WatchStats] Processing UP info:", payload.upMid);
  const cache = await loadUPList();
  const existingUP = cache?.upList.find(up => up.mid === payload.upMid);

  if (!existingUP) {
    // UP不存在于数据库中，添加并标记为未关注
    console.log("[WatchStats] Adding new UP to database:", payload.upMid);
    const newUP: UP = {
      mid: payload.upMid,
      name: payload.upName || "",
      face: payload.upFace || "",
      sign: "",
      follow_time: 0,
      is_followed: false
    };
    const currentUPList = cache?.upList ?? [];
    await saveUPList([...currentUPList, newUP]);
    console.log("[WatchStats] New UP added to database:", payload.upMid);
  } else {
    // 更新现有UP的信息（如果需要）
    let needUpdate = false;
    if (payload.upName && existingUP.name !== payload.upName) {
      existingUP.name = payload.upName;
      needUpdate = true;
    }
    if (payload.upFace && existingUP.face !== payload.upFace) {
      existingUP.face = payload.upFace;
      needUpdate = true;
    }
    if (needUpdate) {
      await saveUPList(cache?.upList ?? []);
      console.log("[WatchStats] UP info updated:", payload.upMid);
    }
  }
}

/**
 * 处理视频标签（添加到标签库并更新UP的标签权重）
 */
export async function processVideoTags(
  payload: WatchProgressPayload,
  options: BackgroundOptions = {}
): Promise<void> {
  if (!payload.tags || payload.tags.length === 0) {
    return;
  }

  console.log("[WatchStats] Processing video tags:", payload.tags);

  // 将标签添加到标签库，并获取标签ID（程序自动收集的标签）
  const tags = await addTagsToLibrary(payload.tags, false);
  const tagIds = tags.map(tag => tag.id);
  await upsertTrackedVideo(payload, tagIds);

  // 如果有UP，更新UP的标签权重
  if (payload.upMid) {
    await updateUPTagWeights(payload.upMid, tagIds, false);
    console.log(`[WatchStats] Updated tag weights for UP ${payload.upMid}`);
  }

  console.log("[WatchStats] Video tags saved to database");
}
