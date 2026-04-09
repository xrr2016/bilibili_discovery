/**
 * 基于 LLM 的标签-兴趣主题映射补洞器
 * 当规则映射失败时，使用 LLM 进行智能映射
 */

import { chatComplete } from '../llm-client.js';
import { FixedTopicId, TagMappingResult, getAllValidTopicIds, getTopicById } from './interest-types.js';

/**
 * LLM 映射器返回结果
 */
export interface LLMMappingResult {
  success: boolean;
  mappings: TagMappingResult[] | null;
  error?: string;
  rawResponse?: string;
}

/**
 * LLM 映射器类
 */
export class InterestLLMMapper {
  private isInitialized = false;
  private isAvailableFlag = true;

  /**
   * 初始化 LLM 客户端
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 尝试验证 LLM 配置是否有效
      // 在第一次调用时检查
      this.isInitialized = true;
      this.isAvailableFlag = true;
    } catch (error) {
      console.warn('[InterestLLMMapper] Failed to initialize LLM:', error);
      this.isAvailableFlag = false;
      this.isInitialized = true;
    }
  }

  /**
   * 检查 LLM 是否可用
   */
  isAvailable(): boolean {
    return this.isAvailableFlag;
  }

  /**
   * 为单个标签生成 prompt
   */
  private buildPrompt(tagName: string): string {
    const topicIds = getAllValidTopicIds();
    const topicList = topicIds
      .map(id => {
        const topic = getTopicById(id);
        return `- ${id}: ${topic?.name} (${topic?.description})`;
      })
      .join('\n');

    return `You are an expert content classifier. Given a tag name, classify it into one or more interest topics.

Available topics:
${topicList}

Tag to classify: "${tagName}"

Respond with a JSON array of classifications, each with:
- topicId (must be one of the listed IDs)
- score (0.0 to 1.0, how strongly this tag belongs to the topic)
- confidence (0.0 to 1.0, how confident you are in this classification)

Example response for tag "英雄联盟":
[
  { "topicId": "game", "score": 0.95, "confidence": 0.95 }
]

Example response for tag "二次元音乐":
[
  { "topicId": "acg", "score": 0.8, "confidence": 0.85 },
  { "topicId": "music", "score": 0.7, "confidence": 0.8 }
]

Important:
1. Always respond with valid JSON array
2. Only use topicIds from the available list
3. If tag cannot be classified, respond with empty array: []
4. Keep responses concise

Respond ONLY with the JSON array, no other text.`;
  }

  /**
   * 解析 LLM 响应
   */
  private parseResponse(response: string): TagMappingResult[] | null {
    try {
      const trimmed = response.trim();
      
      // 提取 JSON 数组
      const jsonMatch = trimmed.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        console.warn('[InterestLLMMapper] No JSON array found in response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        console.warn('[InterestLLMMapper] Response is not an array');
        return null;
      }

      const results: TagMappingResult[] = [];

      for (const item of parsed) {
        const topicId = item.topicId as string;
        const score = parseFloat(item.score) || 0;
        const confidence = parseFloat(item.confidence) || 0;

        // 验证 topicId
        if (!getTopicById(topicId)) {
          console.warn(`[InterestLLMMapper] Invalid topicId: ${topicId}`);
          continue;
        }

        // 验证分数范围
        if (score < 0 || score > 1 || confidence < 0 || confidence > 1) {
          console.warn(`[InterestLLMMapper] Invalid score/confidence: ${score}/${confidence}`);
          continue;
        }

        results.push({
          topicId: topicId as FixedTopicId,
          score,
          confidence,
          source: 'llm'
        });
      }

      return results.length > 0 ? results : null;
    } catch (error) {
      console.error('[InterestLLMMapper] Failed to parse LLM response:', error);
      return null;
    }
  }

  /**
   * 使用 LLM 映射单个标签
   */
  async mapTag(tagName: string): Promise<LLMMappingResult> {
    // 初始化
    if (!this.isInitialized) {
      await this.initialize();
    }

    // 检查 LLM 可用性
    if (!this.isAvailableFlag) {
      return {
        success: false,
        mappings: null,
        error: 'LLM not available'
      };
    }

    try {
      const prompt = this.buildPrompt(tagName);
      
      const response = await chatComplete([
        {
          role: 'user',
          content: prompt
        }
      ]);

      const rawResponse = response || '';

      // 解析响应
      const mappings = this.parseResponse(rawResponse);

      if (mappings) {
        // 按分数降序排列
        mappings.sort((a, b) => b.score - a.score);
        return {
          success: true,
          mappings,
          rawResponse
        };
      } else {
        return {
          success: false,
          mappings: null,
          error: 'Failed to parse LLM response or no valid mappings',
          rawResponse
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[InterestLLMMapper] LLM mapping error:', errorMsg);
      return {
        success: false,
        mappings: null,
        error: errorMsg,
        rawResponse: undefined
      };
    }
  }

  /**
   * 批量使用 LLM 映射标签
   * 带有并发控制，避免过度请求
   */
  async mapTags(tagNames: string[], concurrency: number = 3): Promise<Map<string, TagMappingResult[]>> {
    const results = new Map<string, TagMappingResult[]>();

    // 按并发数分批处理
    for (let i = 0; i < tagNames.length; i += concurrency) {
      const batch = tagNames.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(tag => this.mapTag(tag))
      );

      for (let j = 0; j < batch.length; j++) {
        const tag = batch[j];
        const result = batchResults[j];

        if (result.status === 'fulfilled' && result.value.success && result.value.mappings) {
          results.set(tag, result.value.mappings);
        }
      }
    }

    return results;
  }

  /**
   * 映射单个标签到最佳主题
   */
  async mapTagToBest(tagName: string): Promise<TagMappingResult | null> {
    const result = await this.mapTag(tagName);
    if (result.success && result.mappings && result.mappings.length > 0) {
      return result.mappings[0];
    }
    return null;
  }
}

/**
 * 全局 LLM 映射器单例
 */
let globalLLMMapper: InterestLLMMapper | null = null;

/**
 * 获取全局 LLM 映射器实例
 */
export function getLLMMapper(): InterestLLMMapper {
  if (!globalLLMMapper) {
    globalLLMMapper = new InterestLLMMapper();
  }
  return globalLLMMapper;
}

/**
 * 重置全局 LLM 映射器
 */
export function resetLLMMapper(): void {
  globalLLMMapper = null;
}
