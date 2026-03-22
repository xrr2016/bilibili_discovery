import type { AggregatedVideo } from "./types.js";
import { VideoRepository } from "../../database/implementations/video-repository.impl.js";
import { Platform } from "../../database/types/base.js";
import { LRUCache } from "./cache.js";
import { AsyncTaskCache } from "./async-task-cache.js";

const videoRepository = new VideoRepository();
const BILIBILI = Platform.BILIBILI;

const pictureCache = new LRUCache<string, string>(100);
const pictureTasks = new AsyncTaskCache<string, string | null>();

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert blob"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function savePictureToDatabase(videoId: string, picture: string) {
  await videoRepository.updateVideoPicture(videoId, BILIBILI, picture);
}

export async function fetchAndCachePicture(
  video: AggregatedVideo
): Promise<string | null> {
  if (!video.coverUrl) return null;

  const cached = pictureCache.get(video.videoId);
  if (cached) {
    return cached;
  }

  return pictureTasks.getOrCreate(video.videoId, async () => {
    try {
      const res = await fetch(video.coverUrl!);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const picture = await blobToDataUrl(await res.blob());

      pictureCache.set(video.videoId, picture);

      await savePictureToDatabase(video.videoId, picture);
      return picture;
    } catch (e) {
      console.warn("[CoverCache] failed:", video.videoId, e);
      return null;
    }
  });
}

export function bindCoverImage(
  img: HTMLImageElement,
  video: AggregatedVideo
): void {
  const cached = pictureCache.get(video.videoId);

  if (cached) {
    img.src = cached;
    return;
  }

  if (!video.coverUrl) {
    img.src = "";
    return;
  }

  img.src = video.coverUrl;

  void fetchAndCachePicture(video).then((p) => {
    if (p && img.src !== p) {
      img.src = p;
    }
  });
}

export function bindCoverImageWithLazyLoad(
  img: HTMLImageElement,
  video: AggregatedVideo
): void {
  img.loading = "lazy";
  img.decoding = "async";

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          bindCoverImage(img, video);
          observer.unobserve(img);
        }
      }
    },
    { rootMargin: "50px", threshold: 0.01 }
  );

  observer.observe(img);
}