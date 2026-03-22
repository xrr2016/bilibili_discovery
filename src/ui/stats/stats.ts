import { CreatorRepository } from "../../database/implementations/creator-repository.impl.js";
import { TagRepository } from "../../database/implementations/tag-repository.impl.js";
import { CategoryRepository } from "../../database/implementations/category-repository.impl.js";
import { Platform } from "../../database/types/base.js";
import { bindPageActions } from "./page-actions.js";
import { addCategory, renderCategories } from "./category-manager.js";
import { clearFilters, renderFilterTags, setupDragAndDrop } from "./filter-manager.js";
import { countUpTags, createInitialState, getInputValue, setText, updateToggleLabel, creatorToCacheData } from "./helpers.js";
import { addCustomTag, renderTagList } from "./tag-manager.js";
import type { Category, StatsState, TagCacheData } from "./types.js";
import { refreshUpList } from "./up-list.js";

// 初始化 repository 实例
const creatorRepo = new CreatorRepository();
const tagRepo = new TagRepository();
const categoryRepo = new CategoryRepository();

async function rerenderPage(state: StatsState): Promise<void> {
  const refreshOnly = () => refreshUpList(state, () => rerenderPage(state));
  refreshOnly();
  await renderTagList(state);
  renderCategories(state, () => rerenderPage(state));
  renderFilterTags(state, refreshOnly);
}

function bindInputs(state: StatsState): void {
  const tagSearchInput = document.getElementById("tag-search") as HTMLInputElement | null;
  tagSearchInput?.addEventListener("input", () => void renderTagList(state));

  const upSearchInput = document.getElementById("up-search") as HTMLInputElement | null;
  upSearchInput?.addEventListener("input", () => refreshUpList(state, () => rerenderPage(state)));

  const showFollowedToggle = document.getElementById("show-followed-toggle") as HTMLInputElement | null;
  showFollowedToggle?.addEventListener("change", (e) => {
    state.showFollowedOnly = (e.target as HTMLInputElement).checked;
    refreshUpList(state, () => rerenderPage(state));
  });

  const addTagBtn = document.getElementById("btn-add-tag");
  addTagBtn?.addEventListener("click", async () => {
    await addCustomTag(state, getInputValue("tag-search"), async () => await renderTagList(state));
  });

  const categorySearchInput = document.getElementById("category-search") as HTMLInputElement | null;
  categorySearchInput?.addEventListener("input", () => renderCategories(state, () => rerenderPage(state)));

  const addCategoryBtn = document.getElementById("btn-add-category");
  addCategoryBtn?.addEventListener("click", () => {
    const value = getInputValue("category-search").trim();
    if (!value) {
      return;
    }
    addCategory(state, value, () => renderCategories(state, () => rerenderPage(state)));
    if (categorySearchInput) {
      categorySearchInput.value = "";
    }
  });

  const clearFilterBtn = document.getElementById("btn-clear-filter");
  clearFilterBtn?.addEventListener("click", () => {
    clearFilters(state, () => refreshUpList(state, () => rerenderPage(state)));
  });
}

async function loadState(state: StatsState): Promise<void> {
  console.log('[loadState] 开始加载状态');

  // 获取所有标签
  console.log('[loadState] 获取所有标签');
  const allTags = await tagRepo.getAllTags();
  console.log('[loadState] 获取到标签数量:', allTags.length);
  
  // 构建标签库和ID到名称的映射
  state.tagLibrary = {};
  state.tagIdToName = {};
  for (const tag of allTags) {
    const tagCacheData: TagCacheData = {
      tagId: tag.tagId,
      name: tag.name,
      source: tag.source,
      color: tag.color,
      icon: tag.icon
    };
    state.tagLibrary[tag.tagId] = tagCacheData;
    state.tagIdToName[tag.tagId] = tag.name;
  }

  // 初始化标签计数
  const tagUsageMap = await creatorRepo.getTagUsageCounts(state.platform);
  const allTagCountsObj: Record<string, number> = {};
  tagUsageMap.forEach((count, tagId) => {
    allTagCountsObj[tagId] = count;
  });
  state.allTagCounts = allTagCountsObj;

  // 更新标签总数
  state.stats.totalTags = allTags.length;

  // 获取所有分类
  const dbCategories = await categoryRepo.getAllCategories();
  
  // 构建分类列表和缓存
  state.categories = [];
  state.categoryCache = {};
  for (const dbCat of dbCategories) {
    const category: Category = {
      id: dbCat.id,
      name: dbCat.name,
      tags: dbCat.tagIds
    };
    state.categories.push(category);
    state.categoryCache[dbCat.id] = category;
  }

  // 不再加载所有UP主数据到内存，改为按需查询
  state.upCache = {};
  state.currentUpList = [];
  state.currentUpTags = {};

  // 从数据库获取统计数据
  console.log('[loadState] 获取统计数据');
  const followedCount = await creatorRepo.getFollowedCount(state.platform);
  const unfollowedCount = await creatorRepo.getUnfollowedCount(state.platform);
  console.log('[loadState] 统计数据:', { followedCount, unfollowedCount });

  // 更新统计数据
  state.stats.followedCount = followedCount;
  state.stats.unfollowedCount = unfollowedCount;
  state.stats.totalCreators = followedCount + unfollowedCount;

  // 更新UI显示
  setText("stat-up-count", String(state.stats.totalCreators));
  setText("stat-followed-count", String(state.stats.followedCount));
  setText("stat-unfollowed-count", String(state.stats.unfollowedCount));
  setText("stat-tag-count", String(state.stats.totalTags));
}

export async function initStats(): Promise<void> {
  console.log('[initStats] 开始初始化统计页面');

  if (typeof document === "undefined") {
    console.log('[initStats] document 不存在，跳过初始化');
    return;
  }

  console.log('[initStats] 创建初始状态');
  const state = createInitialState(Platform.BILIBILI);

  console.log('[initStats] 绑定页面动作');
  bindPageActions();

  console.log('[initStats] 开始加载状态');
  await loadState(state);

  console.log('[initStats] 状态加载完成', {
    followedCount: state.stats.followedCount,
    unfollowedCount: state.stats.unfollowedCount,
    totalCreators: state.stats.totalCreators,
    totalTags: state.stats.totalTags
  });

  console.log('[initStats] 设置拖拽和输入');
  setupDragAndDrop(state, () => refreshUpList(state, () => rerenderPage(state)));
  bindInputs(state);
  updateToggleLabel(state.showFollowedOnly);

  console.log('[initStats] 开始渲染页面');
  await rerenderPage(state);

  console.log('[initStats] 初始化完成');
}

// 页面加载完成后自动初始化
if (typeof document !== 'undefined') {
  console.log('[stats.ts] 页面加载完成，准备初始化');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[stats.ts] DOMContentLoaded 事件触发');
      void initStats();
    });
  } else {
    console.log('[stats.ts] DOM 已就绪，直接初始化');
    void initStats();
  }
}


