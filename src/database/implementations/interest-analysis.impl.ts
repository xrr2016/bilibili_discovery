/**
 * 兴趣分析实现层
 * 核心业务逻辑：初始化、映射、事件生成、聚合
 */

import {
  InterestTopicRepositoryImpl,
  TagInterestMappingRepositoryImpl,
  InterestContributionRepositoryImpl,
  InterestSnapshotRepositoryImpl,
  TagRepositoryImpl,
  VideoRepositoryImpl,
  FavoriteVideoRepository,
  WatchEventRepositoryImpl
} from '../../database/index.js';

import {
  InterestTopic,
  TagInterestMapping,
  InterestContributionEvent,
  InterestSnapshot
} from '../../database/types/interest.js';

import { ID, Platform, Timestamp } from '../../database/types/base.js';
import { Video } from '../../database/types/video.js';
import { WatchEvent } from '../../database/types/behavior.js';
import { FavoriteVideoEntry } from '../../database/types/favorite-video.js';

import {
  FIXED_TOPICS,
  FixedTopicId,
  TagMappingResult,
  InterestSummary,
  InterestTrend,
  getAllValidTopicIds
} from '../../engine/interest/interest-types.js';

import { InterestRuleMapper } from '../../engine/interest/interest-mapping.js';
import { InterestLLMMapper, getLLMMapper } from '../../engine/interest/interest-llm.js';
import { InterestScorer, calculateTrend, calculateScoreChange } from '../../engine/interest/interest-scoring.js';

/**
 * 兴趣分析实现类
 * 管理兴趣分析的所有操作
 */
export class InterestAnalysisImpl {
  private topicRepo: InterestTopicRepositoryImpl;
  private mappingRepo: TagInterestMappingRepositoryImpl;
  private contributionRepo: InterestContributionRepositoryImpl;
  private snapshotRepo: InterestSnapshotRepositoryImpl;
  private tagRepo: TagRepositoryImpl;
  private videoRepo: VideoRepositoryImpl;
  private favoriteRepo: FavoriteVideoRepository;
  private watchRepo: WatchEventRepositoryImpl;
  private scorer: InterestScorer;
  private llmMapper: InterestLLMMapper;
  private initialized = false;

  constructor() {
    this.topicRepo = new InterestTopicRepositoryImpl();
    this.mappingRepo = new TagInterestMappingRepositoryImpl();
    this.contributionRepo = new InterestContributionRepositoryImpl();
    this.snapshotRepo = new InterestSnapshotRepositoryImpl();
    this.tagRepo = new TagRepositoryImpl();
    this.videoRepo = new VideoRepositoryImpl();
    this.favoriteRepo = new FavoriteVideoRepository();
    this.watchRepo = new WatchEventRepositoryImpl();
    this.scorer = new InterestScorer();
    this.llmMapper = getLLMMapper();
  }

  /**
   * 初始化兴趣分析系统
   * 创建默认的兴趣主题
   */
  async ensureDefaultTopics(): Promise<void> {
    if (this.initialized) return;

    try {
      // 检查是否已存在任何主题
      const existingTopics = await this.topicRepo.getAllTopics();
      
      if (existingTopics.length === 0) {
        // 创建所有固定主题
        const topicsToCreate = Object.values(FIXED_TOPICS).map(topicDef => {
          const def = topicDef as any;
          return {
            topicId: def.topicId as ID,
            name: def.name,
            description: def.description,
            isActive: 1,
            createdAt: Date.now() as Timestamp,
            updatedAt: Date.now() as Timestamp
          };
        });

        await this.topicRepo.upsertTopics(topicsToCreate);
        console.log('[InterestAnalysis] Default topics initialized');
      }

      this.initialized = true;
    } catch (error) {
      console.error('[InterestAnalysis] Failed to initialize topics:', error);
      throw error;
    }
  }

  /**
   * 获取或生成标签映射
   * 优先使用规则映射，失败时尝试 LLM 映射
   */
  async resolveTagMeaning(
    tagId: ID,
    tagName: string,
    useLLM: boolean = false
  ): Promise<TagMappingResult[] | null> {
    // 首先查询已存在的映射
    const existingMappings = await this.mappingRepo.getMappingsByTagId(tagId);
    if (existingMappings.length > 0) {
      return existingMappings
        .sort((a, b) => b.score - a.score)
        .map(m => ({
          topicId: m.topicId as any as FixedTopicId,
          score: m.score,
          confidence: m.confidence,
          source: m.source as any
        }));
    }

    // 尝试规则映射
    const ruleMappings = InterestRuleMapper.mapTag(tagName);
    if (ruleMappings.length > 0) {
      // 保存规则映射结果
      for (const mapping of ruleMappings) {
        await this.mappingRepo.upsertMapping({
          tagId,
          topicId: mapping.topicId as any as ID,
          score: mapping.score,
          source: 'rule',
          confidence: mapping.confidence
        });
      }
      return ruleMappings;
    }

    // 如果启用了 LLM 且规则映射失败，尝试 LLM 映射
    if (useLLM && this.llmMapper.isAvailable()) {
      try {
        const llmResult = await this.llmMapper.mapTag(tagName);
        if (llmResult.success && llmResult.mappings) {
          // 保存 LLM 映射结果
          for (const mapping of llmResult.mappings) {
            await this.mappingRepo.upsertMapping({
              tagId,
              topicId: mapping.topicId as any as ID,
              score: mapping.score,
              source: 'llm',
              confidence: mapping.confidence
            });
          }
          return llmResult.mappings;
        }
      } catch (error) {
        console.warn('[InterestAnalysis] LLM mapping failed, fallback to other method:', error);
      }
    }

    // 都失败了，返回 null
    return null;
  }

  /**
   * 将观看事件转换为兴趣贡献事件
   */
  async buildContributionEventsFromWatch(
    watchEvent: WatchEvent,
    video: Video | null,
    useLLM: boolean = false
  ): Promise<Omit<InterestContributionEvent, 'contributionEventId' | 'createdAt'>[]> {
    const result: Omit<InterestContributionEvent, 'contributionEventId' | 'createdAt'>[] = [];
    const now = Date.now() as Timestamp;
    const dateKey = new Date(now).toISOString().split('T')[0];

    // 获取视频的标签
    const videoTags = video?.tags || [];
    if (videoTags.length === 0) {
      // 无标签，无法生成贡献事件
      return result;
    }

    // 计算基础分数（基于观看时长）
    const watchDuration = watchEvent.watchDuration || 0;
    const baseScore = InterestScorer.calculateBaseScoreFromDuration(watchDuration);
    const recencyDays = Math.floor((now - watchEvent.watchTime) / (1000 * 60 * 60 * 24));

    // 为每个标签获取映射关系
    const tagMappings = new Map<ID, TagMappingResult[]>();
    for (const tagId of videoTags) {
      const tag = await this.tagRepo.getTag(tagId);
      if (tag) {
        const mappings = await this.resolveTagMeaning(tagId, tag.name, useLLM);
        if (mappings && mappings.length > 0) {
          tagMappings.set(tagId, mappings);
        }
      }
    }

    if (tagMappings.size === 0) {
      // 所有标签都无法映射
      return result;
    }

    // 为每个映射到的兴趣主题生成贡献事件
    const processedTopics = new Set<FixedTopicId>();
    for (const [tagId, mappings] of tagMappings.entries()) {
      for (const mapping of mappings) {
        if (processedTopics.has(mapping.topicId)) {
          continue; // 同一个主题只生成一个事件
        }
        processedTopics.add(mapping.topicId);

        // 计算该主题的观看时长（按映射分数分摊）
        const allocatedDuration = watchDuration * mapping.score;

        // 计算贡献分数
        const contributionScore = this.scorer.calculateScore({
          baseScore: InterestScorer.calculateBaseScoreFromDuration(allocatedDuration),
          isComplete: (watchEvent.progress || 0) >= 0.9,
          progress: watchEvent.progress || 0,
          sourceType: 'watch',
          recencyDays
        });

        // 生成贡献事件
        result.push({
          platform: watchEvent.platform,
          topicId: mapping.topicId as any as ID,
          sourceType: 'watch',
          eventTime: watchEvent.watchTime,
          dateKey,
          watchDuration: allocatedDuration,
          contributionScore,
          progress: watchEvent.progress,
          isComplete: (watchEvent.progress || 0) >= 0.9 ? 1 : 0,
          tagIds: Array.from(videoTags),
          tagNames: [],
          videoId: watchEvent.videoId,
          creatorId: watchEvent.creatorId
        });
      }
    }

    return result;
  }

  /**
   * 将收藏事件转换为兴趣贡献事件
   */
  async buildContributionEventsFromFavorite(
    favoriteEntry: FavoriteVideoEntry,
    video: Video | null,
    useLLM: boolean = false
  ): Promise<Omit<InterestContributionEvent, 'contributionEventId' | 'createdAt'>[]> {
    const result: Omit<InterestContributionEvent, 'contributionEventId' | 'createdAt'>[] = [];
    const now = Date.now() as Timestamp;
    const dateKey = new Date(now).toISOString().split('T')[0];

    // 获取视频的标签
    const videoTags = video?.tags || [];
    if (videoTags.length === 0) {
      // 无标签，无法生成贡献事件
      return result;
    }

    // 收藏基础分数（固定值，表示用户明确喜欢）
    const baseScore = 1.0;
    const recencyDays = Math.floor((now - favoriteEntry.addedAt) / (1000 * 60 * 60 * 24));

    // 为每个标签获取映射关系
    const tagMappings = new Map<ID, TagMappingResult[]>();
    for (const tagId of videoTags) {
      const tag = await this.tagRepo.getTag(tagId);
      if (tag) {
        const mappings = await this.resolveTagMeaning(tagId, tag.name, useLLM);
        if (mappings && mappings.length > 0) {
          tagMappings.set(tagId, mappings);
        }
      }
    }

    if (tagMappings.size === 0) {
      // 所有标签都无法映射
      return result;
    }

    // 为每个映射到的兴趣主题生成贡献事件
    const processedTopics = new Set<FixedTopicId>();
    for (const [tagId, mappings] of tagMappings.entries()) {
      for (const mapping of mappings) {
        if (processedTopics.has(mapping.topicId)) {
          continue;
        }
        processedTopics.add(mapping.topicId);

        // 计算贡献分数（收藏文章权重更高）
        const contributionScore = this.scorer.calculateScore({
          baseScore: baseScore * mapping.score,
          isComplete: true,
          progress: 1.0,
          sourceType: 'favorite',
          recencyDays
        });

        // 生成贡献事件
        result.push({
          platform: favoriteEntry.platform,
          topicId: mapping.topicId as any as ID,
          sourceType: 'favorite',
          eventTime: favoriteEntry.addedAt,
          dateKey,
          watchDuration: 0,
          contributionScore,
          progress: 1.0,
          isComplete: 1,
          tagIds: Array.from(videoTags),
          tagNames: [],
          videoId: favoriteEntry.videoId,
          creatorId: favoriteEntry.creatorId
        });
      }
    }

    return result;
  }

  /**
   * 记录观看贡献事件
   */
  async recordWatchContribution(
    watchEvent: WatchEvent,
    useLLM: boolean = false
  ): Promise<ID[]> {
    // 获取关联的视频
    const video = await this.videoRepo.getVideo(watchEvent.videoId);

    // 生成贡献事件
    const events = await this.buildContributionEventsFromWatch(watchEvent, video, useLLM);

    // 写入数据库
    if (events.length > 0) {
      return await this.contributionRepo.addContributionEventsBatch(events);
    }

    return [];
  }

  /**
   * 记录收藏贡献事件
   */
  async recordFavoriteContribution(
    videoId: ID,
    useLLM: boolean = false
  ): Promise<ID[]> {
    // 获取收藏条目
    const favoriteEntry = await this.favoriteRepo.getById(videoId);
    if (!favoriteEntry) {
      console.warn('[InterestAnalysis] 收藏条目不存在:', videoId);
      return [];
    }

    // 获取关联的视频
    const video = await this.videoRepo.getVideo(favoriteEntry.videoId);

    // 生成贡献事件
    const events = await this.buildContributionEventsFromFavorite(favoriteEntry, video, useLLM);

    // 写入数据库
    if (events.length > 0) {
      return await this.contributionRepo.addContributionEventsBatch(events);
    }

    return [];
  }

  /**
   * 重建快照（针对指定时间窗口）
   */
  async rebuildSnapshotsForWindow(
    dateKey: string,
    window: '7d' | '30d',
    platform: Platform
  ): Promise<void> {
    // 计算窗口的起始日期
    const endDate = new Date(dateKey);
    const startDate = new Date(endDate);
    if (window === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    const startDateKey = startDate.toISOString().split('T')[0];

    // 获取该窗口内的所有贡献事件
    const events = await this.contributionRepo.getEventsByDateRange(startDateKey, dateKey);
    const filteredEvents = events.filter(e => e.platform === platform);

    // 按主题聚合
    const topicScores = new Map<ID, {
      watchDuration: number;
      eventCount: number;
      finalScore: number;
      sourceBreakdown: Record<string, number>;
    }>();

    for (const event of filteredEvents) {
      if (!topicScores.has(event.topicId)) {
        topicScores.set(event.topicId, {
          watchDuration: 0,
          eventCount: 0,
          finalScore: 0,
          sourceBreakdown: { watch: 0, favorite: 0, like: 0, coin: 0 }
        });
      }

      const ts = topicScores.get(event.topicId)!;
      ts.watchDuration += event.watchDuration || 0;
      ts.eventCount += 1;
      ts.finalScore += event.contributionScore || 0;
      ts.sourceBreakdown[event.sourceType] = (ts.sourceBreakdown[event.sourceType] || 0) + 1;
    }

    // 计算占比并生成快照
    const totalScore = Array.from(topicScores.values()).reduce((sum, ts) => sum + ts.finalScore, 0);

    const snapshotsToCreate: Omit<InterestSnapshot, 'snapshotId'>[] = [];
    for (const [topicId, scores] of topicScores.entries()) {
      snapshotsToCreate.push({
        platform,
        dateKey,
        window,
        topicId,
        watchDurationScore: InterestScorer.calculateBaseScoreFromDuration(scores.watchDuration),
        eventCountScore: scores.eventCount,
        favoriteScore: scores.sourceBreakdown.favorite || 0,
        finalScore: scores.finalScore,
        ratio: totalScore > 0 ? scores.finalScore / totalScore : 0,
        sourceEventCount: scores.eventCount,
        updatedAt: Date.now() as Timestamp
      });
    }

    // 删除旧快照并创建新快照
    const existingSnapshots = await this.snapshotRepo.getSnapshotsByDateKeyPlatformAndWindow(
      dateKey,
      platform,
      window
    );
    if (existingSnapshots.length > 0) {
      await this.snapshotRepo.deleteSnapshots(existingSnapshots.map(s => s.snapshotId));
    }

    if (snapshotsToCreate.length > 0) {
      await this.snapshotRepo.upsertSnapshotsBatch(snapshotsToCreate);
    }
  }

  /**
   * 获取兴趣汇总
   */
  async getInterestSummary(
    dateKey: string,
    window: '7d' | '30d',
    platform: Platform,
    topN: number = 10
  ): Promise<InterestSummary | null> {
    // 获取快照
    const snapshots = await this.snapshotRepo.getSnapshotsByDateKeyPlatformAndWindow(
      dateKey,
      platform,
      window
    );

    if (snapshots.length === 0) {
      return null;
    }

    // 按 finalScore 排序
    snapshots.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

    // 取前 N 个
    const topSnapshots = snapshots.slice(0, topN);

    // 构建结果
    const topicScores = topSnapshots.map(s => {
      const topicId = s.topicId as any as FixedTopicId;
      const topic = FIXED_TOPICS[topicId];
      return {
        topicId,
        topicName: topic?.name || 'Unknown',
        finalScore: s.finalScore || 0,
        ratio: s.ratio || 0,
        watchDuration: s.watchDurationScore || 0,
        eventCount: s.sourceEventCount || 0,
        sourceBreakdown: {
          watch: 0,
          favorite: 0,
          like: 0,
          coin: 0
        }
      };
    });

    const totalScore = topicScores.reduce((sum, ts) => sum + ts.finalScore, 0);

    return {
      dateKey,
      window,
      topicScores,
      totalScore,
      topN
    };
  }

  /**
   * 获取兴趣趋势
   */
  async getInterestTrend(
    dateKey: string,
    window: '7d' | '30d',
    platform: Platform
  ): Promise<InterestTrend[]> {
    // 获取当前周期的兴趣汇总
    const currentSummary = await this.getInterestSummary(dateKey, window, platform, 999);
    if (!currentSummary) {
      return [];
    }

    // 获取上一个周期的兴趣汇总
    const daysOffset = window === '7d' ? 7 : 30;
    const prevDate = new Date(dateKey);
    prevDate.setDate(prevDate.getDate() - daysOffset);
    const previousDateKey = prevDate.toISOString().split('T')[0];
    const previousSummary = await this.getInterestSummary(previousDateKey, window, platform, 999);

    // 构建趋势
    const prevScores = new Map((previousSummary?.topicScores || []).map(ts => [ts.topicId, ts.finalScore]));

    const trends: InterestTrend[] = [];
    for (const currentTopic of currentSummary.topicScores) {
      const previousScore = prevScores.get(currentTopic.topicId) || 0;
      const { changeAmount, changePercent } = calculateScoreChange(currentTopic.finalScore, previousScore);

      trends.push({
        topicId: currentTopic.topicId,
        topicName: currentTopic.topicName,
        currentScore: currentTopic.finalScore,
        previousScore,
        changeAmount,
        changePercent,
        trend: calculateTrend(currentTopic.finalScore, previousScore)
      });
    }

    return trends.sort((a, b) => Math.abs(b.changeAmount) - Math.abs(a.changeAmount));
  }

  /**
   * 历史回填：补齐所有标签映射
   */
  async backfillTagMappings(useLLM: boolean = false): Promise<number> {
    console.log('[InterestAnalysis] Starting tag mappings backfill...');

    // 获取所有标签
    const allTagsResult = await this.tagRepo.getAllTags();
    const allTags = allTagsResult.items;
    let processedCount = 0;

    for (const tag of allTags) {
      // 检查是否已有映射
      const existingMappings = await this.mappingRepo.getMappingsByTagId(tag.tagId);
      if (existingMappings.length > 0) {
        continue; // 已存在映射，跳过
      }

      // 生成映射
      const mappings = await this.resolveTagMeaning(tag.tagId, tag.name, useLLM);
      if (mappings && mappings.length > 0) {
        processedCount++;
      }
    }

    console.log(`[InterestAnalysis] Tag mappings backfill completed. Processed ${processedCount} tags.`);
    return processedCount;
  }

  /**
   * 历史回填：生成所有观看行为的贡献事件
   */
  async backfillContributionEvents(useLLM: boolean = false): Promise<{ watchEvents: number; favoriteEvents: number }> {
    console.log('[InterestAnalysis] Starting contribution events backfill...');

    let watchEventCount = 0;
    let favoriteEventCount = 0;

    // 回填观看事件
    const allWatchEvents = await this.watchRepo.getAllWatchEvents();
    for (const watchEvent of allWatchEvents) {
      try {
        const video = await this.videoRepo.getVideo(watchEvent.videoId);
        const events = await this.buildContributionEventsFromWatch(watchEvent, video, useLLM);
        if (events.length > 0) {
          await this.contributionRepo.addContributionEventsBatch(events);
          watchEventCount++;
        }
      } catch (error) {
        console.warn(`[InterestAnalysis] Failed to backfill watch event ${watchEvent.eventId}:`, error);
      }
    }

    // 回填收藏事件
    const allFavorites = await this.favoriteRepo.getAll();
    for (const favorite of allFavorites) {
      try {
        const video = await this.videoRepo.getVideo(favorite.videoId);
        const events = await this.buildContributionEventsFromFavorite(favorite, video, useLLM);
        if (events.length > 0) {
          await this.contributionRepo.addContributionEventsBatch(events);
          favoriteEventCount++;
        }
      } catch (error) {
        console.warn(`[InterestAnalysis] Failed to backfill favorite ${favorite.favoriteEntryId}:`, error);
      }
    }

    console.log(`[InterestAnalysis] Contribution events backfill completed. Watch: ${watchEventCount}, Favorite: ${favoriteEventCount}`);
    return { watchEvents: watchEventCount, favoriteEvents: favoriteEventCount };
  }

  /**
   * 重建所有快照
   */
  async rebuildAllSnapshots(platform: Platform): Promise<{ sevenDaySnapshots: number; thirtyDaySnapshots: number }> {
    console.log('[InterestAnalysis] Starting full snapshots rebuild...');

    let sevenDayCount = 0;
    let thirtyDayCount = 0;

    // 获取所有贡献事件的日期范围
    const allEvents = await this.contributionRepo.getAllEvents();
    const dateKeys = new Set(allEvents.map(e => e.dateKey));

    for (const dateKey of dateKeys) {
      try {
        // 重建7天快照
        await this.rebuildSnapshotsForWindow(dateKey, '7d', platform);
        sevenDayCount++;

        // 重建30天快照
        await this.rebuildSnapshotsForWindow(dateKey, '30d', platform);
        thirtyDayCount++;
      } catch (error) {
        console.warn(`[InterestAnalysis] Failed to rebuild snapshots for ${dateKey}:`, error);
      }
    }

    console.log(`[InterestAnalysis] Full snapshots rebuild completed. 7d: ${sevenDayCount}, 30d: ${thirtyDayCount}`);
    return { sevenDaySnapshots: sevenDayCount, thirtyDaySnapshots: thirtyDayCount };
  }

  /**
   * 重建最近几天的快照
   */
  async rebuildRecentSnapshots(days: number = 30, platform: Platform): Promise<{ sevenDaySnapshots: number; thirtyDaySnapshots: number }> {
    console.log(`[InterestAnalysis] Starting recent snapshots rebuild (${days} days)...`);

    let sevenDayCount = 0;
    let thirtyDayCount = 0;

    const now = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];

      try {
        // 重建7天快照
        await this.rebuildSnapshotsForWindow(dateKey, '7d', platform);
        sevenDayCount++;

        // 重建30天快照
        await this.rebuildSnapshotsForWindow(dateKey, '30d', platform);
        thirtyDayCount++;
      } catch (error) {
        console.warn(`[InterestAnalysis] Failed to rebuild snapshots for ${dateKey}:`, error);
      }
    }

    console.log(`[InterestAnalysis] Recent snapshots rebuild completed. 7d: ${sevenDayCount}, 30d: ${thirtyDayCount}`);
    return { sevenDaySnapshots: sevenDayCount, thirtyDaySnapshots: thirtyDayCount };
  }
}
