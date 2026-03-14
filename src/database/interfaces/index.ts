
/**
 * 数据库统一接口
 * 整合所有数据库管理接口
 */

export type {
  // 核心类型
  Platform,
  Timestamp,
  ID,
  TagSource,
  VideoSource,
  InteractionType,
  NoteType,
  Vector,
  Category,
  PaginationParams,
  PaginationResult,
  DBResult,

  // 内容层类型
  Creator,
  Video,
  Collection,
  CreatorQueryParams,
  VideoQueryParams,
  CollectionQueryParams,

  // 行为层类型
  WatchEvent,
  InteractionEvent,
  SearchEvent,
  WatchEventQueryParams,
  InteractionEventQueryParams,
  SearchEventQueryParams,
  WatchStats,
  InteractionStats,

  // 语义层类型
  Tag,
  TagAlias,
  TagStats,
  TagSimilarity,
  TagQueryParams,
  TagAliasQueryParams,

  // 笔记层类型
  VideoNote,
  VideoNoteQueryParams,
  NoteSearchResult,
  NoteStats,

  // 分析层类型
  InterestScore,
  InterestNode,
  CreatorRank,
  WatchTimeStats,
  InterestTrend,
  InterestScoreQueryParams,
  InterestNodeQueryParams,
  CreatorRankQueryParams,
  WatchTimeStatsQueryParams
} from '../types';

export type {
  // 搜索接口类型
  VideoSearchResult,
  CollectionSearchResult,
  LLMQueryResult,

  // 推荐接口类型
  RecommendationSource,
  RecommendationResult,
  RecommendationParams,

  // 存储接口类型
  DatabaseConfig,
  StoreConfig,
  IndexConfig
} from './storage-manager';

export type {
  // 搜索接口类型
  VideoSearchResult,
  CollectionSearchResult,
  LLMQueryResult
} from './search-manager';

export type {
  // 推荐接口类型
  RecommendationSource,
  RecommendationResult,
  RecommendationParams
} from './recommendation-manager';

export type {
  // 存储接口类型
  DatabaseConfig,
  StoreConfig,
  IndexConfig
} from './storage-manager';

// 导出所有接口
export {
  IContentManager,
  ICreatorManager,
  IVideoManager,
  ICollectionManager
} from './content-manager';

export {
  IBehaviorManager,
  IWatchEventManager,
  IInteractionEventManager,
  ISearchEventManager
} from './behavior-manager';

export {
  ISemanticManager,
  ITagManager,
  ITagAliasManager,
  ICategoryManager
} from './semantic-manager';

export {
  INotesManager
} from './notes-manager';

export {
  IAnalyticsManager,
  IInterestScoreManager,
  IInterestNodeManager,
  ICreatorRankManager,
  IWatchTimeStatsManager
} from './analytics-manager';

export {
  ISearchManager,
  IVideoSearchManager,
  ICollectionSearchManager,
  ILLMSearchManager
} from './search-manager';

export {
  IRecommendationManager,
  IRecommendationCandidateManager,
  IRecommendationScoreManager,
  IRecommendationListManager
} from './recommendation-manager';

export {
  IStorageManager,
  IBrowserStorageManager
} from './storage-manager';

/**
 * 数据库统一接口
 * 整合所有数据库管理接口
 */
export interface IDatabase extends 
  IContentManager,
  IBehaviorManager,
  ISemanticManager,
  INotesManager,
  IAnalyticsManager,
  ISearchManager,
  IRecommendationManager,
  IStorageManager {}
