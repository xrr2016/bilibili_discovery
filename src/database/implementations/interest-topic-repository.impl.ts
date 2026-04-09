/**
 * InterestTopicRepositoryImpl 实现
 * 实现兴趣主题相关的数据库操作
 */

import { InterestTopic } from '../types/interest.js';
import { ID, Timestamp } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';
import { generateId } from './id-generator.js';

/**
 * 兴趣主题仓库实现类
 */
export class InterestTopicRepositoryImpl {
  /**
   * 创建单个兴趣主题
   */
  async createTopic(
    name: string,
    description?: string,
    parentTopicId?: ID
  ): Promise<ID> {
    const topicId = generateId();
    const now = Date.now() as Timestamp;

    const topic: InterestTopic = {
      topicId,
      name,
      description,
      parentTopicId,
      isActive: 1,
      createdAt: now,
      updatedAt: now
    };

    try {
      await DBUtils.put(STORE_NAMES.INTEREST_TOPICS, topic);
    } catch (error) {
      // 如果是 name 冲突，尝试获取已存在的主题
      if (error instanceof Error && error.name === 'ConstraintError') {
        const existing = await DBUtils.getOneByIndex<InterestTopic>(
          STORE_NAMES.INTEREST_TOPICS,
          'name',
          name
        );
        if (existing) {
          return existing.topicId;
        }
        throw error;
      }
      throw error;
    }

    return topicId;
  }

  /**
   * 创建或更新兴趣主题
   */
  async upsertTopic(topic: Partial<InterestTopic> & { topicId: ID; name: string }): Promise<void> {
    const now = Date.now() as Timestamp;

    const fullTopic: InterestTopic = {
      ...topic,
      isActive: topic.isActive ?? 1,
      createdAt: topic.createdAt ?? now,
      updatedAt: now
    };

    await DBUtils.put(STORE_NAMES.INTEREST_TOPICS, fullTopic);
  }

  /**
   * 批量创建或更新兴趣主题
   */
  async upsertTopics(topics: Partial<InterestTopic>[]): Promise<void> {
    const now = Date.now() as Timestamp;

    const fullTopics: InterestTopic[] = topics.map(topic => ({
      ...topic,
      topicId: topic.topicId ?? generateId(),
      name: topic.name ?? 'Unknown',
      isActive: topic.isActive ?? 1,
      createdAt: topic.createdAt ?? now,
      updatedAt: now
    } as InterestTopic));

    await DBUtils.putBatch(STORE_NAMES.INTEREST_TOPICS, fullTopics);
  }

  /**
   * 获取单个兴趣主题（按ID）
   */
  async getTopic(topicId: ID): Promise<InterestTopic | null> {
    return await DBUtils.get<InterestTopic>(STORE_NAMES.INTEREST_TOPICS, topicId);
  }

  /**
   * 批量获取多个兴趣主题
   */
  async getTopics(topicIds: ID[]): Promise<InterestTopic[]> {
    return await DBUtils.getBatch<InterestTopic>(STORE_NAMES.INTEREST_TOPICS, topicIds);
  }

  /**
   * 获取兴趣主题（按名称）
   */
  async getTopicByName(name: string): Promise<InterestTopic | null> {
    return await DBUtils.getOneByIndex<InterestTopic>(
      STORE_NAMES.INTEREST_TOPICS,
      'name',
      name
    );
  }

  /**
   * 获取所有兴趣主题
   */
  async getAllTopics(): Promise<InterestTopic[]> {
    return await DBUtils.getAll<InterestTopic>(STORE_NAMES.INTEREST_TOPICS);
  }

  /**
   * 获取活跃的兴趣主题
   */
  async getActiveTopics(): Promise<InterestTopic[]> {
    const allTopics = await DBUtils.getByIndex<InterestTopic>(
      STORE_NAMES.INTEREST_TOPICS,
      'isActive',
      1
    );
    return allTopics;
  }

  /**
   * 获取指定父主题下的子主题
   */
  async getSubTopics(parentTopicId: ID): Promise<InterestTopic[]> {
    return await DBUtils.getByIndex<InterestTopic>(
      STORE_NAMES.INTEREST_TOPICS,
      'parentTopicId',
      parentTopicId
    );
  }

  /**
   * 停用兴趣主题（逻辑删除）
   */
  async deactivateTopic(topicId: ID): Promise<void> {
    const topic = await this.getTopic(topicId);
    if (topic) {
      topic.isActive = 0;
      topic.updatedAt = Date.now() as Timestamp;
      await DBUtils.put(STORE_NAMES.INTEREST_TOPICS, topic);
    }
  }

  /**
   * 激活兴趣主题
   */
  async activateTopic(topicId: ID): Promise<void> {
    const topic = await this.getTopic(topicId);
    if (topic) {
      topic.isActive = 1;
      topic.updatedAt = Date.now() as Timestamp;
      await DBUtils.put(STORE_NAMES.INTEREST_TOPICS, topic);
    }
  }

  /**
   * 删除兴趣主题（物理删除）
   */
  async deleteTopic(topicId: ID): Promise<void> {
    await DBUtils.delete(STORE_NAMES.INTEREST_TOPICS, topicId);
  }

  /**
   * 批量删除兴趣主题
   */
  async deleteTopics(topicIds: ID[]): Promise<void> {
    await DBUtils.deleteBatch(STORE_NAMES.INTEREST_TOPICS, topicIds);
  }

  /**
   * 获取兴趣主题总数
   */
  async countTopics(): Promise<number> {
    return await DBUtils.count(STORE_NAMES.INTEREST_TOPICS);
  }

  /**
   * 获取活跃兴趣主题数量
   */
  async countActiveTopics(): Promise<number> {
    return await DBUtils.countByIndex(STORE_NAMES.INTEREST_TOPICS, 'isActive', 1);
  }

  /**
   * 清空所有兴趣主题
   */
  async clearTopics(): Promise<void> {
    await DBUtils.clear(STORE_NAMES.INTEREST_TOPICS);
  }
}
