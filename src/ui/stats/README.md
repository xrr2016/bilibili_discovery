# `src/ui/stats`

本目录实现标签统计与 UP 分类管理页面。

主要职责：
- 展示 UP 列表、标签列表、分类列表
- 支持手动给 UP 打标签
- 支持创建大分区并拖拽管理标签
- 提供标签/分类组合筛选

设计边界：
- 页面状态放在本目录
- 数据来源统一走 `database/implementations`
- 不在页面层重复定义数据库实体结构

主要文件：
- `stats.ts`：页面初始化与数据加载
- `up-list.ts`：UP 列表渲染
- `tag-manager.ts`：标签增删与渲染
- `category-manager.ts`：分类管理
- `filter-manager.ts`：筛选区拖拽与筛选状态
- `drag.ts`：拖拽上下文
- `types.ts`：页面本地状态类型
