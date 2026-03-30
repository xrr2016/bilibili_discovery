
/**
 * 数据处理器
 * 负责处理从content script收集的数据，并写入数据库
 */

import { 
  VideoCollectData, 
  WatchEventCollectData, 
  CreatorCollectData,
  FavoriteStatusEvent,
  UPPageData 
} from '../types.js';
import { 
  CreatorRepositoryImpl 
} from '../../database/implementations/creator-repository.impl.js';
import { 
  VideoRepositoryImpl 
} from '../../database/implementations/video-repository.impl.js';
import { 
  WatchEventRepositoryImpl 
} from '../../database/implementations/watch-event-repository.impl.js';
import { 
  TagRepositoryImpl 
} from '../../database/implementations/tag-repository.impl.js';
import { 
  ImageRepositoryImpl 
} from '../../database/implementations/image-repository.impl.js';
import { 
  Platform,
  TagSource,
  ID
} from '../../database/types/base.js';
import { 
  Video,
  Creator,
  WatchEvent
} from '../../database/types/index.js';

/**
 * 数据处理器类
 */
export class DataProcessor {
  private creatorRepo: CreatorRepositoryImpl;
  private videoRepo: VideoRepositoryImpl;
  private watchEventRepo: WatchEventRepositoryImpl;
  private tagRepo: TagRepositoryImpl;
  private imageRepo: ImageRepositoryImpl;

  constructor() {
    this.imageRepo = new ImageRepositoryImpl();
    this.creatorRepo = new CreatorRepositoryImpl(this.imageRepo);
    this.videoRepo = new VideoRepositoryImpl();
    this.watchEventRepo = new WatchEventRepositoryImpl();
    this.tagRepo = new TagRepositoryImpl();
  }

  /**
   * 处理UP主数据
   * 对比数据是否发生变化，决定是否需要更新
   */
  async processCreatorData(data: CreatorCollectData): Promise<void> {
    console.log('[DataProcessor] 处理UP主数据:', data);

    // 查询数据库中是否已存在该UP主
    const existingCreator = await this.creatorRepo.getCreator(data.creatorId);

    if (existingCreator) {
      // UP主已存在，检查是否需要更新
      const needsUpdate = 
        existingCreator.name !== data.name ||
        existingCreator.avatarUrl !== data.avatarUrl ||
        existingCreator.isFollowing !== data.isFollowing;

      if (needsUpdate) {
        console.log('[DataProcessor] UP主数据发生变化，需要更新:', {
          creatorId: data.creatorId,
          oldName: existingCreator.name,
          newName: data.name,
          oldAvatarUrl: existingCreator.avatarUrl,
          newAvatarUrl: data.avatarUrl,
          oldIsFollowing: existingCreator.isFollowing,
          newIsFollowing: data.isFollowing
        });

        // 更新UP主信息
        const updatedCreator: Creator = {
          ...existingCreator,
          name: data.name,
          avatarUrl: data.avatarUrl,
          description: data.description,
          isFollowing: data.isFollowing,
          followTime: data.isFollowing ? (data.followTime || Date.now()) : existingCreator.followTime,
          updatedAt: Date.now()
        };

        await this.creatorRepo.upsertCreator(updatedCreator);

        // 如果头像URL发生变化，下载并存储新头像
        if (existingCreator.avatarUrl !== data.avatarUrl && data.avatarUrl) {
          await this.downloadAndSaveAvatar(data.creatorId, data.avatarUrl);
        }
      } else {
        console.log('[DataProcessor] UP主数据未发生变化，跳过更新');
      }
    } else {
      // UP主不存在，创建新的UP主记录
      console.log('[DataProcessor] UP主不存在，创建新记录:', data);

      // 下载并存储头像
      let avatar: ID | undefined;
      if (data.avatarUrl) {
        avatar = await this.downloadAndSaveAvatar(data.creatorId, data.avatarUrl);
      }

      const newCreator: Creator = {
        creatorId: data.creatorId,
        platform: data.platform,
        name: data.name,
        avatar: avatar || 0,
        avatarUrl: data.avatarUrl,
        isLogout: 0,
        description: data.description,
        createdAt: Date.now(),
        followTime: data.followTime || Date.now(),
        isFollowing: data.isFollowing,
        tagWeights: [],
        updatedAt: Date.now()
      };

      await this.creatorRepo.upsertCreator(newCreator);
    }
  }

  /**
   * 处理视频数据
   * 对比数据是否发生变化，决定是否需要更新
   */
  async processVideoData(data: VideoCollectData): Promise<void> {
    console.log('[DataProcessor] 处理视频数据:', data);

    // 首先确保UP主存在
    await this.processCreatorData({
      creatorId: data.creatorId,
      platform: Platform.BILIBILI,
      name: data.creatorName || '',
      avatarUrl: data.creatorAvatarUrl || '',
      description: '',
      isFollowing: 0,
      followTime: 0
    });

    // 查询数据库中是否已存在该视频
    // 这里需要通过BV号查询，但Video表没有BV号索引
    // 暂时通过creatorId获取该UP主的所有视频，然后查找匹配的BV号
    const creatorVideos = await this.videoRepo.getCreatorVideos(
      data.creatorId,
      Platform.BILIBILI,
      { page: 0, pageSize: 1000 }
    );

    // 查找匹配的视频
    const existingVideo = creatorVideos.items.find(v => v.bv === data.bv);

    if (existingVideo) {
      // 视频已存在，检查是否需要更新
      const needsUpdate = 
        existingVideo.title !== data.title ||
        existingVideo.description !== data.description;

      if (needsUpdate) {
        console.log('[DataProcessor] 视频数据发生变化，需要更新:', {
          videoId: existingVideo.videoId,
          bv: data.bv,
          oldTitle: existingVideo.title,
          newTitle: data.title,
          oldDescription: existingVideo.description,
          newDescription: data.description
        });

        // 更新视频信息
        const updatedVideo: Video = {
          ...existingVideo,
          title: data.title,
          description: data.description || '',
          updatedAt: Date.now()
        };

        await this.videoRepo.upsertVideo(updatedVideo);

        // 处理视频标签
        if (data.tags && data.tags.length > 0) {
          await this.processVideoTags(existingVideo.videoId, data.tags);
        }
      } else {
        console.log('[DataProcessor] 视频数据未发生变化，跳过更新');
      }
    } else {
      // 视频不存在，创建新的视频记录
      console.log('[DataProcessor] 视频不存在，创建新记录:', data);

      // 处理视频标签
      const tagIds = data.tags && data.tags.length > 0 
        ? await this.createTags(data.tags) 
        : [];

      // 下载并存储封面图片
      let picture: ID | undefined;
      if (data.coverUrl) {
        picture = await this.downloadAndSaveCover(data.coverUrl);
      }

      const newVideo: Video = {
        videoId: 0, // 由createVideo自动生成
        bv: data.bv,
        platform: Platform.BILIBILI,
        creatorId: data.creatorId,
        title: data.title,
        description: data.description || '',
        duration: data.duration,
        publishTime: data.publishTime || Date.now(),
        tags: tagIds,
        createdAt: Date.now(),
        coverUrl: data.coverUrl,
        picture: picture || 0,
        isInvalid: false
      };

      await this.videoRepo.createVideo(newVideo);
    }
  }

  /**
   * 处理观看事件数据
   * 直接写入观看数据
   */
  async processWatchEventData(data: WatchEventCollectData): Promise<void> {
    console.log('[DataProcessor] 处理观看事件数据:', data);

    // 首先确保UP主和视频存在
    if (data.creatorId) {
      await this.processCreatorData({
        creatorId: data.creatorId,
        platform: Platform.BILIBILI,
        name: '',
        avatarUrl: '',
        description: '',
        isFollowing: 0,
        followTime: 0
      });
    }

    // 查找视频ID
    const videoId = await this.findVideoIdByBv(data.bv);
    if (!videoId) {
      console.warn('[DataProcessor] 视频不存在，无法记录观看事件:', data.bv);
      return;
    }

    // 记录观看事件
    const watchEvent: Omit<WatchEvent, 'eventId'> = {
      platform: Platform.BILIBILI,
      videoId,
      creatorId: data.creatorId || videoId, // 如果没有creatorId，使用videoId
      watchTime: data.watchTime,
      watchDuration: data.watchDuration,
      videoDuration: data.videoDuration,
      progress: data.progress,
      isComplete: data.isComplete,
      endTime: data.endTime
    };

    await this.watchEventRepo.recordWatchEvent(watchEvent);
  }

  /**
   * 处理收藏事件数据
   */
  async processFavoriteEventData(data: FavoriteStatusEvent): Promise<void> {
    console.log('[DataProcessor] 处理收藏事件数据:', data);
    // TODO: 实现收藏数据的处理
    // 需要查看CollectionRepositoryImpl和CollectionItemRepositoryImpl的实现
  }

  /**
   * 处理UP页面数据
   */
  async processUPPageData(data: UPPageData): Promise<void> {
    console.log('[DataProcessor] 处理UP页面数据:', data);

    // 处理UP主数据
    await this.processCreatorData({
      creatorId: data.mid,
      platform: Platform.BILIBILI,
      name: data.name,
      avatarUrl: data.face,
      description: data.sign,
      isFollowing: 0,
      followTime: 0
    });

    // TODO: 处理视频列表数据
    // data.videos 中的视频可以批量创建
  }

  /**
   * 创建标签
   */
  private async createTags(tagNames: string[]): Promise<ID[]> {
    console.log('[DataProcessor] 创建标签:', tagNames);
    return await this.tagRepo.createTags(tagNames, TagSource.SYSTEM);
  }

  /**
   * 处理视频标签
   */
  private async processVideoTags(videoId: ID, tagNames: string[]): Promise<void> {
    console.log('[DataProcessor] 处理视频标签:', { videoId, tagNames });

    // 创建或获取标签ID
    const tagIds = await this.createTags(tagNames);

    // 更新视频标签
    await this.videoRepo.updateVideoTags(videoId, tagIds);
  }

  /**
   * 下载并保存UP主头像
   */
  private async downloadAndSaveAvatar(creatorId: ID, avatarUrl: string): Promise<ID | undefined> {
    try {
      console.log('[DataProcessor] 下载UP主头像:', avatarUrl);
      const response = await fetch(avatarUrl);
      if (response.ok) {
        const blob = await response.blob();
        await this.creatorRepo.saveAvatarBinary(creatorId, blob);
        // 重新获取UP主信息以获取头像ID
        const updatedCreator = await this.creatorRepo.getCreator(creatorId);
        return updatedCreator?.avatar;
      }
    } catch (error) {
      console.error('[DataProcessor] 下载UP主头像失败:', error);
    }
    return undefined;
  }

  /**
   * 下载并保存视频封面
   */
  private async downloadAndSaveCover(coverUrl: string): Promise<ID | undefined> {
    try {
      console.log('[DataProcessor] 下载视频封面:', coverUrl);
      const response = await fetch(coverUrl);
      if (response.ok) {
        const blob = await response.blob();
        // 创建图片记录
        const image = await this.imageRepo.createImage({
          purpose: 'cover' as any,
          data: blob
        });
        return image.metadata.id;
      }
    } catch (error) {
      console.error('[DataProcessor] 下载视频封面失败:', error);
    }
    return undefined;
  }

  /**
   * 通过BV号查找视频ID
   * 由于Video表没有BV号索引，需要遍历查询
   */
  private async findVideoIdByBv(bv: string): Promise<ID | undefined> {
    // 暂时通过获取所有视频来查找
    // TODO: 优化这个查询，可以考虑添加BV号索引
    const allVideos = await this.videoRepo.getAllVideos();
    const video = allVideos.find(v => v.bv === bv);
    return video?.videoId;
  }
}
