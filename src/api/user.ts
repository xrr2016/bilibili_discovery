/**
 * 用户和关注相关 API
 */

import type {
  FollowingUp,
  UpDetailInfo,
  VideoInfo,
  UserStatInfo
} from "./types.js";
import { apiRequest, type ApiRequestOptions } from "./request.js";

/**
 * 获取用户关注的UP主列表（指定页）
 * @param uid 用户ID
 * @param page 页码，从1开始
 * @param pageSize 每页数量，默认50
 * @param options API请求选项
 * @returns 包含当前页UP列表和是否有下一页的对象
 */
export async function getFollowedUPs(
  uid: number,
  page: number = 1,
  pageSize: number = 50,
  options: ApiRequestOptions = {}
): Promise<{ upList: FollowingUp[]; hasMore: boolean }> {
  const url = `https://api.bilibili.com/x/relation/followings?vmid=${uid}&pn=${page}&ps=${pageSize}&order=desc`;
  const data = await apiRequest<{ list: FollowingUp[] }>(url, options);
  const list = data?.list;
  
  if (!Array.isArray(list) || list.length === 0) {
    return { upList: [], hasMore: false };
  }

  // Map API response to FollowingUp interface
  const upList: FollowingUp[] = list.map((item) => ({
    mid: item.mid,
    uname: item.uname,
    face: item.face
  }));

  // 如果返回的数据少于pageSize，说明没有更多数据了
  const hasMore = list.length >= pageSize;
  
  console.log(`[API] Fetched page ${page}, got ${upList.length} UPs, hasMore: ${hasMore}`);

  return { upList, hasMore };
}

/**
 * Fetch videos of a specific UP.
 */
export async function getUPVideos(
  mid: number,
  options: ApiRequestOptions = {}
): Promise<VideoInfo[]> {
  const url = `https://api.bilibili.com/x/space/arc/search?mid=${mid}&pn=1&ps=30&order=pubdate`;
  const data = await apiRequest<{ data?: { list?: { vlist?: any[] } } }>(
    url,
    options
  );
  const list = data?.data?.list?.vlist;
  if (!Array.isArray(list)) {
    return [];
  }

  // 将原始数据映射到 VideoInfo 结构
  return list.map((item) => ({
    bvid: item.bvid,
    title: item.title,
    pic: item.pic,
    pubdate: item.created || item.pubdate,
    duration: item.length || item.duration,
    owner: {
      mid: item.mid || mid,
      name: item.author || item.owner?.name || '',
      face: item.face || item.owner?.face || ''
    }
  }));
}

/**
 * 获取UP主详细信息
 * @param mid UP主ID
 * @param options API请求选项
 */
export async function getUPInfo(
  mid: number,
  options: ApiRequestOptions = {}
): Promise<UpDetailInfo | null> {
  const url = `https://api.bilibili.com/x/space/acc/info?mid=${mid}`;
  const data = await apiRequest<UpDetailInfo>(url, options);
  return data ?? null;
}

/**
 * 获取粉丝数量
 * @param vmid 用户ID
 * @param webLocation 位置标识，默认为 333.1387
 * @param options API请求选项
 */
export async function getFollowStat(
  vmid: number,
  webLocation: string = '333.1387',
  options: ApiRequestOptions = {}
): Promise<UserStatInfo | null> {
  const url = `https://api.bilibili.com/x/relation/stat?vmid=${vmid}&web_location=${webLocation}`;
  const data = await apiRequest<UserStatInfo>(url, options);
  return data ?? null;
}

/**
 * 获取UP主的视频系列列表
 * @param mid UP主ID
 * @param pageNum 页码，从1开始
 * @param pageSize 每页数量，默认10
 * @param options API请求选项
 */
export async function getUPSeasonSeries(
  mid: number,
  pageNum: number = 1,
  pageSize: number = 10,
  options: ApiRequestOptions = {}
): Promise<VideoInfo[]> {
  const url = `https://api.bilibili.com/x/polymer/web-space/home/seasons_series?mid=${mid}&page_size=${pageSize}&page_num=${pageNum}&web_location=333.1387`;
  const data = await apiRequest<{ items_lists?: { seasons_list?: any[]; series_list?: any[] } }>(url, options);
  
  const seasons = data?.items_lists?.seasons_list || [];
  const series = data?.items_lists?.series_list || [];
  
  // 提取所有视频信息
  const allVideos: VideoInfo[] = [];
  
  const processSeasonSeries = (items: any[]) => {
    items.forEach(item => {
      const videos = item.archives || [];
      videos.forEach((v: any) => {
        allVideos.push({
          bvid: v.bvid,
          title: v.title,
          pic: v.pic,
          pubdate: v.pubdate,
          duration: v.duration,
          owner: {
            mid: mid,
            name: '',
            face: ''
          }
        });
      });
    });
  };

  processSeasonSeries(seasons);
  processSeasonSeries(series);

  // 限制返回的视频数量为10个
  const limitedVideos = allVideos.slice(0, 10);

  console.log(`[API] Fetched UP ${mid} season/series videos, got ${allVideos.length} videos, returning ${limitedVideos.length}`);

  return limitedVideos;
}
