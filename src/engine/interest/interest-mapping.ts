/**
 * 标签-兴趣主题规则映射器
 * 使用规则引擎实现标签到兴趣主题的映射
 */

import { FixedTopicId, TagMappingResult, getTopicById } from './interest-types.js';

/**
 * 映射规则类型
 */
interface MappingRule {
  /** 规则ID，用于调试和追踪 */
  ruleId: string;
  
  /** 规则类型: exact(精确匹配) | includes(包含匹配) | regex(正则匹配) | prefix(前缀匹配) | suffix(后缀匹配) */
  type: 'exact' | 'includes' | 'regex' | 'prefix' | 'suffix';
  
  /** 规则值（字符串或正则模式） */
  pattern: string | RegExp;
  
  /** 目标兴趣主题 */
  targetTopic: FixedTopicId;
  
  /** 映射分数（权重） */
  score: number;
  
  /** 置信度（0-1） */
  confidence: number;
  
  /** 是否大小写敏感 */
  caseSensitive?: boolean;
}

/**
 * 映射规则库
 * 按优先级排序，高优先级放在前面
 */
const MAPPING_RULES: MappingRule[] = [
  // ===== 游戏相关规则 =====
  { ruleId: 'game_exact_1', type: 'exact', pattern: '游戏', targetTopic: 'game', score: 1.0, confidence: 0.95 },
  { ruleId: 'game_exact_2', type: 'exact', pattern: 'Game', targetTopic: 'game', score: 1.0, confidence: 0.95, caseSensitive: false },
  { ruleId: 'game_includes_1', type: 'includes', pattern: '游戏', targetTopic: 'game', score: 0.9, confidence: 0.9 },
  { ruleId: 'game_includes_2', type: 'includes', pattern: '电玩', targetTopic: 'game', score: 0.9, confidence: 0.9 },
  { ruleId: 'game_includes_3', type: 'includes', pattern: '游戏评测', targetTopic: 'game', score: 0.95, confidence: 0.95 },
  { ruleId: 'game_includes_4', type: 'includes', pattern: '游戏直播', targetTopic: 'game', score: 0.95, confidence: 0.95 },
  { ruleId: 'game_includes_5', type: 'includes', pattern: '攻略', targetTopic: 'game', score: 0.85, confidence: 0.85 },
  { ruleId: 'game_prefix_1', type: 'prefix', pattern: 'Genshin Impact', targetTopic: 'game', score: 0.95, confidence: 0.95, caseSensitive: false },
  { ruleId: 'game_includes_6', type: 'includes', pattern: 'Elden Ring', targetTopic: 'game', score: 0.95, confidence: 0.95, caseSensitive: false },
  { ruleId: 'game_includes_7', type: 'includes', pattern: 'Palworld', targetTopic: 'game', score: 0.95, confidence: 0.95, caseSensitive: false },
  { ruleId: 'game_includes_8', type: 'includes', pattern: 'Minecraft', targetTopic: 'game', score: 0.95, confidence: 0.95, caseSensitive: false },
  { ruleId: 'game_includes_9', type: 'includes', pattern: 'Dead by Daylight', targetTopic: 'game', score: 0.95, confidence: 0.95, caseSensitive: false },
  { ruleId: 'game_includes_10', type: 'includes', pattern: '鬼泣', targetTopic: 'game', score: 0.9, confidence: 0.9 },
  { ruleId: 'game_includes_11', type: 'includes', pattern: '赛博朋克', targetTopic: 'game', score: 0.9, confidence: 0.9 },

  // ===== 动画相关规则 =====
  { ruleId: 'anim_exact_1', type: 'exact', pattern: '动画', targetTopic: 'animation', score: 1.0, confidence: 0.95 },
  { ruleId: 'anim_includes_1', type: 'includes', pattern: '番剧', targetTopic: 'animation', score: 0.95, confidence: 0.95 },
  { ruleId: 'anim_includes_2', type: 'includes', pattern: '动画评', targetTopic: 'animation', score: 0.9, confidence: 0.9 },
  { ruleId: 'anim_includes_3', type: 'includes', pattern: 'Anime', targetTopic: 'animation', score: 0.9, confidence: 0.9, caseSensitive: false },
  { ruleId: 'anim_includes_4', type: 'includes', pattern: '新番', targetTopic: 'animation', score: 0.9, confidence: 0.9 },
  { ruleId: 'anim_includes_5', type: 'includes', pattern: '补番', targetTopic: 'animation', score: 0.85, confidence: 0.85 },
  { ruleId: 'anim_includes_6', type: 'includes', pattern: '动漫', targetTopic: 'animation', score: 0.85, confidence: 0.85 },

  // ===== 音乐相关规则 =====
  { ruleId: 'music_exact_1', type: 'exact', pattern: '音乐', targetTopic: 'music', score: 1.0, confidence: 0.95 },
  { ruleId: 'music_includes_1', type: 'includes', pattern: '音乐', targetTopic: 'music', score: 0.95, confidence: 0.95 },
  { ruleId: 'music_includes_2', type: 'includes', pattern: 'Music', targetTopic: 'music', score: 0.9, confidence: 0.9, caseSensitive: false },
  { ruleId: 'music_includes_3', type: 'includes', pattern: '歌曲', targetTopic: 'music', score: 0.95, confidence: 0.95 },
  { ruleId: 'music_includes_4', type: 'includes', pattern: '歌手', targetTopic: 'music', score: 0.85, confidence: 0.85 },
  { ruleId: 'music_includes_5', type: 'includes', pattern: '演唱', targetTopic: 'music', score: 0.85, confidence: 0.85 },
  { ruleId: 'music_includes_6', type: 'includes', pattern: 'VOCALOID', targetTopic: 'music', score: 0.9, confidence: 0.9, caseSensitive: false },
  { ruleId: 'music_includes_7', type: 'includes', pattern: '音MAD', targetTopic: 'music', score: 0.8, confidence: 0.8 },
  { ruleId: 'music_includes_8', type: 'includes', pattern: '翻唱', targetTopic: 'music', score: 0.9, confidence: 0.9 },

  // ===== 二次元/ACG 相关规则 =====
  { ruleId: 'acg_includes_1', type: 'includes', pattern: '二次元', targetTopic: 'acg', score: 0.95, confidence: 0.95 },
  { ruleId: 'acg_includes_2', type: 'includes', pattern: 'Cosplay', targetTopic: 'acg', score: 0.9, confidence: 0.9, caseSensitive: false },
  { ruleId: 'acg_includes_3', type: 'includes', pattern: '同人', targetTopic: 'acg', score: 0.85, confidence: 0.85 },
  { ruleId: 'acg_includes_4', type: 'includes', pattern: '萌', targetTopic: 'acg', score: 0.7, confidence: 0.7 },
  { ruleId: 'acg_includes_5', type: 'includes', pattern: 'ACG', targetTopic: 'acg', score: 0.9, confidence: 0.9, caseSensitive: false },
  { ruleId: 'acg_includes_6', type: 'includes', pattern: 'Otaku', targetTopic: 'acg', score: 0.85, confidence: 0.85, caseSensitive: false },
  { ruleId: 'acg_includes_7', type: 'includes', pattern: '宅', targetTopic: 'acg', score: 0.7, confidence: 0.65 },

  // ===== 搞笑/鬼畜相关规则 =====
  { ruleId: 'comedy_includes_1', type: 'includes', pattern: '搞笑', targetTopic: 'comedy', score: 0.95, confidence: 0.95 },
  { ruleId: 'comedy_includes_2', type: 'includes', pattern: '段子', targetTopic: 'comedy', score: 0.85, confidence: 0.85 },
  { ruleId: 'comedy_includes_3', type: 'includes', pattern: '喜剧', targetTopic: 'comedy', score: 0.9, confidence: 0.9 },
  { ruleId: 'kichiku_includes_1', type: 'includes', pattern: '鬼畜', targetTopic: 'kichiku', score: 0.95, confidence: 0.95 },
  { ruleId: 'kichiku_includes_2', type: 'includes', pattern: 'MAD', targetTopic: 'kichiku', score: 0.8, confidence: 0.8, caseSensitive: false },
  { ruleId: 'kichiku_includes_3', type: 'includes', pattern: '二创', targetTopic: 'kichiku', score: 0.85, confidence: 0.85 },
  { ruleId: 'kichiku_includes_4', type: 'includes', pattern: '音乐二创', targetTopic: 'kichiku', score: 0.9, confidence: 0.9 },

  // ===== 科技/数码相关规则 =====
  { ruleId: 'tech_includes_1', type: 'includes', pattern: '科技', targetTopic: 'tech', score: 0.95, confidence: 0.95 },
  { ruleId: 'tech_includes_2', type: 'includes', pattern: 'Tech', targetTopic: 'tech', score: 0.9, confidence: 0.9, caseSensitive: false },
  { ruleId: 'tech_includes_3', type: 'includes', pattern: '技术', targetTopic: 'tech', score: 0.85, confidence: 0.85 },
  { ruleId: 'tech_includes_4', type: 'includes', pattern: '科学', targetTopic: 'tech', score: 0.8, confidence: 0.8 },
  { ruleId: 'digital_includes_1', type: 'includes', pattern: '数码', targetTopic: 'digital', score: 0.95, confidence: 0.95 },
  { ruleId: 'digital_includes_2', type: 'includes', pattern: '开箱', targetTopic: 'digital', score: 0.85, confidence: 0.85 },
  { ruleId: 'digital_includes_3', type: 'includes', pattern: '评测', targetTopic: 'digital', score: 0.75, confidence: 0.75 },
  { ruleId: 'digital_includes_4', type: 'includes', pattern: '手机', targetTopic: 'digital', score: 0.8, confidence: 0.8 },
  { ruleId: 'digital_includes_5', type: 'includes', pattern: '电脑', targetTopic: 'digital', score: 0.8, confidence: 0.8 },
  { ruleId: 'digital_includes_6', type: 'includes', pattern: '平板', targetTopic: 'digital', score: 0.8, confidence: 0.8 },

  // ===== 知识/教程相关规则 =====
  { ruleId: 'know_includes_1', type: 'includes', pattern: '知识', targetTopic: 'knowledge', score: 0.95, confidence: 0.95 },
  { ruleId: 'know_includes_2', type: 'includes', pattern: '科普', targetTopic: 'knowledge', score: 0.9, confidence: 0.9 },
  { ruleId: 'know_includes_3', type: 'includes', pattern: '学习', targetTopic: 'knowledge', score: 0.85, confidence: 0.85 },
  { ruleId: 'know_includes_4', type: 'includes', pattern: '教育', targetTopic: 'knowledge', score: 0.85, confidence: 0.85 },
  { ruleId: 'tut_includes_1', type: 'includes', pattern: '教程', targetTopic: 'tutorial', score: 0.95, confidence: 0.95 },
  { ruleId: 'tut_includes_2', type: 'includes', pattern: '教学', targetTopic: 'tutorial', score: 0.9, confidence: 0.9 },
  { ruleId: 'tut_includes_3', type: 'includes', pattern: '如何', targetTopic: 'tutorial', score: 0.75, confidence: 0.75 },
  { ruleId: 'tut_includes_4', type: 'includes', pattern: '指南', targetTopic: 'tutorial', score: 0.85, confidence: 0.85 },

  // ===== 影视相关规则 =====
  { ruleId: 'film_includes_1', type: 'includes', pattern: '电影', targetTopic: 'film_tv', score: 0.95, confidence: 0.95 },
  { ruleId: 'film_includes_2', type: 'includes', pattern: '电视剧', targetTopic: 'film_tv', score: 0.95, confidence: 0.95 },
  { ruleId: 'film_includes_3', type: 'includes', pattern: '综艺', targetTopic: 'film_tv', score: 0.9, confidence: 0.9 },
  { ruleId: 'film_includes_4', type: 'includes', pattern: '影视', targetTopic: 'film_tv', score: 0.95, confidence: 0.95 },
  { ruleId: 'film_includes_5', type: 'includes', pattern: '电视', targetTopic: 'film_tv', score: 0.85, confidence: 0.85 },
  { ruleId: 'film_includes_6', type: 'includes', pattern: 'Movie', targetTopic: 'film_tv', score: 0.9, confidence: 0.9, caseSensitive: false },
  { ruleId: 'film_includes_7', type: 'includes', pattern: 'TV', targetTopic: 'film_tv', score: 0.75, confidence: 0.75, caseSensitive: false },

  // ===== 生活相关规则 =====
  { ruleId: 'life_includes_1', type: 'includes', pattern: '生活', targetTopic: 'lifestyle', score: 0.9, confidence: 0.85 },
  { ruleId: 'life_includes_2', type: 'includes', pattern: '日常', targetTopic: 'lifestyle', score: 0.85, confidence: 0.8 },
  { ruleId: 'life_includes_3', type: 'includes', pattern: '宅', targetTopic: 'lifestyle', score: 0.7, confidence: 0.65 },
  { ruleId: 'life_includes_4', type: 'includes', pattern: '分享', targetTopic: 'lifestyle', score: 0.6, confidence: 0.5 },

  // ===== 美食相关规则 =====
  { ruleId: 'food_includes_1', type: 'includes', pattern: '美食', targetTopic: 'food', score: 0.95, confidence: 0.95 },
  { ruleId: 'food_includes_2', type: 'includes', pattern: '食物', targetTopic: 'food', score: 0.85, confidence: 0.85 },
  { ruleId: 'food_includes_3', type: 'includes', pattern: '烹饪', targetTopic: 'food', score: 0.9, confidence: 0.9 },
  { ruleId: 'food_includes_4', type: 'includes', pattern: '料理', targetTopic: 'food', score: 0.9, confidence: 0.9 },
  { ruleId: 'food_includes_5', type: 'includes', pattern: '食评', targetTopic: 'food', score: 0.9, confidence: 0.9 },

  // ===== 体育相关规则 =====
  { ruleId: 'sport_includes_1', type: 'includes', pattern: '体育', targetTopic: 'sports', score: 0.95, confidence: 0.95 },
  { ruleId: 'sport_includes_2', type: 'includes', pattern: '运动', targetTopic: 'sports', score: 0.85, confidence: 0.85 },
  { ruleId: 'sport_includes_3', type: 'includes', pattern: '赛事', targetTopic: 'sports', score: 0.85, confidence: 0.85 },
  { ruleId: 'sport_includes_4', type: 'includes', pattern: 'Sport', targetTopic: 'sports', score: 0.9, confidence: 0.9, caseSensitive: false },
  { ruleId: 'sport_includes_5', type: 'includes', pattern: '足球', targetTopic: 'sports', score: 0.9, confidence: 0.9 },
  { ruleId: 'sport_includes_6', type: 'includes', pattern: '篮球', targetTopic: 'sports', score: 0.9, confidence: 0.9 },

  // ===== 汽车相关规则 =====
  { ruleId: 'car_includes_1', type: 'includes', pattern: '汽车', targetTopic: 'car', score: 0.95, confidence: 0.95 },
  { ruleId: 'car_includes_2', type: 'includes', pattern: '车', targetTopic: 'car', score: 0.7, confidence: 0.6 },
  { ruleId: 'car_includes_3', type: 'includes', pattern: '驾驶', targetTopic: 'car', score: 0.8, confidence: 0.8 },
  { ruleId: 'car_includes_4', type: 'includes', pattern: '车评', targetTopic: 'car', score: 0.9, confidence: 0.9 },
  { ruleId: 'car_includes_5', type: 'includes', pattern: 'Car', targetTopic: 'car', score: 0.9, confidence: 0.9, caseSensitive: false },

  // ===== 财经相关规则 =====
  { ruleId: 'fin_includes_1', type: 'includes', pattern: '财经', targetTopic: 'finance', score: 0.95, confidence: 0.95 },
  { ruleId: 'fin_includes_2', type: 'includes', pattern: '投资', targetTopic: 'finance', score: 0.9, confidence: 0.9 },
  { ruleId: 'fin_includes_3', type: 'includes', pattern: '经济', targetTopic: 'finance', score: 0.85, confidence: 0.85 },
  { ruleId: 'fin_includes_4', type: 'includes', pattern: '股票', targetTopic: 'finance', score: 0.9, confidence: 0.9 },
  { ruleId: 'fin_includes_5', type: 'includes', pattern: '金融', targetTopic: 'finance', score: 0.9, confidence: 0.9 },

  // ===== 情感相关规则 =====
  { ruleId: 'emo_includes_1', type: 'includes', pattern: '情感', targetTopic: 'emotional', score: 0.95, confidence: 0.95 },
  { ruleId: 'emo_includes_2', type: 'includes', pattern: '心理', targetTopic: 'emotional', score: 0.9, confidence: 0.9 },
  { ruleId: 'emo_includes_3', type: 'includes', pattern: '人生', targetTopic: 'emotional', score: 0.8, confidence: 0.8 },
  { ruleId: 'emo_includes_4', type: 'includes', pattern: '情绪', targetTopic: 'emotional', score: 0.85, confidence: 0.85 },

  // ===== 时尚相关规则 =====
  { ruleId: 'fash_includes_1', type: 'includes', pattern: '时尚', targetTopic: 'fashion', score: 0.95, confidence: 0.95 },
  { ruleId: 'fash_includes_2', type: 'includes', pattern: '服装', targetTopic: 'fashion', score: 0.9, confidence: 0.9 },
  { ruleId: 'fash_includes_3', type: 'includes', pattern: '穿搭', targetTopic: 'fashion', score: 0.95, confidence: 0.95 },
  { ruleId: 'fash_includes_4', type: 'includes', pattern: '美妆', targetTopic: 'fashion', score: 0.85, confidence: 0.85 },
  { ruleId: 'fash_includes_5', type: 'includes', pattern: '化妆', targetTopic: 'fashion', score: 0.85, confidence: 0.85 },
  { ruleId: 'fash_includes_6', type: 'includes', pattern: '彩妆', targetTopic: 'fashion', score: 0.85, confidence: 0.85 },

  // ===== 旅游相关规则 =====
  { ruleId: 'travel_includes_1', type: 'includes', pattern: '旅游', targetTopic: 'travel', score: 0.95, confidence: 0.95 },
  { ruleId: 'travel_includes_2', type: 'includes', pattern: '旅行', targetTopic: 'travel', score: 0.95, confidence: 0.95 },
  { ruleId: 'travel_includes_3', type: 'includes', pattern: '地理', targetTopic: 'travel', score: 0.85, confidence: 0.85 },
  { ruleId: 'travel_includes_4', type: 'includes', pattern: '风景', targetTopic: 'travel', score: 0.8, confidence: 0.8 },
  { ruleId: 'travel_includes_5', type: 'includes', pattern: 'Travel', targetTopic: 'travel', score: 0.9, confidence: 0.9, caseSensitive: false },
];

/**
 * 测试规则是否匹配
 */
function testRule(rule: MappingRule, input: string): boolean {
  const text = rule.caseSensitive === false ? input.toLowerCase() : input;
  const pattern = rule.caseSensitive === false && typeof rule.pattern === 'string' 
    ? rule.pattern.toLowerCase() 
    : rule.pattern;

  switch (rule.type) {
    case 'exact':
      return text === pattern;
    case 'includes':
      return text.includes(pattern as string);
    case 'prefix':
      return text.startsWith(pattern as string);
    case 'suffix':
      return text.endsWith(pattern as string);
    case 'regex':
      return (pattern as RegExp).test(input);
    default:
      return false;
  }
}

/**
 * 规则映射器类
 */
export class InterestRuleMapper {
  /**
   * 映射单个标签
   * 返回可能的主题映射列表
   */
  static mapTag(tagName: string): TagMappingResult[] {
    const results: Map<FixedTopicId, TagMappingResult> = new Map();

    for (const rule of MAPPING_RULES) {
      if (testRule(rule, tagName)) {
        // 如果已存在该主题的映射，比较分数并保留高分
        if (results.has(rule.targetTopic)) {
          const existing = results.get(rule.targetTopic)!;
          if (rule.score > existing.score) {
            results.set(rule.targetTopic, {
              topicId: rule.targetTopic,
              score: rule.score,
              confidence: rule.confidence,
              source: 'rule'
            });
          }
        } else {
          results.set(rule.targetTopic, {
            topicId: rule.targetTopic,
            score: rule.score,
            confidence: rule.confidence,
            source: 'rule'
          });
        }
      }
    }

    // 按分数降序返回结果
    return Array.from(results.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * 批量映射多个标签
   */
  static mapTags(tagNames: string[]): Map<string, TagMappingResult[]> {
    const results = new Map<string, TagMappingResult[]>();
    for (const tag of tagNames) {
      const mappings = this.mapTag(tag);
      if (mappings.length > 0) {
        results.set(tag, mappings);
      }
    }
    return results;
  }

  /**
   * 获取标签的最佳映射（得分最高的主题）
   */
  static mapTagToBest(tagName: string): TagMappingResult | null {
    const mappings = this.mapTag(tagName);
    return mappings.length > 0 ? mappings[0] : null;
  }

  /**
   * 检查标签是否可以被规则映射
   */
  static canMapTag(tagName: string): boolean {
    return this.mapTag(tagName).length > 0;
  }

  /**
   * 获取所有匹配的规则ID（用于调试）
   */
  static getMatchingRules(tagName: string): string[] {
    const matchingRules: string[] = [];
    for (const rule of MAPPING_RULES) {
      if (testRule(rule, tagName)) {
        matchingRules.push(rule.ruleId);
      }
    }
    return matchingRules;
  }
}
