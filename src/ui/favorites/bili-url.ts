export const BiliURL = {
  video: (id: string) => `https://www.bilibili.com/video/${id}`,
  user: (id: string) => `https://space.bilibili.com/${id}`,
  search: (keyword: string) =>
    `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`
};