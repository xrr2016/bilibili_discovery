/**
 * InterestNodeRepository 实现
 * 实现兴趣星球节点相关的数据库操作
 */

import { IInterestNodeRepository } from '../interfaces/analytics/interest-node-repository.interface.js';
import { InterestNode } from '../types/analytics.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';

/**
 * InterestNodeRepository 实现类
 */
export class InterestNodeRepository implements IInterestNodeRepository {
  /**
   * 创建兴趣节点
   */
  async createNode(node: Omit<InterestNode, 'nodeId'>): Promise<string> {
    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newNode: InterestNode = {
      ...node,
      nodeId,
      createdAt: Date.now(),
      lastUpdate: Date.now()
    };
    await DBUtils.put(STORE_NAMES.INTEREST_NODES, newNode);
    return nodeId;
  }

  /**
   * 批量创建兴趣节点
   */
  async createNodes(nodes: Omit<InterestNode, 'nodeId'>[]): Promise<string[]> {
    const newNodes = nodes.map(node => ({
      ...node,
      nodeId: `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: Date.now(),
      lastUpdate: Date.now()
    }));
    await DBUtils.putBatch(STORE_NAMES.INTEREST_NODES, newNodes);
    return newNodes.map(n => n.nodeId);
  }

  /**
   * 获取兴趣节点
   */
  async getNode(nodeId: string): Promise<InterestNode | null> {
    return DBUtils.get<InterestNode>(STORE_NAMES.INTEREST_NODES, nodeId);
  }

  /**
   * 批量获取兴趣节点
   */
  async getNodes(nodeIds: string[]): Promise<InterestNode[]> {
    return DBUtils.getBatch<InterestNode>(STORE_NAMES.INTEREST_NODES, nodeIds);
  }

  /**
   * 获取所有兴趣节点
   */
  async getAllNodes(parentId?: string): Promise<InterestNode[]> {
    const allNodes = await DBUtils.getAll<InterestNode>(STORE_NAMES.INTEREST_NODES);
    const filtered = parentId !== undefined 
      ? allNodes.filter(n => n.parentId === parentId)
      : allNodes;
    return filtered.sort((a, b) => b.weight - a.weight);
  }

  /**
   * 获取节点路径
   */
  async getNodePath(nodeId: string): Promise<InterestNode[]> {
    const path: InterestNode[] = [];
    let currentNode = await this.getNode(nodeId);

    while (currentNode) {
      path.unshift(currentNode);
      if (!currentNode.parentId) {
        break;
      }
      currentNode = await this.getNode(currentNode.parentId);
    }

    return path;
  }

  /**
   * 获取子节点
   */
  async getChildNodes(nodeId: string): Promise<InterestNode[]> {
    const allNodes = await DBUtils.getAll<InterestNode>(STORE_NAMES.INTEREST_NODES);
    const children = allNodes.filter(n => n.parentId === nodeId);
    return children.sort((a, b) => b.weight - a.weight);
  }

  /**
   * 获取节点树
   */
  async getNodeTree(rootId?: string, maxDepth: number = 10): Promise<InterestNode[]> {
    const result: InterestNode[] = [];

    const traverse = async (nodeId: string | undefined, depth: number): Promise<void> => {
      if (depth > maxDepth) {
        return;
      }

      const nodes = await this.getAllNodes(nodeId);
      for (const node of nodes) {
        result.push(node);
        await traverse(node.nodeId, depth + 1);
      }
    };

    await traverse(rootId, 0);
    return result;
  }

  /**
   * 更新兴趣节点
   */
  async updateNode(nodeId: string, updates: Partial<Omit<InterestNode, 'nodeId' | 'createdAt'>>): Promise<void> {
    const existing = await this.getNode(nodeId);
    if (!existing) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const updated: InterestNode = {
      ...existing,
      ...updates,
      lastUpdate: Date.now()
    };

    await DBUtils.put(STORE_NAMES.INTEREST_NODES, updated);
  }

  /**
   * 批量更新兴趣节点
   */
  async updateNodes(updates: Map<string, Partial<Omit<InterestNode, 'nodeId' | 'createdAt'>>>): Promise<void> {
    const allNodes = await DBUtils.getAll<InterestNode>(STORE_NAMES.INTEREST_NODES);
    const updatedNodes: InterestNode[] = [];

    for (const [nodeId, update] of updates.entries()) {
      const existing = allNodes.find(n => n.nodeId === nodeId);
      if (existing) {
        updatedNodes.push({
          ...existing,
          ...update,
          lastUpdate: Date.now()
        });
      }
    }

    if (updatedNodes.length > 0) {
      await DBUtils.putBatch(STORE_NAMES.INTEREST_NODES, updatedNodes);
    }
  }

  /**
   * 删除兴趣节点
   */
  async deleteNode(nodeId: string): Promise<void> {
    await DBUtils.delete(STORE_NAMES.INTEREST_NODES, nodeId);
  }

  /**
   * 删除节点及其所有子节点
   */
  async deleteNodeTree(nodeId: string): Promise<void> {
    const toDelete: string[] = [nodeId];

    // 收集所有子节点ID
    const collectChildren = async (parentId: string): Promise<void> => {
      const children = await this.getChildNodes(parentId);
      for (const child of children) {
        toDelete.push(child.nodeId);
        await collectChildren(child.nodeId);
      }
    };

    await collectChildren(nodeId);
    await DBUtils.deleteBatch(STORE_NAMES.INTEREST_NODES, toDelete);
  }

  /**
   * 移动节点
   */
  async moveNode(nodeId: string, newParentId?: string): Promise<void> {
    await this.updateNode(nodeId, { parentId: newParentId });
  }

  /**
   * 清空所有兴趣节点
   */
  async clearAllInterestNodes(): Promise<void> {
    await DBUtils.clear(STORE_NAMES.INTEREST_NODES);
  }
}
