/**
 * Database Implementations 统一导出
 * 导出所有数据库实现类
 */

// Semantic 实现
export { TagRepository } from './tag-repository.impl';
export { CategoryRepository } from './category-repository.impl';

// Creator 实现
export { CreatorRepository } from './creator-repository.impl';

// Video 实现
export { VideoRepository } from './video-repository.impl';

// Behavior 实现
export { WatchEventRepository } from './watch-event-repository.impl';
export { InteractionEventRepository } from './interaction-event-repository.impl';
export { SearchEventRepository } from './search-event-repository.impl';

// Collection 实现
export { CollectionRepository } from './collection-repository.impl';
export { CollectionItemRepository } from './collection-item-repository.impl';

// Analytics 实现
export { InterestScoreRepository } from './interest-score-repository.impl';

// Note 实现
export { VideoNoteRepository } from './video-note-repository.impl';
export { NoteSegmentRepository } from './note-segment-repository.impl';
export { KnowledgeEntryRepository } from './knowledge-entry-repository.impl';
