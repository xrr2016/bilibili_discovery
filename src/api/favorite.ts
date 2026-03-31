/**
 * 收藏夹相关 API
 */

import type {
  FavoriteFolderInfo,
  FavoriteVideoInfo,
  SubscribedFavoriteFolderInfo,
  SubscribedFavoriteVideoInfo
} from "./types.js";
import { apiRequest, type ApiRequestOptions, RateLimitError } from "./request.js";

/**
 * 获取用户收藏夹列表
 * @param up_mid 用户ID
 * @param options API请求选项
 */
export async function getFavoriteFolders(
  up_mid: string,
  options: ApiRequestOptions = {}
): Promise<FavoriteFolderInfo[]> {
  const url = `https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=${up_mid}`;
  const data = await apiRequest<{ count: number; list: FavoriteFolderInfo[] }>(url, options);
  const folders = data?.list ?? [];
  return folders;
}

/**
 * 获取用户订阅的合集列表
 * @param up_mid 用户ID
 * @param options API请求选项
 */
export async function getCollectedFolders(
  up_mid: string,
  options: ApiRequestOptions = {}
): Promise<SubscribedFavoriteFolderInfo[]> {
  const allFolders: SubscribedFavoriteFolderInfo[] = [];
  let page = 1;
  const pageSize = 50;

  while (true) {
    const url = `https://api.bilibili.com/x/v3/fav/folder/collected/list?pn=${page}&ps=${pageSize}&up_mid=${up_mid}&platform=web&web_location=333.1387`;
    const data = await apiRequest<{ count: number; list: SubscribedFavoriteFolderInfo[] }>(url, options);
    const folders = data?.list ?? [];

    if (folders.length === 0) {
      break;
    }

    // 将获取到的收藏夹添加到 allFolders 数组中
    allFolders.push(...folders);

    // 如果获取的数量小于页大小，说明已经没有更多数据
    if (folders.length < pageSize) {
      break;
    }

    page++;
  }

  return allFolders;
}

/**
 * 获取所有收藏夹的视频
 * @param up_mid 用户ID
 * @param options API请求选项
 * @returns 所有收藏夹的视频列表
 */
export async function getAllFavoriteVideos(
  up_mid: string,
  options: ApiRequestOptions = {}
): Promise<FavoriteVideoInfo[]> {
  // 获取所有收藏夹
  const folders = await getFavoriteFolders(up_mid, options);
  const allVideos: FavoriteVideoInfo[] = [];

  // 遍历所有收藏夹，获取其中的视频
  for (const folder of folders) {
    let page = 1;
    const pageSize = 20;

    while (true) {
      const videos = await getFavoriteVideos(String(folder.id), page, pageSize, options);
      if (videos.length === 0) {
        break;
      }
      allVideos.push(...videos);

      // 如果获取的视频数小于页大小，说明已经没有更多视频
      if (videos.length < pageSize) {
        break;
      }
      page++;
    }
  }

  return allVideos;
}

/**
 * 获取收藏夹视频
 * @param media_id 收藏夹ID
 * @param pn 页码
 * @param ps 每页数量
 * @param options API请求选项
 */
export async function getFavoriteVideos(
  media_id: string,
  pn = 1,
  ps = 20,
  options: ApiRequestOptions = {}
): Promise<FavoriteVideoInfo[]> {
  const url = `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${media_id}&pn=${pn}&ps=${ps}`;
  // 根据 api请求返回数据例子.md，API返回的数据结构是：
  // { data: { info: {...}, medias: [...] } }
  let data;
  try {
    data = await apiRequest<{ info?: any; medias?: any[] }>(url, options);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    console.error("[getFavoriteVideos] API请求失败:", error);
    return [];
  }
  const medias = data?.medias;
  if (!Array.isArray(medias)) {
    return [];
  }

  // 将原始数据映射到 FavoriteVideoInfo 结构
  // 根据 api请求返回数据例子.md，API返回的数据结构如下：
  // - id: 视频ID
  // - title: 视频标题
  // - cover: 视频封面
  // - intro: 视频简介
  // - duration: 视频时长
  // - upper.mid: UP主ID
  // - upper.name: UP主名称
  // - upper.face: UP主头像
  // - pubtime: 发布时间
  // - bvid: BV号
  return medias.map((item) => ({
    id: item.id,
    title: item.title,
    cover: item.cover,
    intro: item.intro,
    duration: item.duration,
    upper: {
      mid: item.upper?.mid,
      name: item.upper?.name,
      face: item.upper?.face
    },
    pubtime: item.pubtime,
    bvid: item.bvid
  }));
}

/**
 * 获取订阅合集视频
 * @param season_id 合集ID
 * @param pn 页码
 * @param ps 每页数量
 * @param options API请求选项
 */
export async function getSeasonVideos(
  season_id: string,
  pn = 1,
  ps = 20,
  options: ApiRequestOptions = {}
): Promise<SubscribedFavoriteVideoInfo[]> {
  const url = `https://api.bilibili.com/x/space/fav/season/list?season_id=${season_id}&pn=${pn}&ps=${ps}&web_location=333.1387`;
  // 根据 api请求返回数据例子.md，API返回的数据结构是：
  // { data: { info: {...}, medias: [...] } }
  const data = await apiRequest<{ medias?: any[]; info?: any }>(url, options);

  // 订阅合集API返回的数据结构中，视频列表在 medias 字段中
  const videos = data?.medias ?? [];

  // 订阅合集API返回的数据中没有 intro 字段，需要添加默认值
  // 将原始数据映射到 SubscribedFavoriteVideoInfo 结构
  return videos.map((item) => ({
    id: item.id,
    title: item.title,
    cover: item.cover,
    duration: item.duration,
    pubtime: item.pubtime,
    bvid: item.bvid,
    upper: {
      mid: item.upper?.mid,
      name: item.upper?.name
    },
    cnt_info: {
      collect: item.cnt_info?.collect || 0,
      play: item.cnt_info?.play || 0,
      danmaku: item.cnt_info?.danmaku || 0
    }
  }));
}

/**
 * 获取订阅收藏夹视频
 * @param media_id 收藏夹ID
 * @param pn 页码
 * @param ps 每页数量
 * @param options API请求选项
 */
export async function getCollectedVideos(
  media_id: string,
  pn = 1,
  ps = 20,
  options: ApiRequestOptions = {}
): Promise<SubscribedFavoriteVideoInfo[]> {
  const url = `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${media_id}&pn=${pn}&ps=${ps}`;
  // 根据 api请求返回数据例子.md，API返回的数据结构是：
  // { data: { info: {...}, medias: [...] } }
  let data;
  try {
    data = await apiRequest<{ info?: any; medias?: any[] }>(url, options);
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    console.error("[getCollectedVideos] API请求失败:", error);
    return [];
  }
  const medias = data?.medias;
  if (!Array.isArray(medias)) {
    return [];
  }

  // 将原始数据映射到 SubscribedFavoriteVideoInfo 结构
  return medias.map((item) => ({
    id: item.id,
    title: item.title,
    cover: item.cover,
    duration: item.duration,
    pubtime: item.pubtime,
    bvid: item.bvid,
    upper: {
      mid: item.upper?.mid,
      name: item.upper?.name
    },
    cnt_info: {
      collect: item.cnt_info?.collect || 0,
      play: item.cnt_info?.play || 0,
      danmaku: item.cnt_info?.danmaku || 0
    }
  }));
}
