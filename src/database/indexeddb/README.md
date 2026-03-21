# `src/database/indexeddb`

本目录封装 IndexedDB 基础设施。

主要职责：
- 定义数据库名称、版本、对象存储和索引
- 提供数据库初始化与升级逻辑
- 提供统一的底层 CRUD 工具方法

设计边界：
- 这里只处理底层存储细节
- 具体业务查询不要直接散落到业务层，应经由 `implementations`

主要文件：
- `config.ts`：对象存储与索引配置
- `db-manager.ts`：数据库初始化与升级
- `db-utils.ts`：底层读写工具
- `USAGE.md`：使用说明
