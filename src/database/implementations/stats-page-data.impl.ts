import { getAppState, setAppState } from "../app-state.js";
import { Platform, TagSource } from "../types/base.js";
import type { Creator as DBCreator, CreatorTagWeight } from "../types/creator.js";
import type { Tag as DBTag } from "../types/semantic.js";
import { CategoryRepository } from "./category-repository.impl.js";
import { CreatorRepository } from "./creator-repository.impl.js";
import { TagRepository } from "./tag-repository.impl.js";

const creatorRepository = new CreatorRepository();
const tagRepository = new TagRepository();
const categoryRepository = new CategoryRepository();
const BILIBILI = Platform.BILIBILI;

export interface StatsPageUP {
  mid: number;
  name: string;
  face: string;
  sign: string;
  follow_time: number;
  is_followed: boolean;
}

export interface StatsPageTag {
  id: string;
  name: string;
  created_at: number;
  editable: boolean;
  count: number;
}

export type StatsPageTagLibrary = Record<string, StatsPageTag>;

export interface StatsPageUPTagCount {
  tag: string;
  count: number;
  editable?: boolean;
}

export type StatsPageUPTagCache = Record<string, { tags: StatsPageUPTagCount[]; lastUpdate: number }>;

export interface StatsPageCategory {
  id: string;
  name: string;
  tags: string[];
}

function tagCountKey(): string {
  return "tagCounts";
}

function manualTagsKey(mid: number): string {
  return `up_manual_tags:${mid}`;
}

function toStatsPageUP(creator: DBCreator): StatsPageUP {
  return {
    mid: Number(creator.creatorId),
    name: creator.name,
    face: creator.avatar,
    sign: creator.description,
    follow_time: creator.followTime,
    is_followed: creator.isFollowing === 1
  };
}

function toStatsPageTag(tag: DBTag, counts: Record<string, number>): StatsPageTag {
  return {
    id: tag.tagId,
    name: tag.name,
    created_at: tag.createdAt,
    editable: tag.source === TagSource.USER,
    count: counts[tag.tagId] ?? (tag.source === TagSource.SYSTEM ? 1 : 0)
  };
}

async function getTagCounts(): Promise<Record<string, number>> {
  return (await getAppState<Record<string, number>>(tagCountKey())) ?? {};
}

async function saveTagCounts(counts: Record<string, number>): Promise<void> {
  await setAppState(tagCountKey(), counts);
}

async function getAllBilibiliCreators(): Promise<DBCreator[]> {
  return creatorRepository.getAllCreators(BILIBILI);
}

async function getTagMapByIds(tagIds: string[]): Promise<Map<string, DBTag>> {
  if (tagIds.length === 0) {
    return new Map();
  }
  const tags = await tagRepository.getTags([...new Set(tagIds)]);
  return new Map(tags.map((tag) => [tag.tagId, tag]));
}

async function ensureCreator(mid: number): Promise<DBCreator> {
  const existing = await creatorRepository.getCreator(String(mid), BILIBILI);
  if (existing) {
    return existing;
  }

  const creator: DBCreator = {
    creatorId: String(mid),
    platform: BILIBILI,
    name: "",
    avatar: "",
    isLogout: 0,
    description: "",
    createdAt: Date.now(),
    followTime: 0,
    isFollowing: 0,
    tagWeights: []
  };
  await creatorRepository.upsertCreator(creator);
  return creator;
}

async function getManualTagIds(mid: number): Promise<string[]> {
  return (await getAppState<string[]>(manualTagsKey(mid))) ?? [];
}

async function setManualTagIds(mid: number, tagIds: string[]): Promise<void> {
  await setAppState(manualTagsKey(mid), tagIds);
  const creator = await ensureCreator(mid);
  const manualWeights: CreatorTagWeight[] = tagIds.map((tagId) => ({
    tagId,
    source: TagSource.USER,
    count: 0,
    createdAt: Date.now()
  }));
  const systemWeights = creator.tagWeights.filter((tagWeight) => tagWeight.source !== TagSource.USER);
  await creatorRepository.upsertCreator({
    ...creator,
    tagWeights: [...systemWeights, ...manualWeights]
  });
}

async function getOrCreateTag(name: string, editable: boolean = true): Promise<DBTag> {
  const normalized = name.trim();
  const counts = await getTagCounts();
  const existing = await tagRepository.findTagByName(normalized);

  if (existing) {
    if (!editable && existing.source === TagSource.SYSTEM) {
      counts[existing.tagId] = (counts[existing.tagId] ?? 0) + 1;
      await saveTagCounts(counts);
    }
    return existing;
  }

  const createdAt = Date.now();
  const tagId = await tagRepository.createTag({
    name: normalized,
    source: editable ? TagSource.USER : TagSource.SYSTEM,
    createdAt
  });
  counts[tagId] = editable ? 0 : 1;
  await saveTagCounts(counts);
  return {
    tagId,
    name: normalized,
    source: editable ? TagSource.USER : TagSource.SYSTEM,
    createdAt
  };
}

export async function getStatsPageUPList(): Promise<{ upList: StatsPageUP[]; lastUpdate: number } | null> {
  const creators = await getAllBilibiliCreators();
  if (creators.length === 0) {
    return null;
  }

  const upList = creators.map(toStatsPageUP);
  return {
    upList,
    lastUpdate: Math.max(...upList.map((up) => up.follow_time || 0), 0)
  };
}

export async function getStatsPageTagLibrary(): Promise<StatsPageTagLibrary> {
  const [tags, counts] = await Promise.all([tagRepository.getAllTags(), getTagCounts()]);
  return Object.fromEntries(tags.map((tag) => [tag.tagId, toStatsPageTag(tag, counts)]));
}

export async function getStatsPageUPTagCounts(): Promise<StatsPageUPTagCache> {
  const creators = await getAllBilibiliCreators();
  return Object.fromEntries(
    creators.map((creator) => [
      creator.creatorId,
      {
        tags: creator.tagWeights.map((tagWeight) => ({
          tag: tagWeight.tagId,
          count: tagWeight.count,
          editable: tagWeight.source === TagSource.USER
        })),
        lastUpdate: Date.now()
      }
    ])
  );
}

export async function getStatsPageAllManualTags(): Promise<Record<string, string[]>> {
  const creators = await getAllBilibiliCreators();
  const entries = await Promise.all(
    creators.map(async (creator) => [creator.creatorId, await getManualTagIds(Number(creator.creatorId))] as const)
  );
  return Object.fromEntries(entries.filter(([, tagIds]) => tagIds.length > 0));
}

export async function addStatsPageManualTag(mid: number, tagName: string): Promise<StatsPageTag> {
  const tag = await getOrCreateTag(tagName, true);
  const existing = await getManualTagIds(mid);
  if (!existing.includes(tag.tagId)) {
    await setManualTagIds(mid, [...existing, tag.tagId]);
  }
  const counts = await getTagCounts();
  return toStatsPageTag(tag, counts);
}

export async function removeStatsPageManualTag(mid: number, tagName: string): Promise<void> {
  const tag = await tagRepository.findTagByName(tagName);
  if (!tag) {
    return;
  }

  const existing = await getManualTagIds(mid);
  if (!existing.includes(tag.tagId)) {
    return;
  }

  await setManualTagIds(
    mid,
    existing.filter((tagId) => tagId !== tag.tagId)
  );
}

export async function getStatsPageCustomTags(): Promise<string[]> {
  return (await getAppState<string[]>("customTags")) ?? [];
}

export async function setStatsPageCustomTags(tags: string[]): Promise<void> {
  await setAppState("customTags", tags);
}

export async function getStatsPageVideoCounts(): Promise<Record<string, number>> {
  return (await getAppState<Record<string, number>>("videoCounts")) ?? {};
}

export async function getStatsPageCategories(): Promise<StatsPageCategory[]> {
  const categories = await categoryRepository.getAllCategories();
  const tagMap = await getTagMapByIds(categories.flatMap((category) => category.tagIds));
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    tags: category.tagIds.map((tagId) => tagMap.get(tagId)?.name ?? tagId)
  }));
}

export async function createStatsPageCategory(name: string): Promise<StatsPageCategory> {
  const createdAt = Date.now();
  const id = await categoryRepository.createCategory({
    name,
    tagIds: [],
    createdAt
  });
  return { id, name, tags: [] };
}

export async function deleteStatsPageCategory(categoryId: string): Promise<void> {
  await categoryRepository.deleteCategory(categoryId);
}

export async function addTagNameToStatsPageCategory(categoryId: string, tagName: string): Promise<void> {
  const tag = await getOrCreateTag(tagName, true);
  const category = await categoryRepository.getCategory(categoryId);
  if (!category || category.tagIds.includes(tag.tagId)) {
    return;
  }
  await categoryRepository.addTagsToCategory(categoryId, [tag.tagId]);
}

export async function removeTagNameFromStatsPageCategory(categoryId: string, tagName: string): Promise<void> {
  const tag = await tagRepository.findTagByName(tagName);
  if (!tag) {
    return;
  }
  await categoryRepository.removeTagsFromCategory(categoryId, [tag.tagId]);
}
