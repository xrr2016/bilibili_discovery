# `src/database/implementations`

本目录提供数据库访问实现，是业务代码与 IndexedDB 之间的主要桥梁。

主要职责：
- 实现各个 repository 接口
- 提供统一的数据访问入口
- 封装兼容项目现有业务所需的组合查询、聚合读写和缓存

设计边界：
- 数据结构定义来自 `database/types`
- 这里负责“怎么读写数据库”
- 不负责 UI 渲染和业务页面状态管理

主要内容：
- `*.repository.impl.ts`：各领域仓储实现
- `bilibili-data-access.impl.ts`：项目当前业务使用的数据访问聚合入口
- `index.ts`：统一导出
