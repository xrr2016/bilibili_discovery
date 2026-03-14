
# Bilibili Discovery 数据库设计文档

## 概述

本数据库设计用于支持视频兴趣分析与知识管理的浏览器扩展系统。基于IndexedDB实现，支持多平台（B站/YouTube）数据管理。

## 设计目标

1. **高扩展性** - 支持未来功能扩展
2. **可分析性** - 支持行为数据分析
3. **语义计算** - 支持AI语义计算
4. **多平台支持** - 统一管理不同平台数据
5. **行为日志** - 完整记录用户行为

## 数据层级

数据库分为四个层级：

```
Content Layer (内容层)
  ├─ Creator (创作者)
  ├─ Video (视频)
  └─ Collection (收藏)

Behavior Layer (行为层)
  ├─ WatchEvent (观看事件)
  ├─ InteractionEvent (互动事件)
  └─ SearchEvent (搜索事件)

Semantic Layer (语义层)
  ├─ Tag (标签)
  ├─ TagAlias (标签映射)
  └─ Category (分区)

Notes Layer (笔记层)
  └─ VideoNote (视频笔记)

Analytics Layer (分析层)
  ├─ InterestScore (兴趣权重)
  ├─ InterestNode (兴趣节点)
  ├─ CreatorRank (创作者排名)
  └─ WatchTimeStats (观看时间统计)
```

## 目录结构

```
src/database/
├── types/                    # 类型定义
│   ├── index.ts             # 核心类型
│   ├── content-layer.ts     # 内容层类型
│   ├── behavior-layer.ts    # 行为层类型
│   ├── semantic-layer.ts    # 语义层类型
│   ├── notes-layer.ts       # 笔记层类型
│   └── analytics-layer.ts   # 分析层类型
├── interfaces/              # 接口定义
│   ├── index.ts             # 统一接口
│   ├── content-manager.ts   # 内容管理接口
│   ├── behavior-manager.ts  # 行为管理接口
│   ├── semantic-manager.ts  # 语义管理接口
│   ├── notes-manager.ts     # 笔记管理接口
│   ├── analytics-manager.ts # 分析管理接口
│   ├── search-manager.ts    # 搜索管理接口
│   ├── recommendation-manager.ts # 推荐管理接口
│   └── storage-manager.ts   # 存储管理接口
└── README.md                # 本文档
```

## 核心接口说明

### 1. 内容管理接口 (IContentManager)

负责管理创作者、视频和收藏夹的基础信息。

主要功能：
- 创作者管理：创建、查询、更新创作者信息
- 视频管理：创建、查询、更新视频信息
- 收藏管理：创建、查询、更新收藏夹

### 2. 行为管理接口 (IBehaviorManager)

负责记录和管理用户的所有行为数据。

主要功能：
- 观看行为：记录观看事件、统计观看数据
- 互动行为：记录点赞、评论、收藏、分享
- 搜索行为：记录搜索历史、分析搜索模式

### 3. 语义管理接口 (ISemanticManager)

负责管理标签和语义相关数据。

主要功能：
- 标签管理：创建、查询、更新标签
- 标签映射：管理标签别名和映射关系
- 分区管理：管理标签分区

### 4. 笔记管理接口 (INotesManager)

负责管理视频笔记和AI总结。

主要功能：
- 笔记管理：创建、查询、更新笔记
- 语义搜索：基于向量搜索笔记
- 笔记统计：统计笔记数据

### 5. 分析管理接口 (IAnalyticsManager)

负责管理分析结果数据。

主要功能：
- 兴趣权重：管理用户兴趣权重
- 兴趣星球：管理兴趣节点和树结构
- 创作者排名：管理UP主排名
- 观看时间统计：分析观看时间分布

### 6. 搜索管理接口 (ISearchManager)

负责实现各种搜索功能。

主要功能：
- 视频搜索：关键词、标签、UP主、兴趣搜索
- 收藏搜索：搜索收藏夹和收藏视频
- LLM搜索：自然语言查询

### 7. 推荐管理接口 (IRecommendationManager)

负责实现推荐系统。

主要功能：
- 推荐候选：获取推荐候选视频
- 推荐评分：计算视频推荐分数
- 推荐列表：生成和管理推荐列表

### 8. 存储管理接口 (IStorageManager)

负责数据库的初始化和基础操作。

主要功能：
- 数据库初始化：创建和升级数据库
- 浏览器存储：管理用户UID和API配置

## 使用示例

```typescript
import { IDatabase } from './interfaces';

// 初始化数据库
const db: IDatabase = new DatabaseImpl();
await db.initialize({
  name: 'bilibili_discovery',
  version: 1,
  stores: [...]
});

// 记录观看事件
await db.recordWatchEvent({
  platform: 'bilibili',
  video_id: 'BV123456',
  creator_id: 'up123',
  watch_time: Date.now(),
  watch_duration: 300,
  video_duration: 600,
  progress: 0.5,
  source: 'recommend'
});

// 查询视频
const result = await db.queryVideos({
  platform: 'bilibili',
  tag_ids: ['tag1', 'tag2']
}, { page: 1, page_size: 20 });

// 获取推荐
const recommendations = await db.generateRecommendations({
  limit: 10,
  source: 'mixed'
});
```

## 设计原则

1. **行为数据独立** - 行为数据单独存储，便于分析
2. **分析数据可重建** - 分析结果可以重新计算
3. **语义数据独立** - 语义数据单独管理，支持AI计算
4. **平台数据隔离** - 不同平台数据统一管理但隔离存储
5. **避免重复数据** - 合理设计数据关系，减少冗余

## 扩展性

本设计支持以下扩展：

1. **新平台支持** - 通过platform字段轻松添加新平台
2. **新行为类型** - 通过扩展InteractionType添加新行为
3. **新笔记类型** - 通过扩展NoteType添加新笔记类型
4. **新分析维度** - 通过扩展分析层添加新分析维度
5. **新推荐策略** - 通过扩展推荐接口添加新推荐策略

## 性能考虑

1. **索引设计** - 为常用查询字段创建索引
2. **分页支持** - 所有列表查询支持分页
3. **批量操作** - 支持批量获取和更新
4. **缓存策略** - 热点数据可缓存到内存
5. **异步操作** - 所有操作都是异步的，不阻塞UI

## 安全性

1. **敏感数据** - 用户UID和API配置存储在浏览器存储中
2. **数据隔离** - 不同平台数据隔离存储
3. **权限控制** - 通过接口控制数据访问权限
4. **数据验证** - 所有输入数据进行验证

## 未来优化方向

1. **数据压缩** - 对大量文本数据进行压缩存储
2. **增量同步** - 支持增量数据同步
3. **离线支持** - 支持离线数据访问
4. **数据导出** - 支持数据导出和导入
5. **性能监控** - 添加性能监控和优化建议
