/**
 * CreatorDataAccess 实现
 * 提供创作者相关的数据访问聚合方法
 */

import { CreatorRepository } from './creator-repository.impl.js';
import { TagRepository } from './tag-repository.impl.js';
import { Creator, CreatorTagWeight } from '../types/creator.js';
import { Tag } from '../types/semantic.js';
import { Platform, TagSource } from '../types/base.js';

const creatorRepository = new CreatorRepository();
const tagRepository = new TagRepository();
const BILIBILI = Platform.BILIBILI;

/**
 * 聚合后的UP标签数据
 * 结合 Creator 和 Tag 信息
 */
export interface AggregatedCreatorTag {
  tagId: string;
  tagName: string;
  count: number;
  editable: boolean;
}

/**
 * 聚合后的UP数据
 * 结合 Creator 和 Tag 信息
 */
export interface AggregatedCreator {
  mid: number;
  name: string;
  face: string;
  sign: string;
  followTime: number;
  isFollowed: boolean;
  manualTags: string[];
  autoTags: AggregatedCreatorTag[];
}

/**
 * 获取所有UP的聚合数据
 */
export async function getAllAggregatedCreators(platform: Platform = BILIBILI): Promise<AggregatedCreator[]> {
  console.log('[CreatorDataAccess] Getting all aggregated creators');

  // 获取所有创作者
  const creators = await creatorRepository.getAllCreators(platform);
  console.log('[CreatorDataAccess] Creators count:', creators.length);

  if (creators.length === 0) {
    return [];
  }

  // 获取所有标签
  const allTagIds = new Set<string>();
  creators.forEach(creator => {
    creator.tagWeights.forEach(tw => allTagIds.add(tw.tagId));
  });

  const tags = await tagRepository.getTags(Array.from(allTagIds));
  const tagMap = new Map(tags.map(t => [t.tagId, t]));

  // 聚合数据
  return creators.map(creator => {
    const manualTags: string[] = [];
    const autoTags: AggregatedCreatorTag[] = [];

    creator.tagWeights.forEach(tw => {
      const tag = tagMap.get(tw.tagId);
      const tagName = tag?.name || tw.tagId;

      if (tw.source === TagSource.USER) {
        manualTags.push(tagName);
      } else {
        autoTags.push({
          tagId: tw.tagId,
          tagName,
          count: tw.count,
          editable: false
        });
      }
    });

    // 按计数排序自动标签
    autoTags.sort((a, b) => b.count - a.count);

    return {
      mid: Number(creator.creatorId),
      name: creator.name,
      face: creator.avatar,
      sign: creator.description,
      followTime: creator.followTime,
      isFollowed: creator.isFollowing === 1,
      manualTags,
      autoTags
    };
  });
}

/**
 * 获取指定UP的聚合数据
 */
export async function getAggregatedCreator(mid: number, platform: Platform = BILIBILI): Promise<AggregatedCreator | null> {
  console.log('[CreatorDataAccess] Getting aggregated creator:', mid);

  const creator = await creatorRepository.getCreator(String(mid), platform);
  if (!creator) {
    console.warn('[CreatorDataAccess] Creator not found:', mid);
    return null;
  }

  // 获取所有标签
  const allTagIds = creator.tagWeights.map(tw => tw.tagId);
  const tags = await tagRepository.getTags(allTagIds);
  const tagMap = new Map(tags.map(t => [t.tagId, t]));

  // 聚合数据
  const manualTags: string[] = [];
  const autoTags: AggregatedCreatorTag[] = [];

  creator.tagWeights.forEach(tw => {
    const tag = tagMap.get(tw.tagId);
    const tagName = tag?.name || tw.tagId;

    if (tw.source === TagSource.USER) {
      manualTags.push(tagName);
    } else {
      autoTags.push({
        tagId: tw.tagId,
        tagName,
        count: tw.count,
        editable: false
      });
    }
  });

  // 按计数排序自动标签
  autoTags.sort((a, b) => b.count - a.count);

  return {
    mid: Number(creator.creatorId),
    name: creator.name,
    face: creator.avatar,
    sign: creator.description,
    followTime: creator.followTime,
    isFollowed: creator.isFollowing === 1,
    manualTags,
    autoTags
  };
}

/**
 * 根据关注状态获取UP的聚合数据
 */
export async function getAggregatedCreatorsByFollowStatus(
  isFollowed: boolean,
  platform: Platform = BILIBILI
): Promise<AggregatedCreator[]> {
  console.log('[CreatorDataAccess] Getting aggregated creators by follow status:', isFollowed);

  const creators = await creatorRepository.getCreatorsByFollowStatus(platform, isFollowed);
  console.log('[CreatorDataAccess] Creators count:', creators.length);

  if (creators.length === 0) {
    return [];
  }

  // 获取所有标签
  const allTagIds = new Set<string>();
  creators.forEach(creator => {
    creator.tagWeights.forEach(tw => allTagIds.add(tw.tagId));
  });

  const tags = await tagRepository.getTags(Array.from(allTagIds));
  const tagMap = new Map(tags.map(t => [t.tagId, t]));

  // 聚合数据
  return creators.map(creator => {
    const manualTags: string[] = [];
    const autoTags: AggregatedCreatorTag[] = [];

    creator.tagWeights.forEach(tw => {
      const tag = tagMap.get(tw.tagId);
      const tagName = tag?.name || tw.tagId;

      if (tw.source === TagSource.USER) {
        manualTags.push(tagName);
      } else {
        autoTags.push({
          tagId: tw.tagId,
          tagName,
          count: tw.count,
          editable: false
        });
      }
    });

    // 按计数排序自动标签
    autoTags.sort((a, b) => b.count - a.count);

    return {
      mid: Number(creator.creatorId),
      name: creator.name,
      face: creator.avatar,
      sign: creator.description,
      followTime: creator.followTime,
      isFollowed: creator.isFollowing === 1,
      manualTags,
      autoTags
    };
  });
}

/**
 * 添加标签到UP的手动标签
 */
export async function addTagToCreatorManualTags(
  mid: number,
  tagName: string,
  platform: Platform = BILIBILI
): Promise<void> {
  console.log('[CreatorDataAccess] Adding tag to creator manual tags:', mid, tagName);

  const creator = await creatorRepository.getCreator(String(mid), platform);
  if (!creator) {
    console.warn('[CreatorDataAccess] Creator not found:', mid);
    return;
  }

  // 查找或创建标签
  let tag = await tagRepository.findTagByName(tagName);
  if (!tag) {
    const tagId = await tagRepository.createTag({
      name: tagName,
      source: TagSource.USER,
      createdAt: Date.now()
    });
    tag = { tagId, name: tagName, source: TagSource.USER, createdAt: Date.now() };
  }

  // 检查标签是否已存在
  const existing = creator.tagWeights.find(tw => tw.tagId === tag.tagId && tw.source === TagSource.USER);
  if (existing) {
    return; // 标签已存在
  }

  // 添加新标签权重
  const newTagWeight: CreatorTagWeight = {
    tagId: tag.tagId,
    source: TagSource.USER,
    count: 0,
    createdAt: Date.now()
  };

  await creatorRepository.upsertCreator({
    ...creator,
    tagWeights: [...creator.tagWeights, newTagWeight]
  });
}

/**
 * 从UP的手动标签中移除标签
 */
export async function removeTagFromCreatorManualTags(
  mid: number,
  tagName: string,
  platform: Platform = BILIBILI
): Promise<void> {
  console.log('[CreatorDataAccess] Removing tag from creator manual tags:', mid, tagName);

  const creator = await creatorRepository.getCreator(String(mid), platform);
  if (!creator) {
    console.warn('[CreatorDataAccess] Creator not found:', mid);
    return;
  }

  // 查找标签
  const tag = await tagRepository.findTagByName(tagName);
  if (!tag) {
    console.warn('[CreatorDataAccess] Tag not found:', tagName);
    return;
  }

  // 移除标签权重
  const newTagWeights = creator.tagWeights.filter(tw => 
    !(tw.tagId === tag.tagId && tw.source === TagSource.USER)
  );

  await creatorRepository.upsertCreator({
    ...creator,
    tagWeights: newTagWeights
  });
}

/**
 * 获取所有UP的手动标签
 */
export async function getAllCreatorManualTags(platform: Platform = BILIBILI): Promise<Record<string, string[]>> {
  console.log('[CreatorDataAccess] Getting all creator manual tags');

  const creators = await creatorRepository.getAllCreators(platform);
  const result: Record<string, string[]> = {};

  // 获取所有标签
  const allTagIds = new Set<string>();
  creators.forEach(creator => {
    creator.tagWeights
      .filter(tw => tw.source === TagSource.USER)
      .forEach(tw => allTagIds.add(tw.tagId));
  });

  const tags = await tagRepository.getTags(Array.from(allTagIds));
  const tagMap = new Map(tags.map(t => [t.tagId, t]));

  // 聚合手动标签
  creators.forEach(creator => {
    const manualTags = creator.tagWeights
      .filter(tw => tw.source === TagSource.USER)
      .map(tw => tagMap.get(tw.tagId)?.name || tw.tagId);

    if (manualTags.length > 0) {
      result[creator.creatorId] = manualTags;
    }
  });

  return result;
}

/**
 * 获取指定UP的手动标签
 */
export async function getCreatorManualTags(mid: number, platform: Platform = BILIBILI): Promise<string[]> {
  console.log('[CreatorDataAccess] Getting creator manual tags:', mid);

  const creator = await creatorRepository.getCreator(String(mid), platform);
  if (!creator) {
    return [];
  }

  // 获取所有标签
  const allTagIds = creator.tagWeights
    .filter(tw => tw.source === TagSource.USER)
    .map(tw => tw.tagId);

  if (allTagIds.length === 0) {
    return [];
  }

  const tags = await tagRepository.getTags(allTagIds);
  const tagMap = new Map(tags.map(t => [t.tagId, t]));

  return creator.tagWeights
    .filter(tw => tw.source === TagSource.USER)
    .map(tw => tagMap.get(tw.tagId)?.name || tw.tagId);
}

/**
 * 获取指定UP的自动标签
 */
export async function getCreatorAutoTags(
  mid: number,
  platform: Platform = BILIBILI,
  limit: number = 5
): Promise<AggregatedCreatorTag[]> {
  console.log('[CreatorDataAccess] Getting creator auto tags:', mid);

  const creator = await creatorRepository.getCreator(String(mid), platform);
  if (!creator) {
    return [];
  }

  // 获取所有标签
  const allTagIds = creator.tagWeights
    .filter(tw => tw.source !== TagSource.USER)
    .map(tw => tw.tagId);

  if (allTagIds.length === 0) {
    return [];
  }

  const tags = await tagRepository.getTags(allTagIds);
  const tagMap = new Map(tags.map(t => [t.tagId, t]));

  const autoTags = creator.tagWeights
    .filter(tw => tw.source !== TagSource.USER)
    .map(tw => ({
      tagId: tw.tagId,
      tagName: tagMap.get(tw.tagId)?.name || tw.tagId,
      count: tw.count,
      editable: false
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return autoTags;
}
