/**
 * 兴趣分析引擎统一导出
 */

// 类型定义
export {
  FixedTopicId,
  InterestTopicDef,
  TagMappingResult,
  TagMappingResultMulti,
  InterestContributionData,
  InterestScoringParams,
  InterestSummary,
  InterestTrend,
  FIXED_TOPICS,
  getAllTopics,
  getTopicById,
  getTopicByName,
  isValidTopicId,
  isValidTopicName,
  getAllValidTopicIds,
  getAllValidTopicNames
} from './interest-types.js';

// 规则映射
export {
  InterestRuleMapper
} from './interest-mapping.js';

// LLM 映射
export {
  InterestLLMMapper,
  LLMMappingResult,
  getLLMMapper,
  resetLLMMapper
} from './interest-llm.js';

// 分数计算
export {
  InterestScorer,
  ScoringWeights,
  DEFAULT_SCORING_WEIGHTS,
  calculateTrend,
  calculateScoreChange,
  getScorer,
  resetScorer,
  quickScore
} from './interest-scoring.js';
