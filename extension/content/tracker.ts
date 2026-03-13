/**
 * Track video pages and report watch events.
 */

interface WatchProgress {
  bvid: string;
  title: string;
  upMid?: number;
  upName?: string;
  upFace?: string;
  tags: string[];
  watchedSeconds: number;
  duration: number;
  timestamp: number;
}

function extractBvidFromUrl(url: string): string | null {
  const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function detectVideoElement(): HTMLVideoElement | null {
  return document.querySelector("video");
}

function sendWatchProgress(event: WatchProgress): void {
  console.log("[Tracker] Send watch progress", event);
  try {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.sendMessage !== "function") {
      return;
    }
    chrome.runtime.sendMessage({ type: "watch_progress", payload: event }, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || "";
        // 忽略扩展上下文失效的错误（扩展重新加载时的正常现象）
        if (errorMsg.includes("Extension context invalidated")) {
          console.log("[Tracker] Extension context invalidated, this is expected during reload");
        } else {
          console.warn("[Tracker] Send watch progress failed:", chrome.runtime.lastError);
        }
      }
    });
  } catch (error) {
    console.warn("[Tracker] Send watch progress failed", error);
  }
}

function sendInitializeVideoInfo(event: WatchProgress): void {
  console.log("[Tracker] Send initialize video info", event);
  try {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.sendMessage !== "function") {
      return;
    }
    chrome.runtime.sendMessage({ type: "initialize_video_info", payload: event }, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || "";
        if (errorMsg.includes("Extension context invalidated")) {
          console.log("[Tracker] Extension context invalidated, this is expected during reload");
        } else {
          console.warn("[Tracker] Send initialize video info failed:", chrome.runtime.lastError);
        }
      }
    });
  } catch (error) {
    console.warn("[Tracker] Send initialize video info failed", error);
  }
}

function sendProcessUPInfo(event: WatchProgress): void {
  console.log("[Tracker] Send process UP info", event);
  try {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.sendMessage !== "function") {
      return;
    }
    chrome.runtime.sendMessage({ type: "process_up_info", payload: event }, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || "";
        if (errorMsg.includes("Extension context invalidated")) {
          console.log("[Tracker] Extension context invalidated, this is expected during reload");
        } else {
          console.warn("[Tracker] Send process UP info failed:", chrome.runtime.lastError);
        }
      }
    });
  } catch (error) {
    console.warn("[Tracker] Send process UP info failed", error);
  }
}

function sendProcessVideoTags(event: WatchProgress): void {
  console.log("[Tracker] Send process video tags", event);
  try {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.sendMessage !== "function") {
      return;
    }
    chrome.runtime.sendMessage({ type: "process_video_tags", payload: event }, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || "";
        if (errorMsg.includes("Extension context invalidated")) {
          console.log("[Tracker] Extension context invalidated, this is expected during reload");
        } else {
          console.warn("[Tracker] Send process video tags failed:", chrome.runtime.lastError);
        }
      }
    });
  } catch (error) {
    console.warn("[Tracker] Send process video tags failed", error);
  }
}

interface VideoMeta {
  title: string;
  upMid?: number;
  upName?: string;
  upFace?: string;
  tags: string[];
}

function extractVideoMeta(): VideoMeta {
  const titleSelectors = [
    "h1.video-title",
    "h1.title",
    ".video-title",
    "h1"
  ];
  let title = "";
  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) {
      title = text;
      break;
    }
  }
  if (!title) {
    const docTitle = document.title || "";
    title = docTitle.split("_")[0].split("-")[0].trim();
  }

  let upMid: number | undefined = undefined;
  const win = window as unknown as {
    __INITIAL_STATE__?: { videoData?: { owner?: { mid?: number; name?: string; face?: string } }; tags?: Array<{ tag_name?: string }> };
  };
  const stateMid = win.__INITIAL_STATE__?.videoData?.owner?.mid;
  if (typeof stateMid === "number") {
    upMid = stateMid;
  } else {
    const upLink = document.querySelector('a[href*="space.bilibili.com"]') as HTMLAnchorElement | null;
    const match = upLink?.href?.match(/space\.bilibili\.com\/(\d+)/);
    if (match) {
      upMid = Number(match[1]);
    }
  }

  const tags = new Set<string>();
  for (const tag of win.__INITIAL_STATE__?.tags ?? []) {
    if (tag.tag_name) {
      tags.add(tag.tag_name);
    }
  }
  
  // 提取UP名称
  let upName: string | undefined = undefined;
  const videoDataOwner = win.__INITIAL_STATE__?.videoData?.owner;
  if (videoDataOwner?.name) {
    upName = videoDataOwner.name;
  } else {
    // 如果从__INITIAL_STATE__中获取不到，尝试从页面中提取
    const upNameElement = document.querySelector('.up-name, .author-name, [class*="author"], [class*="up-name"], [class*="uploader"]');
    if (upNameElement) {
      upName = upNameElement.textContent?.trim();
    }
  }
  
  // 提取UP头像
  let upFace: string | undefined = undefined;
  if (videoDataOwner?.face) {
    upFace = videoDataOwner.face;
  } else {
    // 如果从__INITIAL_STATE__中获取不到，尝试从页面中提取
    const upFaceElement = document.querySelector('.up-avatar, .author-avatar, [class*="avatar"], [class*="up-face"], img[src*="bili"]');
    if (upFaceElement) {
      upFace = (upFaceElement as HTMLImageElement).src;
    }
  }
  const tagElements = document.querySelectorAll('a[href*="/tag/"], a[href*="search?keyword="], .tag-link, .tag-item');
  for (const el of Array.from(tagElements)) {
    const text = el.textContent?.trim();
    if (text) {
      tags.add(text);
    }
  }

  return { title, upMid, upName, upFace, tags: Array.from(tags) };
}

function trackVideoPlayback(
  video: HTMLVideoElement,
  bvid: string,
  sendFn: (event: WatchProgress) => void
): void {
  let lastTime = video.currentTime;
  let accumulated = 0;
  let lastSentAt = Date.now();
  let cachedMeta: VideoMeta | null = null;

  const refreshMeta = () => {
    cachedMeta = extractVideoMeta();
  };

  const flush = (reason: string) => {
    if (accumulated < 1) {
      return;
    }
    // 只在初始化时提取一次元数据，避免重复查询DOM
    const meta = cachedMeta ?? extractVideoMeta();
    const event: WatchProgress = {
      bvid,
      title: meta.title,
      upMid: meta.upMid,
      upName: meta.upName,
      upFace: meta.upFace,
      tags: meta.tags,
      watchedSeconds: accumulated,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      timestamp: Date.now()
    };
    console.log("[Tracker] Flush watch progress", reason, event);
    sendFn(event);
    accumulated = 0;
    lastSentAt = Date.now();
  };

  refreshMeta();
  
  // 初始化视频信息、UP信息和标签（只执行一次）
  if (cachedMeta) {
    const initEvent: WatchProgress = {
      bvid,
      title: cachedMeta.title,
      upMid: cachedMeta.upMid,
      upName: cachedMeta.upName,
      upFace: cachedMeta.upFace,
      tags: cachedMeta.tags,
      watchedSeconds: 0,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      timestamp: Date.now()
    };
    
    // 初始化视频信息
    sendInitializeVideoInfo(initEvent);
    
    // 处理UP信息
    if (cachedMeta.upMid) {
      sendProcessUPInfo(initEvent);
    }
    
    // 处理视频标签
    if (cachedMeta.tags && cachedMeta.tags.length > 0) {
      sendProcessVideoTags(initEvent);
    }
  }

  video.addEventListener("timeupdate", () => {
    if (video.seeking) {
      lastTime = video.currentTime;
      return;
    }
    if (!video.paused) {
      const delta = video.currentTime - lastTime;
      if (delta > 0 && delta < 5) {
        accumulated += delta;
      }
      lastTime = video.currentTime;
      const now = Date.now();
      if (accumulated >= 5 || now - lastSentAt >= 15000) {
        flush("tick");
      }
    }
  });

  video.addEventListener("pause", () => flush("pause"));
  video.addEventListener("ended", () => flush("ended"));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      flush("hidden");
    }
  });
  window.addEventListener("beforeunload", () => flush("unload"));
}

function initTracker(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const bvid = extractBvidFromUrl(window.location.href);
  if (!bvid) {
    return;
  }
  console.log(`[Tracker] Video detected: ${bvid}`);
  const video = detectVideoElement();
  if (!video) {
    console.log("[Tracker] Video element not found");
    return;
  }
  trackVideoPlayback(video, bvid, sendWatchProgress);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  initTracker();
}
