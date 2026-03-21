# `src/database/interfaces`

本目录定义数据库访问接口规范。

主要职责：
- 为各领域仓储定义统一方法签名
- 约束实现层能力边界
- 让上层能够基于接口理解数据访问职责

设计边界：
- 这里只定义接口，不放实现
- 类型依赖来自 `database/types`

子目录说明：
- `analytics`：分析相关接口
- `behavior`：行为事件接口
- `collection`：收藏相关接口
- `creator`：创作者接口
- `note`：笔记相关接口
- `semantic`：标签与分类接口
- `video`：视频接口
