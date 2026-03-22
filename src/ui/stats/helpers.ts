import type { Category, FilterState, StatsState, UPCacheData } from "./types.js";

export function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

export function countUpTags(upTags: Record<string, string[]>): number {
  return Object.values(upTags).reduce((total, tags) => total + (tags?.length ?? 0), 0);
}

export function colorFromTag(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash * 31 + tag.charCodeAt(i)) % 360;
  }
  const hue = Math.abs(hash) % 360;
  const sat = 70 + (Math.abs(hash * 7) % 21);
  const light = 85 + (Math.abs(hash * 13) % 11);
  return `hsl(${hue} ${sat}% ${light}%)`;
}

export function normalizeTag(tag: string): string {
  return tag.trim();
}

export function getInputValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";
}

export function updateToggleLabel(showFollowedOnly: boolean): void {
  const toggleLabel = document.querySelector(".toggle-label");
  if (toggleLabel) {
    toggleLabel.textContent = showFollowedOnly ? "已关注" : "未关注";
  }
}

export function createInitialState(platform: string = "bilibili"): StatsState {
  return {
    platform: platform as any,
    allTagCounts: {},
    filteredTags: [],
    currentCustomTags: [],
    categories: [],
    filteredCategories: [],
    showFollowedOnly: true,
    filters: {
      includeTags: [],
      excludeTags: [],
      includeCategories: [],
      excludeCategories: []
    },
    currentUpList: [],
    currentUpTags: {},
    tagLibrary: {},
    upCache: {},
    categoryCache: {},
    tagIdToName: {},
    stats: {
      totalCreators: 0,
      followedCount: 0,
      unfollowedCount: 0,
      totalTags: 0
    }
  };
}

export function removeFromList(values: string[], target: string): string[] {
  return values.filter((value) => value !== target);
}

export function findCategory(categories: Category[], categoryId: string): Category | undefined {
  return categories.find((category) => category.id === categoryId);
}

export function resetFilters(filters: FilterState): void {
  filters.includeTags = [];
  filters.excludeTags = [];
  filters.includeCategories = [];
  filters.excludeCategories = [];
}

export function creatorToCacheData(creator: any): UPCacheData {
  return {
    creatorId: creator.creatorId,
    name: creator.name,
    avatar: creator.avatar || '', // avatar字段用于存储真正的头像图片数据（如base64）
    avatarUrl: creator.avatarUrl || '', // avatarUrl字段用于存储头像URL
    description: creator.description,
    followTime: creator.followTime,
    isFollowing: creator.isFollowing === 1,
    tags: []
  };
}
