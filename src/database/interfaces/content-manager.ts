
/**
 * 内容管理接口
 * 负责管理创作者(UP主/Channel)和视频的基础信息
 */

import type {
  Creator,
  Video,
  Collection,
  CreatorQueryParams,
  VideoQueryParams,
  CollectionQueryParams,
  DBResult,
  PaginationParams,
  PaginationResult,
  ID
} from '../types';

/**
 * 创作者管理接口
 */
export interface ICreatorManager {
  /**
   * 创建或更新创作者信息
   * @param creator 创作者信息
   * @returns 操作结果
   */
  upsertCreator(creator: Creator): Promise<DBResult<Creator>>;

  /**
   * 获取创作者信息
   * @param creatorId 创作者ID
   * @returns 创作者信息
   */
  getCreator(creatorId: ID): Promise<DBResult<Creator>>;

  /**
   * 查询创作者列表
   * @param params 查询参数
   * @param pagination 分页参数
   * @returns 创作者列表
   */
  queryCreators(
    params: CreatorQueryParams,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<Creator>>>;

  /**
   * 更新创作者关注状态
   * @param creatorId 创作者ID
   * @param isFollowing 是否关注
   * @returns 操作结果
   */
  updateFollowStatus(
    creatorId: ID,
    isFollowing: boolean
  ): Promise<DBResult<void>>;

  /**
   * 更新创作者标签权重
   * @param creatorId 创作者ID
   * @param tagWeights 标签权重列表
   * @returns 操作结果
   */
  updateCreatorTagWeights(
    creatorId: ID,
    tagWeights: Array<{tag_id: ID, weight: number}>
  ): Promise<DBResult<void>>;

  /**
   * 获取创作者的视频列表
   * @param creatorId 创作者ID
   * @param pagination 分页参数
   * @returns 视频列表
   */
  getCreatorVideos(
    creatorId: ID,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<Video>>>;
}

/**
 * 视频管理接口
 */
export interface IVideoManager {
  /**
   * 创建或更新视频信息
   * @param video 视频信息
   * @returns 操作结果
   */
  upsertVideo(video: Video): Promise<DBResult<Video>>;

  /**
   * 获取视频信息
   * @param videoId 视频ID
   * @returns 视频信息
   */
  getVideo(videoId: ID): Promise<DBResult<Video>>;

  /**
   * 批量获取视频信息
   * @param videoIds 视频ID列表
   * @returns 视频信息列表
   */
  getVideos(videoIds: ID[]): Promise<DBResult<Video[]>>;

  /**
   * 查询视频列表
   * @param params 查询参数
   * @param pagination 分页参数
   * @returns 视频列表
   */
  queryVideos(
    params: VideoQueryParams,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<Video>>>;

  /**
   * 更新视频标签
   * @param videoId 视频ID
   * @param tags 视频标签列表
   * @returns 操作结果
   */
  updateVideoTags(
    videoId: ID,
    tags: Array<{tag_id: ID, source: 'user' | 'system', confidence: number}>
  ): Promise<DBResult<void>>;
}

/**
 * 收藏管理接口
 */
export interface ICollectionManager {
  /**
   * 创建收藏夹
   * @param collection 收藏夹信息
   * @returns 操作结果
   */
  createCollection(collection: Omit<Collection, 'collection_id' | 'created_at' | 'updated_at'>): Promise<DBResult<Collection>>;

  /**
   * 更新收藏夹
   * @param collectionId 收藏夹ID
   * @param updates 更新内容
   * @returns 操作结果
   */
  updateCollection(
    collectionId: ID,
    updates: Partial<Pick<Collection, 'name' | 'video_ids'>>
  ): Promise<DBResult<Collection>>;

  /**
   * 删除收藏夹
   * @param collectionId 收藏夹ID
   * @returns 操作结果
   */
  deleteCollection(collectionId: ID): Promise<DBResult<void>>;

  /**
   * 获取收藏夹
   * @param collectionId 收藏夹ID
   * @returns 收藏夹信息
   */
  getCollection(collectionId: ID): Promise<DBResult<Collection>>;

  /**
   * 查询收藏夹列表
   * @param params 查询参数
   * @param pagination 分页参数
   * @returns 收藏夹列表
   */
  queryCollections(
    params: CollectionQueryParams,
    pagination?: PaginationParams
  ): Promise<DBResult<PaginationResult<Collection>>>;

  /**
   * 添加视频到收藏夹
   * @param collectionId 收藏夹ID
   * @param videoId 视频ID
   * @returns 操作结果
   */
  addVideoToCollection(
    collectionId: ID,
    videoId: ID
  ): Promise<DBResult<void>>;

  /**
   * 从收藏夹移除视频
   * @param collectionId 收藏夹ID
   * @param videoId 视频ID
   * @returns 操作结果
   */
  removeVideoFromCollection(
    collectionId: ID,
    videoId: ID
  ): Promise<DBResult<void>>;
}

/**
 * 内容管理统一接口
 */
export interface IContentManager extends ICreatorManager, IVideoManager, ICollectionManager {}
