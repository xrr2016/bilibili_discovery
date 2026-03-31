/**
 * 收藏夹处理器（重构版）
 * 抽象统一视频处理流程
 */

import { VideoRepositoryImpl } from "../../database/implementations/video-repository.impl.js";
import { CreatorRepositoryImpl } from "../../database/implementations/creator-repository.impl.js";
import { CollectionRepositoryImpl } from "../../database/implementations/collection-repository.impl.js";
import { CollectionItemRepositoryImpl } from "../../database/implementations/collection-item-repository.impl.js";
import { TagRepositoryImpl } from "../../database/implementations/tag-repository.impl.js";
import { DBUtils, STORE_NAMES } from "../../database/indexeddb/index.js";

import { getFavoriteVideos, getCollectedVideos } from "../../api/favorite.js";
import { getVideoTagsDetail } from "../../api/video.js";

import type {
  FavoriteFolderInfo,
  FavoriteVideoInfo,
  SubscribedFavoriteFolderInfo,
  SubscribedFavoriteVideoInfo
} from "../../api/types.js";

import { Platform, TagSource } from "../../database/types/base.js";
import type { Video } from "../../database/types/video.js";
import type { ProgressCallback } from "./types.js";

/**
 * 通用视频结构（统一抽象）
 */
type NormalizedVideo = {
  bvid: string;
  title: string;
  intro: string;
  duration: number;
  pubtime: number;
  cover: string;
  upper: {
    mid: number;
    name: string;
    face?: string;
  };
};

/**
 * 视频获取策略
 */
type FetchStrategy<TFolder, TVideo> = {
  fetchVideos: (folderId: string, page: number, pageSize: number) => Promise<TVideo[]>;
  normalizeVideo: (video: TVideo) => NormalizedVideo;
  getDescription: (folder: TFolder) => string;
  getLocalItems: (collectionId: number) => Promise<any[]>;
};

export class FolderProcessor {
  private videoRepo = new VideoRepositoryImpl();
  private creatorRepo = new CreatorRepositoryImpl();
  private collectionRepo = new CollectionRepositoryImpl();
  private collectionItemRepo = new CollectionItemRepositoryImpl();
  private tagRepo = new TagRepositoryImpl();

  /**
   * 通用处理流程（核心抽象）
   */
  private async processFolderCore<TFolder, TVideo>(
    folder: TFolder & { id: number | string; title: string; media_count: number },
    strategy: FetchStrategy<TFolder, TVideo>,
    onProgress: ProgressCallback,
    abortSignal: AbortSignal
  ) {
    const folderId = Number(folder.id);

    const localCollection = await this.collectionRepo.getCollection(folderId);
    const localItems = localCollection
      ? await strategy.getLocalItems(folderId)
      : [];

    const localCount = localItems.length;
    const remoteCount = folder.media_count;

    if (localCount >= remoteCount) {
      onProgress(1, 1, `收藏夹 "${folder.title}" 已是最新`);
      return;
    }

    const needFetchCount = remoteCount - localCount;
    onProgress(0, needFetchCount, `需要拉取 ${needFetchCount} 个视频`);

    const allVideos: TVideo[] = [];
    let page = 1;
    const pageSize = 20;
    let consecutiveExists = 0;
    const maxConsecutiveExists = 5;
    let shouldSkipToExisting = false;
    let skipOffset = 0; // 跳转到本地已存在数量的位置

    // 获取本地已存在视频的 bvid 集合，用于快速判断
    const existingBvids = new Set<string>();
    const bvidToVideoId = new Map<string, number>(); // bvid 到 videoId 的映射
    for (const item of localItems) {
      const video = await this.videoRepo.getVideo(item.videoId);
      if (video?.bv) {
        existingBvids.add(video.bv);
        bvidToVideoId.set(video.bv, item.videoId);
      }
    }

    // 如果远程数量比本地多，尝试从开头检测新数据
    if (remoteCount > localCount) {
      const firstPageVideos = await strategy.fetchVideos(String(folder.id), 1, Math.min(pageSize, remoteCount));
      if (firstPageVideos.length > 0) {
        let newVideoCount = 0;
        for (let i = 0; i < firstPageVideos.length; i++) {
          const v = firstPageVideos[i];
          const nv = strategy.normalizeVideo(v);

          // 检查视频和收藏项是否都存在
          const videoExists = existingBvids.has(nv.bvid);
          const itemExists = bvidToVideoId.has(nv.bvid); // 检查收藏项是否存在

          if (videoExists && itemExists) {
            consecutiveExists++;
            if (consecutiveExists >= maxConsecutiveExists) {
              // 找到连续多个已存在的数据，可以跳转
              shouldSkipToExisting = true;
              skipOffset = i - consecutiveExists + 1; // 从第一个已存在的位置开始
              break;
            }
          } else {
            consecutiveExists = 0;
            if (!videoExists || !itemExists) {
              newVideoCount++;
              allVideos.push(v);
            }
          }
        }

        // 如果检测到新数据且可以跳转，更新起始页
        if (shouldSkipToExisting && skipOffset > 0) {
          page = Math.floor(skipOffset / pageSize) + 1;
          onProgress(0, needFetchCount, `检测到 ${skipOffset} 个新数据，从第 ${page} 页开始继续处理`);
        }
      }
    }

    // 继续拉取剩余数据
    while (true) {
      if (abortSignal.aborted) throw new Error("AbortError");

      const videos = await strategy.fetchVideos(String(folder.id), page, pageSize);
      if (videos.length === 0) break;

      // 检查当前页是否全部已存在
      let allExistInPage = true;
      for (const v of videos) {
        if (abortSignal.aborted) throw new Error("AbortError");

        const nv = strategy.normalizeVideo(v);

        // 同时检查视频和收藏项是否存在
        const videoExists = existingBvids.has(nv.bvid);
        const itemExists = bvidToVideoId.has(nv.bvid); // 检查收藏项是否存在
        const exists = videoExists && itemExists;

        if (exists) {
          consecutiveExists++;
          if (consecutiveExists >= maxConsecutiveExists) {
            break;
          }
        } else {
          consecutiveExists = 0;
          allExistInPage = false;
          allVideos.push(v);
        }
      }

      // 如果连续多个视频都已存在，或者当前页全部已存在，停止拉取
      if (consecutiveExists >= maxConsecutiveExists || allExistInPage) {
        break;
      }
      
      if (videos.length < pageSize) {
        break;
      }

      page++;
    }

    if (allVideos.length === 0) {
      onProgress(1, 1, `收藏夹 "${folder.title}" 无新视频`);
      return;
    }

    // 创建收藏夹
    if (!localCollection) {
      await this.collectionRepo.createCollectionWithId(folderId, {
        platform: Platform.BILIBILI,
        name: folder.title,
        description: strategy.getDescription(folder),
        type: "user",
        createdAt: Date.now(),
        lastUpdate: Date.now()
      });
    }

    // 处理视频
    for (let i = 0; i < allVideos.length; i++) {
      if (abortSignal.aborted) throw new Error("AbortError");

      const raw = allVideos[i];
      const video = strategy.normalizeVideo(raw);

      onProgress(i + 1, allVideos.length, `正在处理视频: ${video.title}`);

      const isInvalid = video.title === "已失效视频";
      const creatorId = Number(video.upper.mid);

      // creator
      let creator = await this.creatorRepo.getCreator(creatorId);
      if (!creator) {
        creator = {
          creatorId,
          platform: Platform.BILIBILI,
          name: video.upper.name || "",
          avatar: 0,
          avatarUrl: video.upper.face || "",
          isLogout: 0,
          description: "",
          createdAt: Date.now(),
          followTime: Date.now(),
          isFollowing: 0,
          tagWeights: []
        };
        await this.creatorRepo.upsertCreator(creator);
      }

      // video
      const videoData = {
        bv: video.bvid,
        platform: Platform.BILIBILI,
        creatorId,
        title: video.title,
        description: video.intro,
        duration: video.duration,
        publishTime: video.pubtime,
        tags: [],
        coverUrl: video.cover,
        isInvalid
      };

      const existingVideo = await this.videoRepo.getVideoByBv(video.bvid);
      let videoId: number;
      const isNewVideo = !existingVideo;

      if (existingVideo) {
        const updated: Video = { ...existingVideo, ...videoData } as Video;
        await this.videoRepo.upsertVideo(updated);
        videoId = updated.videoId;
      } else {
        const created = await this.videoRepo.createVideo(videoData);
        videoId = created.videoId;
      }

      // tags - 只对新视频获取标签
      if (isNewVideo && !isInvalid) {
        try {
          const tags = await getVideoTagsDetail(video.bvid);
          if (tags?.length) {
            const tagIds: number[] = [];

            for (const t of tags) {
              const tagId = Number(t.tag_id);
              await this.tagRepo.createTagWithId(tagId, t.tag_name, TagSource.SYSTEM);
              tagIds.push(tagId);
            }

            await this.videoRepo.updateVideoTags(videoId, tagIds);
          }
        } catch (e) {
          console.error("tag fetch error:", e);
        }
      }

    }
  }

  /**
   * 用户收藏夹
   */
  async processFolder(
    folder: FavoriteFolderInfo,
    onProgress: ProgressCallback,
    abortSignal: AbortSignal
  ) {
    return this.processFolderCore(folder, {
      fetchVideos: getFavoriteVideos,
      normalizeVideo: (v: FavoriteVideoInfo): NormalizedVideo => ({
        bvid: v.bvid,
        title: v.title,
        intro: v.intro || "",
        duration: v.duration,
        pubtime: v.pubtime,
        cover: v.cover,
        upper: {
          mid: Number(v.upper.mid),
          name: v.upper.name || "",
          face: v.upper.face
        }
      }),
      getDescription: () => "从B站导入的收藏夹",
      getLocalItems: (id) =>
        DBUtils.getByIndex(STORE_NAMES.COLLECTION_ITEMS, "collectionId", String(id))
    }, onProgress, abortSignal);
  }

  /**
   * 订阅收藏夹
   */
  async processCollectedFolder(
    folder: SubscribedFavoriteFolderInfo,
    onProgress: ProgressCallback,
    abortSignal: AbortSignal
  ) {
    return this.processFolderCore(folder, {
      fetchVideos: getCollectedVideos,
      normalizeVideo: (v: SubscribedFavoriteVideoInfo): NormalizedVideo => ({
        bvid: v.bvid,
        title: v.title,
        intro: "",
        duration: v.duration,
        pubtime: v.pubtime,
        cover: v.cover,
        upper: {
          mid: Number(v.upper.mid),
          name: v.upper.name
        }
      }),
      getDescription: (f) => `从B站订阅的收藏夹: ${f.intro}`,
      getLocalItems: (id) =>
        this.collectionItemRepo.getItemsByCollection(id)
    }, onProgress, abortSignal);
  }
}